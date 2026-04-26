import type { NextRequest } from "next/server"
import type { AnalyticsDatePreset, AnalyticsDateWindow } from "@/types"
import { ValidationError } from "@/lib/api/errors"
import { analyticsRangeQuerySchema, analyticsWindowQuerySchema } from "@/lib/validations"
import {
  countCasablancaDaysInclusive,
  endExclusiveOfCasablancaDayUtc,
  getCasablancaDateKey,
  offsetCasablancaDateKey,
  previousCasablancaDateKey,
  startOfCasablancaDayUtc,
} from "@/lib/utils/morocco-time"

function formatRangeLabelFr(startDateKey: string, endDateKeyInclusive: string): string {
  const d1 = startOfCasablancaDayUtc(startDateKey)
  const d2 = startOfCasablancaDayUtc(endDateKeyInclusive)
  const fmt = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Africa/Casablanca",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
  return `${fmt.format(d1)} – ${fmt.format(d2)}`
}

export function resolveAnalyticsDateWindow(params: {
  preset: AnalyticsDatePreset
  from?: string
  to?: string
  now?: Date
}): AnalyticsDateWindow {
  const now = params.now ?? new Date()
  const todayKey = getCasablancaDateKey(now)

  let start_date_key = todayKey
  let end_date_key_inclusive = todayKey

  if (params.preset === "today") {
    start_date_key = todayKey
    end_date_key_inclusive = todayKey
  } else if (params.preset === "yesterday") {
    const y = previousCasablancaDateKey(todayKey)
    start_date_key = y
    end_date_key_inclusive = y
  } else if (params.preset === "7d" || params.preset === "30d") {
    const n = params.preset === "7d" ? 7 : 30
    start_date_key = offsetCasablancaDateKey(todayKey, -(n - 1))
    end_date_key_inclusive = todayKey
  } else {
    if (!params.from || !params.to) {
      throw new ValidationError("Période personnalisée invalide.", {
        preset: "Les dates début/fin sont requises.",
      })
    }
    start_date_key = params.from
    end_date_key_inclusive = params.to
  }

  const day_count = countCasablancaDaysInclusive(start_date_key, end_date_key_inclusive)
  if (day_count > 60) {
    throw new ValidationError("La période personnalisée est trop longue.", {
      to: "Maximum 60 jours.",
    })
  }

  return {
    preset: params.preset,
    start_date_key,
    end_date_key_inclusive,
    from_inclusive_iso: startOfCasablancaDayUtc(start_date_key).toISOString(),
    to_exclusive_iso: endExclusiveOfCasablancaDayUtc(end_date_key_inclusive).toISOString(),
    day_count,
    label_fr: formatRangeLabelFr(start_date_key, end_date_key_inclusive),
  }
}

export function parseAnalyticsRangeQuery(req: NextRequest): {
  store_id: string
  from: string
  to: string
} {
  const raw = Object.fromEntries(req.nextUrl.searchParams.entries())
  const parsed = analyticsRangeQuerySchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.errors[0]
    throw new ValidationError(
      first?.message ?? "Paramètres invalides.",
      Object.fromEntries(parsed.error.errors.map((e) => [e.path.join("."), e.message]))
    )
  }

  const from =
    parsed.data.from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const to = parsed.data.to ?? new Date().toISOString()

  return { store_id: parsed.data.store_id, from, to }
}

export function parseAnalyticsWindowQuery(req: NextRequest): {
  store_id: string
  window: AnalyticsDateWindow
} {
  const raw = Object.fromEntries(req.nextUrl.searchParams.entries())
  const parsed = analyticsWindowQuerySchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.errors[0]
    throw new ValidationError(
      first?.message ?? "Paramètres invalides.",
      Object.fromEntries(parsed.error.errors.map((e) => [e.path.join("."), e.message]))
    )
  }
  const window = resolveAnalyticsDateWindow({
    preset: parsed.data.preset,
    from: parsed.data.from,
    to: parsed.data.to,
  })
  return { store_id: parsed.data.store_id, window }
}

export function orderCountsAsRevenue(status: string): boolean {
  return status !== "cancelled" && status !== "returned"
}

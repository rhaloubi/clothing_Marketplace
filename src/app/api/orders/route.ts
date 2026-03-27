import { type NextRequest } from "next/server"
import { withAuth, withRateLimit, ok, fail, ValidationError } from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import { assertStoreOwnership } from "@/lib/utils"
import { listOrdersQuerySchema } from "@/lib/validations"

export const GET = withAuth(
  withRateLimit("api", { keyBy: "user" })(async (req: NextRequest, { auth }) => {
    const raw = Object.fromEntries(req.nextUrl.searchParams.entries())
    const parsed = listOrdersQuerySchema.safeParse(raw)
    if (!parsed.success) {
      return fail(
        new ValidationError(
          parsed.error.errors[0]?.message ?? "Invalide",
          Object.fromEntries(parsed.error.errors.map((e) => [e.path.join("."), e.message]))
        )
      )
    }

    const supabase = await createClient()
    await assertStoreOwnership(supabase, parsed.data.store_id, auth.user.id)

    let q = supabase
      .from("orders")
      .select("*, wilayas(*), order_items(*)", { count: "exact" })
      .eq("store_id", parsed.data.store_id)
      .order("created_at", { ascending: false })
      .range(parsed.data.offset, parsed.data.offset + parsed.data.limit - 1)

    if (parsed.data.status) {
      q = q.eq("status", parsed.data.status)
    }

    const { data, error, count } = await q

    if (error) return fail(error)
    return ok({
      orders: data ?? [],
      meta: { total: count ?? 0, limit: parsed.data.limit, offset: parsed.data.offset },
    })
  })
)

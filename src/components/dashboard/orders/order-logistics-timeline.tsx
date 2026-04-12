import { cn, normalizeOrderStatus } from "@/lib/utils"

function formatTimelinePoint(iso: string): string {
  const d = new Date(iso)
  const datePart = d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  })
  const timePart = d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })
  return `${datePart.replace(/\.$/, "")} · ${timePart}`
}

type Step = {
  title: string
  timeLabel: string
  sub?: string
  done: boolean
}

function buildSteps(order: {
  status: string
  created_at: string
  confirmed_at: string | null
  shipped_at: string | null
  delivered_at: string | null
  returned_at: string | null
  cancelled_at: string | null
}): Step[] {
  const status = normalizeOrderStatus(order.status)
  const eff = status ?? "pending"

  if (status === "cancelled") {
    return [
      {
        title: "Commande enregistrée",
        timeLabel: formatTimelinePoint(order.created_at),
        done: true,
      },
      {
        title: "Annulée",
        timeLabel: order.cancelled_at
          ? formatTimelinePoint(order.cancelled_at)
          : "—",
        done: true,
      },
    ]
  }

  if (status === "returned") {
    return [
      {
        title: "Commande enregistrée",
        timeLabel: formatTimelinePoint(order.created_at),
        done: true,
      },
      {
        title: "Commande confirmée",
        timeLabel: order.confirmed_at
          ? formatTimelinePoint(order.confirmed_at)
          : "—",
        done: true,
      },
      {
        title: "Expédiée",
        timeLabel: order.shipped_at
          ? formatTimelinePoint(order.shipped_at)
          : "—",
        done: true,
      },
      {
        title: "Retournée",
        timeLabel: order.returned_at
          ? formatTimelinePoint(order.returned_at)
          : "—",
        done: true,
      },
    ]
  }

  const confirmedDone =
    eff !== "pending" &&
    (eff === "confirmed" ||
      eff === "shipped" ||
      eff === "delivered" ||
      !!order.confirmed_at)
  const shippedDone =
    eff === "shipped" || eff === "delivered" || !!order.shipped_at
  const deliveredDone = eff === "delivered" || !!order.delivered_at

  return [
    {
      title: "Commande enregistrée",
      timeLabel: formatTimelinePoint(order.created_at),
      done: true,
    },
    {
      title: "Commande confirmée",
      timeLabel: order.confirmed_at
        ? formatTimelinePoint(order.confirmed_at)
        : confirmedDone
          ? "—"
          : "",
      sub: !confirmedDone ? "En attente de confirmation" : undefined,
      done: confirmedDone,
    },
    {
      title: "Expédiée",
      timeLabel: order.shipped_at
        ? formatTimelinePoint(order.shipped_at)
        : shippedDone
          ? "—"
          : "",
      sub:
        confirmedDone && !shippedDone
          ? "Prévu prochainement"
          : undefined,
      done: shippedDone,
    },
    {
      title: "Livrée",
      timeLabel: order.delivered_at
        ? formatTimelinePoint(order.delivered_at)
        : deliveredDone
          ? "—"
          : "",
      sub:
        shippedDone && !deliveredDone ? "En cours de livraison" : undefined,
      done: deliveredDone,
    },
  ]
}

interface OrderLogisticsTimelineProps {
  order: {
    status: string
    created_at: string
    confirmed_at: string | null
    shipped_at: string | null
    delivered_at: string | null
    returned_at: string | null
    cancelled_at: string | null
  }
}

export function OrderLogisticsTimeline({ order }: OrderLogisticsTimelineProps) {
  const steps = buildSteps(order)

  return (
    <section className="rounded-md border border-stripe-border bg-white p-5 shadow-stripe-card">
      <p className="text-xs font-medium uppercase tracking-wide text-stripe-body">
        Suivi logistique
      </p>
      <ul className="mt-4">
        {steps.map((step, i) => (
          <li key={`${step.title}-${i}`} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "mt-1.5 size-2.5 shrink-0 rounded-full",
                  step.done ? "bg-stripe-purple" : "bg-stripe-border"
                )}
              />
              {i < steps.length - 1 ? (
                <span
                  className={cn(
                    "my-1 min-h-8 w-px flex-1",
                    step.done ? "bg-stripe-purple/60" : "bg-stripe-border"
                  )}
                />
              ) : null}
            </div>
            <div className={cn("min-w-0 flex-1", i < steps.length - 1 && "pb-5")}>
              <p className="text-sm font-medium text-stripe-heading">
                {step.title}
              </p>
              {step.timeLabel ? (
                <p className="text-sm text-stripe-body">{step.timeLabel}</p>
              ) : null}
              {step.sub ? (
                <p className="text-xs text-stripe-body/90">{step.sub}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

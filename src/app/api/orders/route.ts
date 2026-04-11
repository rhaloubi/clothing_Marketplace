import { type NextRequest } from "next/server"
import { withUserAuth, withRateLimit, ok, fail, ValidationError } from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import { assertStoreOwnership } from "@/lib/utils"
import { fetchOrdersList } from "@/lib/server/orders-list"
import { listOrdersQuerySchema, listOrdersSearchText } from "@/lib/validations"

export const GET = withUserAuth(
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

    const { orders, total, error } = await fetchOrdersList(supabase, {
      storeId: parsed.data.store_id,
      status: parsed.data.status,
      searchText: listOrdersSearchText(parsed.data),
      from: parsed.data.from,
      to: parsed.data.to,
      offset: parsed.data.offset,
      limit: parsed.data.limit,
    })

    if (error) return fail(error)

    return ok({
      orders,
      meta: {
        total,
        limit: parsed.data.limit,
        offset: parsed.data.offset,
      },
    })
  })
)

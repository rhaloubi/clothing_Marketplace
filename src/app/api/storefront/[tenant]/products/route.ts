import { type NextRequest } from "next/server"
import { withRateLimit, ok, fail, NotFoundError } from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import { fetchActiveStoreBySlug, listStorefrontProducts } from "@/lib/server/storefront"

export const GET = withRateLimit("public")(
  async (req: NextRequest, ctx: { params: Promise<{ tenant: string }> }) => {
    const { tenant } = await ctx.params
    const limit = Math.min(
      100,
      Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 24)
    )
    const offset = Math.max(0, Number(req.nextUrl.searchParams.get("offset")) || 0)

    const supabase = await createClient()
    const store = await fetchActiveStoreBySlug(supabase, tenant)
    if (!store) return fail(new NotFoundError("Boutique"))

    try {
      const { products, total } = await listStorefrontProducts(supabase, store.id, limit, offset)
      return ok({
        store: { id: store.id, slug: store.slug, name: store.name },
        products,
        meta: { total, limit, offset },
      })
    } catch (e) {
      return fail(e)
    }
  }
)

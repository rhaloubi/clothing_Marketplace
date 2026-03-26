import { type NextRequest } from "next/server"
import { withRateLimit, ok, fail, NotFoundError } from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import {
  fetchActiveStoreBySlug,
  fetchStorefrontProductBySlug,
} from "@/lib/server/storefront"

export const GET = withRateLimit("api")(
  async (_req: NextRequest, ctx: Record<string, unknown>) => {
    const { tenant, slug } = await (ctx.params as Promise<{ tenant: string; slug: string }>)

    const supabase = await createClient()
    const store = await fetchActiveStoreBySlug(supabase, tenant)
    if (!store) return fail(new NotFoundError("Boutique"))

    try {
      const product = await fetchStorefrontProductBySlug(supabase, store.id, slug)
      if (!product) return fail(new NotFoundError("Produit"))
      return ok({ store: { id: store.id, slug: store.slug, name: store.name }, product })
    } catch (e) {
      return fail(e)
    }
  }
)

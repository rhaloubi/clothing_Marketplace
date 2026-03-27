import { type NextRequest } from "next/server"
import {
  withAuth,
  withRateLimit,
  withPlan,
  assertProductLimit,
  ok,
  fail,
  ValidationError,
  ConflictError,
} from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import {
  createProductWithStoreSchema,
  listProductsQuerySchema,
} from "@/lib/validations"
import { assertStoreOwnership, generateSlug } from "@/lib/utils"
import type { Database } from "@/types/database.types"

type ProductInsert = Database["public"]["Tables"]["products"]["Insert"]

export const GET = withAuth(
  withRateLimit("api", { keyBy: "user" })(async (req, { auth }) => {
    const qs = Object.fromEntries(req.nextUrl.searchParams.entries())
    const parsed = listProductsQuerySchema.safeParse(qs)
    if (!parsed.success) {
      return fail(
        new ValidationError(
          parsed.error.errors[0]?.message ?? "Invalide",
          Object.fromEntries(parsed.error.errors.map((e) => [e.path.join("."), e.message]))
        )
      )
    }

    const { store_id, limit, offset } = parsed.data
    const supabase = await createClient()

    try {
      await assertStoreOwnership(supabase, store_id, auth.user.id)
    } catch (err) {
      return fail(err)
    }

    const { count, error: cErr } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("store_id", store_id)

    if (cErr) return fail(cErr)

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("store_id", store_id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) return fail(error)

    return ok({
      products: data ?? [],
      meta: { total: count ?? 0, limit, offset },
    })
  })
)

export const POST = withAuth(
  withPlan()(
    withRateLimit("write", { keyBy: "user" })(async (req: NextRequest, { auth }) => {
      const body = (await req.json()) as unknown
      const parsed = createProductWithStoreSchema.safeParse(body)
      if (!parsed.success) {
        return fail(
          new ValidationError(
            parsed.error.errors[0]?.message ?? "Invalide",
            Object.fromEntries(parsed.error.errors.map((e) => [e.path.join("."), e.message]))
          )
        )
      }

      const { store_id, slug: inputSlug, ...productRest } = parsed.data
      const supabase = await createClient()

      try {
        await assertStoreOwnership(supabase, store_id, auth.user.id)
      } catch (err) {
        return fail(err)
      }

      try {
        await assertProductLimit(store_id, auth.plan)
      } catch (err) {
        return fail(err)
      }

      const slug = inputSlug?.trim() ? generateSlug(inputSlug.trim()) : generateSlug(parsed.data.name)

      const row: ProductInsert = {
        store_id,
        name: productRest.name,
        description: productRest.description ?? null,
        category: productRest.category ?? null,
        base_price: productRest.base_price,
        compare_price: productRest.compare_price ?? null,
        images: productRest.images,
        is_active: productRest.is_active,
        is_featured: productRest.is_featured,
        slug,
        meta_title: productRest.meta_title ?? null,
        meta_description: productRest.meta_description ?? null,
      }

      const { data, error } = await supabase.from("products").insert(row).select().single()

      if (error) {
        if (error.code === "23505") {
          return fail(new ConflictError("Ce slug est déjà utilisé pour un produit dans cette boutique."))
        }
        return fail(error)
      }

      return ok(data, 201)
    })
  )
)

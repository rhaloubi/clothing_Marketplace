import { type NextRequest } from "next/server"
import {
  withUserAuth,
  withRateLimit,
  ok,
  fail,
  ValidationError,
  ConflictError,
} from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import { createCategorySchema, listCategoriesQuerySchema } from "@/lib/validations"
import { assertStoreOwnership, generateSlug } from "@/lib/utils"
import type { Database } from "@/types/database.types"

type CategoryInsert = Database["public"]["Tables"]["categories"]["Insert"]

/**
 * GET /api/categories?store_id=…
 * Returns all categories for a store ordered by sort_order then name,
 * with a product_count field.
 */
export const GET = withUserAuth(
  withRateLimit("api", { keyBy: "user" })(async (req, { auth }) => {
    const qs = Object.fromEntries(req.nextUrl.searchParams.entries())
    const parsed = listCategoriesQuerySchema.safeParse(qs)
    if (!parsed.success) {
      return fail(
        new ValidationError(
          parsed.error.errors[0]?.message ?? "Invalide",
          Object.fromEntries(parsed.error.errors.map((e) => [e.path.join("."), e.message]))
        )
      )
    }

    const { store_id } = parsed.data
    const supabase = await createClient()

    try {
      await assertStoreOwnership(supabase, store_id, auth.user.id)
    } catch (err) {
      return fail(err)
    }

    const { data: cats, error: cErr } = await supabase
      .from("categories")
      .select("*")
      .eq("store_id", store_id)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })

    if (cErr) return fail(cErr)
    const rows = cats ?? []
    if (rows.length === 0) return ok([])

    const ids = rows.map((c) => c.id)
    const { data: products, error: pErr } = await supabase
      .from("products")
      .select("category_id")
      .eq("store_id", store_id)
      .in("category_id", ids)

    if (pErr) return fail(pErr)
    const countMap = new Map<string, number>()
    for (const p of products ?? []) {
      if (!p.category_id) continue
      countMap.set(p.category_id, (countMap.get(p.category_id) ?? 0) + 1)
    }

    return ok(rows.map((c) => ({ ...c, product_count: countMap.get(c.id) ?? 0 })))
  })
)

/**
 * POST /api/categories
 * Create a new category for a store.
 */
export const POST = withUserAuth(
  withRateLimit("write", { keyBy: "user" })(async (req: NextRequest, { auth }) => {
    const body = (await req.json()) as unknown
    const parsed = createCategorySchema.safeParse(body)
    if (!parsed.success) {
      return fail(
        new ValidationError(
          parsed.error.errors[0]?.message ?? "Invalide",
          Object.fromEntries(parsed.error.errors.map((e) => [e.path.join("."), e.message]))
        )
      )
    }

    const { store_id, name, sort_order } = parsed.data
    const supabase = await createClient()

    try {
      await assertStoreOwnership(supabase, store_id, auth.user.id)
    } catch (err) {
      return fail(err)
    }

    const slug = generateSlug(name)
    const row: CategoryInsert = { store_id, name: name.trim(), slug, sort_order }

    const { data, error } = await supabase.from("categories").insert(row).select().single()
    if (error) {
      if (error.code === "23505") {
        return fail(new ConflictError("Une catégorie avec ce nom existe déjà dans cette boutique."))
      }
      return fail(error)
    }

    return ok({ ...data, product_count: 0 }, 201)
  })
)

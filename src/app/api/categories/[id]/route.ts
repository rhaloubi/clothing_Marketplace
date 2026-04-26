import { type NextRequest } from "next/server"
import {
  withUserAuth,
  withRateLimit,
  ok,
  fail,
  noContent,
  BadRequestError,
  ValidationError,
  NotFoundError,
  ConflictError,
} from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import { updateCategorySchema } from "@/lib/validations"
import { generateSlug } from "@/lib/utils"
import type { Database } from "@/types/database.types"

type CategoryUpdate = Database["public"]["Tables"]["categories"]["Update"]

/**
 * GET /api/categories/[id]
 */
export const GET = withUserAuth(
  withRateLimit("api", { keyBy: "user" })(async (_req, { auth, params }) => {
    const id = params.id
    if (!id) return fail(new BadRequestError("Identifiant catégorie requis."))
    const supabase = await createClient()

    const { data: cat, error } = await supabase
      .from("categories")
      .select("*, stores!inner(user_id)")
      .eq("id", id)
      .eq("stores.user_id", auth.user.id)
      .single()

    if (error ?? !cat) return fail(new NotFoundError("Catégorie"))

    const { data: products, error: pErr } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("category_id", id)

    if (pErr) return fail(pErr)

    return ok({ ...cat, product_count: products === null ? 0 : (products as unknown as { count: number }).count ?? 0 })
  })
)

/**
 * PATCH /api/categories/[id]
 * Rename or reorder a category.
 */
export const PATCH = withUserAuth(
  withRateLimit("write", { keyBy: "user" })(async (req: NextRequest, { auth, params }) => {
    const id = params.id
    if (!id) return fail(new BadRequestError("Identifiant catégorie requis."))
    const body = (await req.json()) as unknown
    const parsed = updateCategorySchema.safeParse(body)
    if (!parsed.success) {
      return fail(
        new ValidationError(
          parsed.error.errors[0]?.message ?? "Invalide",
          Object.fromEntries(parsed.error.errors.map((e) => [e.path.join("."), e.message]))
        )
      )
    }

    const supabase = await createClient()

    const { data: existing, error: exErr } = await supabase
      .from("categories")
      .select("*, stores!inner(user_id)")
      .eq("id", id)
      .eq("stores.user_id", auth.user.id)
      .single()

    if (exErr ?? !existing) return fail(new NotFoundError("Catégorie"))

    const updateRow: CategoryUpdate = {}
    if (parsed.data.name !== undefined) {
      updateRow.name = parsed.data.name.trim()
      updateRow.slug = generateSlug(parsed.data.name)
    }
    if (parsed.data.sort_order !== undefined) {
      updateRow.sort_order = parsed.data.sort_order
    }

    const { data, error } = await supabase
      .from("categories")
      .update(updateRow)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        return fail(new ConflictError("Une catégorie avec ce nom existe déjà dans cette boutique."))
      }
      return fail(error)
    }

    return ok(data)
  })
)

/**
 * DELETE /api/categories/[id]
 * Deletes the category. Products with this category get category_id = NULL (ON DELETE SET NULL).
 */
export const DELETE = withUserAuth(
  withRateLimit("write", { keyBy: "user" })(async (_req, { auth, params }) => {
    const id = params.id
    if (!id) return fail(new BadRequestError("Identifiant catégorie requis."))
    const supabase = await createClient()

    const { data: cat, error: cErr } = await supabase
      .from("categories")
      .select("id, stores!inner(user_id)")
      .eq("id", id)
      .eq("stores.user_id", auth.user.id)
      .single()

    if (cErr ?? !cat) return fail(new NotFoundError("Catégorie"))

    const { error: dErr } = await supabase.from("categories").delete().eq("id", id)
    if (dErr) return fail(dErr)

    return noContent()
  })
)

import { z } from "zod"

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const signupSchema = z.object({
  full_name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Adresse email invalide"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .regex(/[A-Z]/, "Le mot de passe doit contenir une majuscule")
    .regex(/[0-9]/, "Le mot de passe doit contenir un chiffre"),
})

export const loginSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
})

export type SignupInput = z.infer<typeof signupSchema>
export type LoginInput = z.infer<typeof loginSchema>

// ─── Store ────────────────────────────────────────────────────────────────────

export const createStoreSchema = z.object({
  name: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(60, "Le nom ne doit pas dépasser 60 caractères"),
  slug: z
    .string()
    .min(3, "Le slug doit contenir au moins 3 caractères")
    .max(50, "Le slug ne doit pas dépasser 50 caractères")
    .regex(/^[a-z0-9-]+$/, "Le slug ne peut contenir que des lettres minuscules, chiffres et tirets"),
  description: z.string().max(500).optional(),
  whatsapp_number: z
    .string()
    .regex(/^\+?[0-9]{9,15}$/, "Numéro WhatsApp invalide")
    .optional()
    .or(z.literal("")),
})

/** PATCH /api/stores/[id] — all fields optional */
export const updateStoreSchema = z
  .object({
    name: z.string().min(2).max(60).optional(),
    slug: createStoreSchema.shape.slug.optional(),
    description: z.string().max(500).optional().nullable(),
    whatsapp_number: z
      .union([
        z.undefined(),
        z.null(),
        z.literal("").transform(() => null),
        z
          .string()
          .transform((s) => s.replace(/\s/g, ""))
          .pipe(
            z
              .string()
              .regex(
                /^(\+212|0)[5-7][0-9]{8}$/,
                "Numéro WhatsApp marocain invalide (ex. +212612345678)"
              )
              .transform((t) => (t.startsWith("0") ? `+212${t.slice(1)}` : t))
          ),
      ])
      .optional(),
    theme: z.enum(["minimal", "bold", "elegant"]).optional(),
    theme_config: z.record(z.unknown()).optional(),
    custom_domain: z.string().optional().nullable(),
    meta_title: z.string().max(60).optional().nullable(),
    meta_description: z.string().max(160).optional().nullable(),
    is_active: z.boolean().optional(),
    logo_url: z.string().url().optional().nullable(),
    banner_url: z.string().url().optional().nullable(),
  })
  .partial()

export type CreateStoreInput = z.infer<typeof createStoreSchema>
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>

/** Formulaire Paramètres boutique — partie nationale (9 chiffres) après +212. */
export const storeSettingsFormSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(60),
  slug: createStoreSchema.shape.slug,
  whatsapp_national: z.string().refine(
    (s) => {
      const t = s.replace(/\s/g, "")
      return t === "" || /^[5-7][0-9]{8}$/.test(t)
    },
    { message: "9 chiffres requis (ex. 612345678), sans 0 ni +212" }
  ),
})

export type StoreSettingsFormInput = z.infer<typeof storeSettingsFormSchema>

// ─── Product ──────────────────────────────────────────────────────────────────

const productFieldsSchema = z.object({
  name: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(200, "Le nom ne doit pas dépasser 200 caractères"),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  base_price: z
    .number()
    .int("Le prix doit être un nombre entier en MAD")
    .min(1, "Le prix doit être supérieur à 0")
    .max(100000, "Prix trop élevé"),
  compare_price: z
    .number()
    .int()
    .min(1)
    .optional()
    .nullable(),
  images: z.array(z.string().url()).max(10),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  slug: z.string().optional(), // auto-generated if not provided
  meta_title: z.string().max(60).optional().nullable(),
  meta_description: z.string().max(160).optional().nullable(),
})

export const createProductSchema = productFieldsSchema
  .refine(
    (data) => !data.compare_price || data.compare_price > data.base_price,
    { message: "Le prix barré doit être supérieur au prix de vente", path: ["compare_price"] }
  )
  .refine(
    (data) => !data.is_active || data.images.length >= 1,
    {
      message: "Ajoutez au moins une photo pour publier le produit.",
      path: ["images"],
    }
  )

export type CreateProductInput = z.infer<typeof createProductSchema>

export const createProductWithStoreSchema = productFieldsSchema
  .extend({ store_id: z.string().uuid("Boutique invalide") })
  .refine(
    (data) => !data.compare_price || data.compare_price > data.base_price,
    { message: "Le prix barré doit être supérieur au prix de vente", path: ["compare_price"] }
  )
  .refine(
    (data) => !data.is_active || data.images.length >= 1,
    {
      message: "Ajoutez au moins une photo pour publier le produit.",
      path: ["images"],
    }
  )

export type CreateProductWithStoreInput = z.infer<typeof createProductWithStoreSchema>

export const updateProductSchema = productFieldsSchema
  .omit({ slug: true })
  .partial()
  .extend({
    slug: z
      .string()
      .min(3)
      .max(80)
      .regex(/^[a-z0-9-]+$/, "Le slug ne peut contenir que des lettres minuscules, chiffres et tirets")
      .optional(),
  })
  .refine(
    (data) =>
      data.base_price === undefined ||
      data.compare_price === undefined ||
      data.compare_price === null ||
      !data.base_price ||
      data.compare_price > data.base_price,
    { message: "Le prix barré doit être supérieur au prix de vente", path: ["compare_price"] }
  )

export type UpdateProductInput = z.infer<typeof updateProductSchema>

export const listProductsQuerySchema = z.object({
  store_id: z.string().uuid("Boutique requise"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>

// ─── Product Variant ──────────────────────────────────────────────────────────

export const productVariantSchema = z.object({
  sku: z.string().max(100).optional().nullable(),
  price_override: z.number().int().min(1).optional().nullable(),
  stock_quantity: z
    .number()
    .int()
    .min(0, "Le stock ne peut pas être négatif")
    .default(0),
  images: z.array(z.string().url()).max(5).default([]),
  is_active: z.boolean().optional().default(true),
  // The attribute values that define this variant
  attribute_value_ids: z
    .array(z.string().uuid())
    .min(1, "Chaque variante doit avoir au moins un attribut"),
})

export type ProductVariantInput = z.infer<typeof productVariantSchema>

export const updateProductVariantSchema = productVariantSchema.partial().refine(
  (data) =>
    data.attribute_value_ids === undefined || data.attribute_value_ids.length >= 1,
  { message: "Chaque variante doit avoir au moins un attribut", path: ["attribute_value_ids"] }
)

export type UpdateProductVariantInput = z.infer<typeof updateProductVariantSchema>

// ─── Order (guest checkout) ───────────────────────────────────────────────────

export const checkoutSchema = z.object({
  customer_name: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100),
  customer_phone: z
    .string()
    .regex(/^(\+212|0)[5-7][0-9]{8}$/, "Numéro de téléphone marocain invalide")
    .transform((val) => val.replace(/^0/, "+212")), // normalize to +212
  customer_address: z
    .string()
    .min(10, "L'adresse doit être plus détaillée")
    .max(300),
  customer_city: z
    .string()
    .min(2, "Ville requise")
    .max(100),
  wilaya_id: z
    .number()
    .int()
    .min(1)
    .max(12, "Région invalide"),
  customer_notes: z.string().max(500).optional(),
  // Cart items are passed separately, not validated here
})

export type CheckoutInput = z.infer<typeof checkoutSchema>

// ─── Shipping zone ────────────────────────────────────────────────────────────

const shippingZoneBase = z.object({
  wilaya_id: z.number().int().min(1).max(12),
  provider_id: z.string().uuid().optional().nullable(),
  price_mad: z.number().int().min(0, "Le prix de livraison ne peut pas être négatif"),
  free_shipping_threshold: z.number().int().min(0).optional().nullable(),
  estimated_days_min: z.number().int().min(1).default(2),
  estimated_days_max: z.number().int().min(1).default(5),
  is_active: z.boolean().default(true),
})

export const shippingZoneSchema = shippingZoneBase.refine(
  (data) => data.estimated_days_max >= data.estimated_days_min,
  { message: "Le délai max doit être ≥ au délai min", path: ["estimated_days_max"] }
)

export type ShippingZoneInput = z.infer<typeof shippingZoneSchema>

export const updateShippingZoneSchema = shippingZoneBase.partial().refine(
  (data) =>
    data.estimated_days_min === undefined ||
    data.estimated_days_max === undefined ||
    data.estimated_days_max >= data.estimated_days_min,
  { message: "Le délai max doit être ≥ au délai min", path: ["estimated_days_max"] }
)

export type UpdateShippingZoneInput = z.infer<typeof updateShippingZoneSchema>

// ─── Attribute definition ─────────────────────────────────────────────────────

export const attributeDefinitionSchema = z.object({
  name: z.string().min(1).max(50),
  display_type: z.enum(["select", "color_swatch", "text", "button"]).default("select"),
  is_required: z.boolean().default(false),
  sort_order: z.number().int().min(0).default(0),
  values: z.array(z.object({
    label: z.string().min(1).max(50),
    value: z.string().min(1).max(50),
    color_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
    sort_order: z.number().int().min(0).default(0),
  })).min(1, "Au moins une valeur est requise"),
})

export type AttributeDefinitionInput = z.infer<typeof attributeDefinitionSchema>

export const createAttributeDefinitionWithStoreSchema = attributeDefinitionSchema.extend({
  store_id: z.string().uuid("Boutique invalide"),
})

export type CreateAttributeDefinitionWithStoreInput = z.infer<
  typeof createAttributeDefinitionWithStoreSchema
>

export const updateAttributeDefinitionSchema = attributeDefinitionSchema
  .omit({ values: true })
  .partial()

export type UpdateAttributeDefinitionInput = z.infer<typeof updateAttributeDefinitionSchema>

export const listAttributesQuerySchema = z.object({
  store_id: z.string().uuid("Boutique requise"),
})

export type ListAttributesQuery = z.infer<typeof listAttributesQuerySchema>

const attributeValueFieldsSchema = z.object({
  label: z.string().min(1).max(50),
  value: z.string().min(1).max(50),
  color_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  sort_order: z.number().int().min(0).default(0),
})

/** POST /api/attributes/[id]/values — add one value to an existing definition */
export const createAttributeValueSchema = attributeValueFieldsSchema

export type CreateAttributeValueInput = z.infer<typeof createAttributeValueSchema>

/** PATCH /api/attributes/[id]/values/[valueId] */
export const updateAttributeValueSchema = attributeValueFieldsSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Au moins un champ est requis" }
)

export type UpdateAttributeValueInput = z.infer<typeof updateAttributeValueSchema>

// ─── Orders (dashboard) ───────────────────────────────────────────────────────

export const orderStatusSchema = z.enum([
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "returned",
  "cancelled",
])

const orderListDateParamSchema = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? undefined : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (AAAA-MM-JJ).").optional()
)

export const listOrdersQuerySchema = z
  .object({
    store_id: z.string().uuid("Boutique requise"),
    status: orderStatusSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100, "Maximum 100 elements").default(50),
    offset: z.coerce.number().int().min(0, "Offset invalide").default(0),
    q: z.string().max(200).optional(),
    search: z.string().max(200).optional(),
    from: orderListDateParamSchema,
    to: orderListDateParamSchema,
  })
  .refine((d) => !d.from || !d.to || d.from <= d.to, {
    message: "La date de fin doit être après ou égale au début.",
    path: ["to"],
  })

export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>

/** Merge `q` and `search` (OpenAPI alias) for list filters. */
export function listOrdersSearchText(query: ListOrdersQuery): string {
  const a = (query.q ?? "").trim()
  const b = (query.search ?? "").trim()
  return a.length > 0 ? a : b
}

export const patchOrderSchema = z
  .object({
    status: orderStatusSchema.optional(),
    tracking_number: z.string().max(100).optional().nullable(),
    shipping_provider_id: z.string().uuid().optional().nullable(),
  })
  .refine(
    (d) =>
      d.status !== undefined ||
      d.tracking_number !== undefined ||
      d.shipping_provider_id !== undefined,
    { message: "Aucun champ à mettre à jour." }
  )

export type PatchOrderInput = z.infer<typeof patchOrderSchema>

// ─── Analytics ────────────────────────────────────────────────────────────────

export const analyticsRangeQuerySchema = z.object({
  store_id: z.string().uuid("Boutique requise"),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
})

export type AnalyticsRangeQuery = z.infer<typeof analyticsRangeQuerySchema>

const analyticsEventTypeSchema = z.enum([
  "page_view",
  "product_view",
  "cart_add",
  "cart_remove",
  "checkout_start",
  "checkout_abandon",
  "order_placed",
  "order_delivered",
  "order_returned",
])

export const trackAnalyticsEventSchema = z.object({
  store_id: z.string().uuid(),
  event_type: analyticsEventTypeSchema,
  product_id: z.string().uuid().optional(),
  order_id: z.string().uuid().optional(),
  session_id: z.string().max(128).optional(),
  wilaya_id: z.number().int().min(1).max(12).optional(),
  referrer: z.string().max(2000).optional(),
  utm_source: z.string().max(100).optional(),
  utm_medium: z.string().max(100).optional(),
  utm_campaign: z.string().max(100).optional(),
  device_type: z.enum(["mobile", "tablet", "desktop"]).optional(),
})

export type TrackAnalyticsEventInput = z.infer<typeof trackAnalyticsEventSchema>

// ─── Storefront checkout ──────────────────────────────────────────────────────

export const checkoutCartItemSchema = z.object({
  variant_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
})

export const storefrontCheckoutSchema = checkoutSchema.extend({
  items: z.array(checkoutCartItemSchema).min(1, "Le panier est vide"),
})

export type StorefrontCheckoutInput = z.infer<typeof storefrontCheckoutSchema>

// ─── Upload (signed URL) ──────────────────────────────────────────────────────

export const signedUploadSchema = z.object({
  store_id: z.string().uuid("Boutique requise"),
  bucket: z.enum(["store-assets", "product-images"]),
  path: z
    .string()
    .min(1)
    .max(500)
    .regex(/^[a-zA-Z0-9/_\-.]+$/, "Chemin invalide"),
  content_type: z.string().min(1).max(100),
})

export type SignedUploadInput = z.infer<typeof signedUploadSchema>

// ─── Delivery webhook ─────────────────────────────────────────────────────────

export const deliveryStatusUpdateSchema = z.object({
  order_id: z.string().uuid(),
  status: orderStatusSchema,
  tracking_number: z.string().max(100).optional().nullable(),
})

// ─── Profile ──────────────────────────────────────────────────────────────────

/**
 * PATCH /api/profile — at least one field required.
 * phone accepts Moroccan format (+212… or 0…) or null/empty string (clears to null).
 * avatar_url accepts a URL or null/empty string (clears to null).
 */
export const patchProfileSchema = z
  .object({
    full_name: z
      .string()
      .min(2, "Le nom doit contenir au moins 2 caractères")
      .max(100)
      .optional(),
    phone: z
      .string()
      .regex(/^(\+212|0)[5-7][0-9]{8}$/, "Numéro de téléphone marocain invalide")
      .optional()
      .nullable()
      .or(z.literal("").transform(() => null)),
    avatar_url: z
      .string()
      .url("URL d'avatar invalide")
      .optional()
      .nullable()
      .or(z.literal("").transform(() => null)),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Au moins un champ est requis" })

export type PatchProfileInput = z.infer<typeof patchProfileSchema>

/** Formulaire page Profil (dashboard) — toujours au moins `full_name` pour PATCH. */
export const profileSettingsFormSchema = z.object({
  full_name: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(100),
  phone: z.string().refine(
    (s) => {
      const t = s.replace(/\s/g, "")
      return t === "" || /^(\+212|0)[5-7][0-9]{8}$/.test(t)
    },
    { message: "Numéro de téléphone marocain invalide" }
  ),
})

export type ProfileSettingsFormInput = z.infer<typeof profileSettingsFormSchema>

// ─── Subscription plan ────────────────────────────────────────────────────────

export const updateSubscriptionPlanSchema = z.object({
  plan_name: z.enum(["starter", "growth", "pro"], {
    errorMap: () => ({ message: "Plan invalide. Valeurs : starter, growth, pro." }),
  }),
})

export type UpdateSubscriptionPlanInput = z.infer<typeof updateSubscriptionPlanSchema>
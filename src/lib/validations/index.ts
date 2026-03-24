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

export const updateStoreSchema = createStoreSchema
  .omit({ slug: true })
  .extend({
    theme: z.enum(["minimal", "bold", "elegant"]).optional(),
    theme_config: z.record(z.unknown()).optional(),
    custom_domain: z.string().optional().nullable(),
    meta_title: z.string().max(60).optional().nullable(),
    meta_description: z.string().max(160).optional().nullable(),
  })

export type CreateStoreInput = z.infer<typeof createStoreSchema>
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>

// ─── Product ──────────────────────────────────────────────────────────────────

export const createProductSchema = z.object({
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
  images: z.array(z.string().url()).min(1, "Au moins une image est requise").max(10),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  slug: z.string().optional(), // auto-generated if not provided
  meta_title: z.string().max(60).optional().nullable(),
  meta_description: z.string().max(160).optional().nullable(),
}).refine(
  (data) => !data.compare_price || data.compare_price > data.base_price,
  { message: "Le prix barré doit être supérieur au prix de vente", path: ["compare_price"] }
)

export type CreateProductInput = z.infer<typeof createProductSchema>

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
  // The attribute values that define this variant
  attribute_value_ids: z
    .array(z.string().uuid())
    .min(1, "Chaque variante doit avoir au moins un attribut"),
})

export type ProductVariantInput = z.infer<typeof productVariantSchema>

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

export const shippingZoneSchema = z.object({
  wilaya_id: z.number().int().min(1).max(12),
  provider_id: z.string().uuid().optional().nullable(),
  price_mad: z.number().int().min(0, "Le prix de livraison ne peut pas être négatif"),
  free_shipping_threshold: z.number().int().min(0).optional().nullable(),
  estimated_days_min: z.number().int().min(1).default(2),
  estimated_days_max: z.number().int().min(1).default(5),
  is_active: z.boolean().default(true),
}).refine(
  (data) => data.estimated_days_max >= data.estimated_days_min,
  { message: "Le délai max doit être ≥ au délai min", path: ["estimated_days_max"] }
)

export type ShippingZoneInput = z.infer<typeof shippingZoneSchema>

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
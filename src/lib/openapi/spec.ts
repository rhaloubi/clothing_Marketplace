/**
 * OpenAPI 3.1 document for dashboard API routes.
 * Keep in sync with `src/app/api/**` and `src/lib/validations`.
 */

const jsonOk = {
  description: "Succès",
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["data", "error"],
        properties: {
          data: {},
          error: { type: "null" },
        },
      },
    },
  },
} as const

const jsonError = {
  description: "Erreur API",
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["data", "error"],
        properties: {
          data: { type: "null" },
          error: {
            type: "object",
            properties: {
              message: { type: "string" },
              code: { type: "string" },
              fields: {
                type: "object",
                additionalProperties: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
} as const

const unauthorized = {
  ...jsonError,
  description: "Non authentifié",
} as const

const rateLimited = {
  ...jsonError,
  description: "Trop de requêtes",
} as const

export function getOpenApiDocument(): Record<string, unknown> {
  return {
    openapi: "3.1.0",
    info: {
      title: "Shri Marketplace — API marchand",
      version: "0.1.0",
      description:
        "Endpoints JSON du dashboard (auth Supabase via cookies de session). " +
        "Disponible uniquement en **développement** (`NODE_ENV=development`). " +
        "Pour « Try it out », être connecté sur la même origine (ex. après login). " +
        "**Couverture :** stores (détail + livraison), wilayas, produits, variantes, attributs, commandes dashboard, analytics, upload, API storefront publique, webhooks.",
    },
    servers: [{ url: "/", description: "Origine courante (dev)" }],
    tags: [
      { name: "Profile", description: "Profil marchand (nom, téléphone, avatar)" },
      { name: "Subscription", description: "Abonnement et changement de plan" },
      { name: "Stores", description: "Boutiques" },
      { name: "Shipping", description: "Zones de livraison par wilaya" },
      { name: "Wilayas", description: "Régions (référence)" },
      { name: "Products", description: "Produits" },
      { name: "Variants", description: "Variantes produit" },
      { name: "Attributes", description: "Attributs EAV (taille, couleur, …)" },
      { name: "Orders", description: "Commandes (dashboard marchand)" },
      { name: "Analytics", description: "Statistiques (plan Growth+)" },
      { name: "Upload", description: "URL signée Supabase Storage" },
      { name: "Storefront", description: "API publique par slug boutique" },
      { name: "Webhooks", description: "Partenaires / Meta" },
    ],
    paths: {
      "/api/profile": {
        get: {
          tags: ["Profile"],
          summary: "Lire mon profil",
          security: [{ cookieAuth: [] }],
          responses: {
            "200": jsonOk,
            "401": unauthorized,
            "404": jsonError,
            "429": rateLimited,
          },
        },
        patch: {
          tags: ["Profile"],
          summary: "Mettre à jour mon profil",
          security: [{ cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  minProperties: 1,
                  properties: {
                    full_name: { type: "string", minLength: 2, maxLength: 100 },
                    phone: {
                      oneOf: [
                        { type: "string", pattern: "^(\\+212|0)[5-7][0-9]{8}$" },
                        { type: "string", const: "" },
                        { type: "null" },
                      ],
                      description: "Numéro marocain (+212… ou 0…), ou null/'' pour effacer",
                    },
                    avatar_url: {
                      oneOf: [{ type: "string", format: "uri" }, { type: "string", const: "" }, { type: "null" }],
                      description: "URL HTTPS ou null/'' pour effacer",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": jsonOk,
            "400": jsonError,
            "401": unauthorized,
            "429": rateLimited,
          },
        },
      },
      "/api/subscription": {
        get: {
          tags: ["Subscription"],
          summary: "Mon abonnement actuel (avec plan intégré)",
          security: [{ cookieAuth: [] }],
          responses: {
            "200": jsonOk,
            "401": unauthorized,
            "404": jsonError,
            "429": rateLimited,
          },
        },
        patch: {
          tags: ["Subscription"],
          summary: "Changer de plan (upgrade ou downgrade)",
          description:
            "Vérifie les limites en cas de rétrogradation (boutiques / produits actifs). " +
            "Stub facturation : réinitialise la période à +30 j depuis maintenant (remplacé par CMI).",
          security: [{ cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["plan_name"],
                  properties: {
                    plan_name: { type: "string", enum: ["starter", "growth", "pro"] },
                  },
                },
              },
            },
          },
          responses: {
            "200": jsonOk,
            "400": jsonError,
            "401": unauthorized,
            "404": jsonError,
            "409": jsonError,
            "429": rateLimited,
          },
        },
      },
      "/api/stores": {
        get: {
          tags: ["Stores"],
          summary: "Lister mes boutiques",
          security: [{ cookieAuth: [] }],
          responses: {
            "200": jsonOk,
            "401": unauthorized,
            "429": rateLimited,
          },
        },
        post: {
          tags: ["Stores"],
          summary: "Créer une boutique",
          security: [{ cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "slug"],
                  properties: {
                    name: { type: "string", minLength: 2, maxLength: 60 },
                    slug: { type: "string", minLength: 3, maxLength: 50, pattern: "^[a-z0-9-]+$" },
                    description: { type: "string", maxLength: 500 },
                    whatsapp_number: {
                      oneOf: [{ type: "string", pattern: "^\\+?[0-9]{9,15}$" }, { type: "string", const: "" }],
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": jsonOk,
            "400": jsonError,
            "401": unauthorized,
            "403": jsonError,
            "409": jsonError,
            "429": rateLimited,
          },
        },
      },
      "/api/stores/{id}": {
        parameters: [{ $ref: "#/components/parameters/StorePathId" }],
        get: {
          tags: ["Stores"],
          summary: "Détail boutique",
          security: [{ cookieAuth: [] }],
          responses: {
            "200": jsonOk,
            "401": unauthorized,
            "403": jsonError,
            "404": jsonError,
            "429": rateLimited,
          },
        },
        patch: {
          tags: ["Stores"],
          summary: "Mettre à jour une boutique",
          security: [{ cookieAuth: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    description: { type: ["string", "null"] },
                    logo_url: { type: ["string", "null"] },
                    banner_url: { type: ["string", "null"] },
                    theme: { type: "string" },
                    whatsapp_number: { type: ["string", "null"] },
                    is_active: { type: "boolean" },
                    meta_title: { type: ["string", "null"] },
                    meta_description: { type: ["string", "null"] },
                  },
                },
              },
            },
          },
          responses: {
            "200": jsonOk,
            "400": jsonError,
            "401": unauthorized,
            "404": jsonError,
            "409": jsonError,
            "429": rateLimited,
          },
        },
        delete: {
          tags: ["Stores"],
          summary: "Supprimer une boutique (échoue si commandes liées)",
          security: [{ cookieAuth: [] }],
          responses: {
            "204": { description: "Supprimé" },
            "401": unauthorized,
            "403": jsonError,
            "404": jsonError,
            "409": jsonError,
            "429": rateLimited,
          },
        },
      },
      "/api/stores/{id}/shipping-zones": {
        parameters: [{ $ref: "#/components/parameters/StorePathId" }],
        get: {
          tags: ["Shipping"],
          summary: "Lister les zones de livraison",
          security: [{ cookieAuth: [] }],
          responses: {
            "200": jsonOk,
            "401": unauthorized,
            "404": jsonError,
            "429": rateLimited,
          },
        },
        post: {
          tags: ["Shipping"],
          summary: "Créer une zone de livraison",
          security: [{ cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["wilaya_id", "price_mad"],
                  properties: {
                    wilaya_id: { type: "integer", minimum: 1, maximum: 12 },
                    provider_id: { type: ["string", "null"], format: "uuid" },
                    price_mad: { type: "integer", minimum: 0 },
                    free_shipping_threshold: { type: ["integer", "null"], minimum: 0 },
                    estimated_days_min: { type: "integer", minimum: 1, default: 2 },
                    estimated_days_max: { type: "integer", minimum: 1, default: 5 },
                    is_active: { type: "boolean", default: true },
                  },
                },
              },
            },
          },
          responses: {
            "201": jsonOk,
            "400": jsonError,
            "401": unauthorized,
            "409": jsonError,
            "429": rateLimited,
          },
        },
      },
      "/api/stores/{id}/shipping-zones/{zoneId}": {
        parameters: [
          { $ref: "#/components/parameters/StorePathId" },
          { $ref: "#/components/parameters/ZonePathId" },
        ],
        patch: {
          tags: ["Shipping"],
          summary: "Mettre à jour une zone",
          security: [{ cookieAuth: [] }],
          responses: {
            "200": jsonOk,
            "400": jsonError,
            "401": unauthorized,
            "404": jsonError,
            "429": rateLimited,
          },
        },
        delete: {
          tags: ["Shipping"],
          summary: "Supprimer une zone",
          security: [{ cookieAuth: [] }],
          responses: {
            "204": { description: "Supprimé" },
            "401": unauthorized,
            "404": jsonError,
            "429": rateLimited,
          },
        },
      },
      "/api/wilayas": {
        get: {
          tags: ["Wilayas"],
          summary: "Lister les wilayas (public, cacheable)",
          responses: {
            "200": jsonOk,
            "429": rateLimited,
          },
        },
      },
      "/api/products": {
        get: {
          tags: ["Products"],
          summary: "Lister les produits d'une boutique",
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              name: "store_id",
              in: "query",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
            },
            {
              name: "offset",
              in: "query",
              schema: { type: "integer", minimum: 0, default: 0 },
            },
          ],
          responses: {
            "200": jsonOk,
            "400": jsonError,
            "401": unauthorized,
            "404": jsonError,
            "429": rateLimited,
          },
        },
        post: {
          tags: ["Products"],
          summary: "Créer un produit",
          security: [{ cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["store_id", "name", "base_price", "images"],
                  properties: {
                    store_id: { type: "string", format: "uuid" },
                    name: { type: "string", minLength: 2, maxLength: 200 },
                    description: { type: "string", maxLength: 2000 },
                    category: { type: "string", maxLength: 100 },
                    base_price: { type: "integer", minimum: 1, maximum: 100000 },
                    compare_price: { type: ["integer", "null"], minimum: 1 },
                    images: {
                      type: "array",
                      minItems: 1,
                      maxItems: 10,
                      items: { type: "string", format: "uri" },
                    },
                    is_active: { type: "boolean", default: true },
                    is_featured: { type: "boolean", default: false },
                    slug: { type: "string" },
                    meta_title: { type: ["string", "null"], maxLength: 60 },
                    meta_description: { type: ["string", "null"], maxLength: 160 },
                  },
                },
              },
            },
          },
          responses: {
            "201": jsonOk,
            "400": jsonError,
            "401": unauthorized,
            "403": jsonError,
            "409": jsonError,
            "429": rateLimited,
          },
        },
      },
      "/api/products/{id}": {
        get: {
          tags: ["Products"],
          summary: "Détail produit (avec variantes et attributs)",
          security: [{ cookieAuth: [] }],
          parameters: [{ $ref: "#/components/parameters/ProductId" }],
          responses: {
            "200": jsonOk,
            "400": jsonError,
            "401": unauthorized,
            "404": jsonError,
            "429": rateLimited,
          },
        },
        patch: {
          tags: ["Products"],
          summary: "Mettre à jour un produit",
          security: [{ cookieAuth: [] }],
          parameters: [{ $ref: "#/components/parameters/ProductId" }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string", minLength: 2, maxLength: 200 },
                    description: { type: "string", maxLength: 2000 },
                    category: { type: "string", maxLength: 100 },
                    base_price: { type: "integer", minimum: 1, maximum: 100000 },
                    compare_price: { type: ["integer", "null"], minimum: 1 },
                    images: {
                      type: "array",
                      minItems: 1,
                      maxItems: 10,
                      items: { type: "string", format: "uri" },
                    },
                    is_active: { type: "boolean" },
                    is_featured: { type: "boolean" },
                    slug: { type: "string", minLength: 3, maxLength: 80, pattern: "^[a-z0-9-]+$" },
                    meta_title: { type: ["string", "null"], maxLength: 60 },
                    meta_description: { type: ["string", "null"], maxLength: 160 },
                  },
                },
              },
            },
          },
          responses: {
            "200": jsonOk,
            "400": jsonError,
            "401": unauthorized,
            "404": jsonError,
            "409": jsonError,
            "429": rateLimited,
          },
        },
        delete: {
          tags: ["Products"],
          summary: "Supprimer un produit",
          security: [{ cookieAuth: [] }],
          parameters: [{ $ref: "#/components/parameters/ProductId" }],
          responses: {
            "204": { description: "Supprimé" },
            "401": unauthorized,
            "404": jsonError,
            "429": rateLimited,
          },
        },
      },
      "/api/products/{id}/variants": {
        get: {
          tags: ["Variants"],
          summary: "Lister les variantes",
          security: [{ cookieAuth: [] }],
          parameters: [{ $ref: "#/components/parameters/ProductId" }],
          responses: {
            "200": jsonOk,
            "401": unauthorized,
            "404": jsonError,
            "429": rateLimited,
          },
        },
        post: {
          tags: ["Variants"],
          summary: "Créer une variante",
          security: [{ cookieAuth: [] }],
          parameters: [{ $ref: "#/components/parameters/ProductId" }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["attribute_value_ids"],
                  properties: {
                    sku: { type: ["string", "null"], maxLength: 100 },
                    price_override: { type: ["integer", "null"], minimum: 1 },
                    stock_quantity: { type: "integer", minimum: 0, default: 0 },
                    images: {
                      type: "array",
                      maxItems: 5,
                      items: { type: "string", format: "uri" },
                      default: [],
                    },
                    is_active: { type: "boolean", default: true },
                    attribute_value_ids: {
                      type: "array",
                      minItems: 1,
                      items: { type: "string", format: "uuid" },
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": jsonOk,
            "400": jsonError,
            "401": unauthorized,
            "404": jsonError,
            "429": rateLimited,
          },
        },
      },
      "/api/products/{id}/variants/{variantId}": {
        get: {
          tags: ["Variants"],
          summary: "Détail d'une variante",
          security: [{ cookieAuth: [] }],
          parameters: [
            { $ref: "#/components/parameters/ProductId" },
            { $ref: "#/components/parameters/VariantId" },
          ],
          responses: {
            "200": jsonOk,
            "401": unauthorized,
            "404": jsonError,
            "429": rateLimited,
          },
        },
        patch: {
          tags: ["Variants"],
          summary: "Mettre à jour une variante",
          security: [{ cookieAuth: [] }],
          parameters: [
            { $ref: "#/components/parameters/ProductId" },
            { $ref: "#/components/parameters/VariantId" },
          ],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    sku: { type: ["string", "null"], maxLength: 100 },
                    price_override: { type: ["integer", "null"], minimum: 1 },
                    stock_quantity: { type: "integer", minimum: 0 },
                    images: {
                      type: "array",
                      maxItems: 5,
                      items: { type: "string", format: "uri" },
                    },
                    is_active: { type: "boolean" },
                    attribute_value_ids: {
                      type: "array",
                      minItems: 1,
                      items: { type: "string", format: "uuid" },
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": jsonOk,
            "400": jsonError,
            "401": unauthorized,
            "404": jsonError,
            "429": rateLimited,
          },
        },
        delete: {
          tags: ["Variants"],
          summary: "Supprimer une variante",
          security: [{ cookieAuth: [] }],
          parameters: [
            { $ref: "#/components/parameters/ProductId" },
            { $ref: "#/components/parameters/VariantId" },
          ],
          responses: {
            "204": { description: "Supprimé" },
            "401": unauthorized,
            "404": jsonError,
            "429": rateLimited,
          },
        },
      },
      "/api/attributes": {
        get: {
          tags: ["Attributes"],
          summary: "Lister les définitions d'attributs (+ valeurs)",
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              name: "store_id",
              in: "query",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": jsonOk,
            "400": jsonError,
            "401": unauthorized,
            "404": jsonError,
            "429": rateLimited,
          },
        },
        post: {
          tags: ["Attributes"],
          summary: "Créer une définition + valeurs",
          security: [{ cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["store_id", "name", "values"],
                  properties: {
                    store_id: { type: "string", format: "uuid" },
                    name: { type: "string", minLength: 1, maxLength: 50 },
                    display_type: {
                      type: "string",
                      enum: ["select", "color_swatch", "text", "button"],
                      default: "select",
                    },
                    is_required: { type: "boolean", default: false },
                    sort_order: { type: "integer", minimum: 0, default: 0 },
                    values: {
                      type: "array",
                      minItems: 1,
                      items: {
                        type: "object",
                        required: ["label", "value"],
                        properties: {
                          label: { type: "string", minLength: 1, maxLength: 50 },
                          value: { type: "string", minLength: 1, maxLength: 50 },
                          color_hex: {
                            type: ["string", "null"],
                            pattern: "^#[0-9A-Fa-f]{6}$",
                          },
                          sort_order: { type: "integer", minimum: 0, default: 0 },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": jsonOk,
            "400": jsonError,
            "401": unauthorized,
            "404": jsonError,
            "429": rateLimited,
          },
        },
      },
      "/api/attributes/{id}": {
        get: {
          tags: ["Attributes"],
          summary: "Détail attribut + valeurs",
          security: [{ cookieAuth: [] }],
          parameters: [{ $ref: "#/components/parameters/AttributeId" }],
          responses: {
            "200": jsonOk,
            "401": unauthorized,
            "404": jsonError,
            "429": rateLimited,
          },
        },
        patch: {
          tags: ["Attributes"],
          summary: "Mettre à jour la définition (pas les valeurs)",
          security: [{ cookieAuth: [] }],
          parameters: [{ $ref: "#/components/parameters/AttributeId" }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string", minLength: 1, maxLength: 50 },
                    display_type: {
                      type: "string",
                      enum: ["select", "color_swatch", "text", "button"],
                    },
                    is_required: { type: "boolean" },
                    sort_order: { type: "integer", minimum: 0 },
                  },
                },
              },
            },
          },
          responses: {
            "200": jsonOk,
            "400": jsonError,
            "401": unauthorized,
            "404": jsonError,
            "429": rateLimited,
          },
        },
        delete: {
          tags: ["Attributes"],
          summary: "Supprimer une définition (cascade valeurs)",
          security: [{ cookieAuth: [] }],
          parameters: [{ $ref: "#/components/parameters/AttributeId" }],
          responses: {
            "204": { description: "Supprimé" },
            "401": unauthorized,
            "404": jsonError,
            "429": rateLimited,
          },
        },
      },
      "/api/attributes/{id}/values": {
        post: {
          tags: ["Attributes"],
          summary: "Ajouter une valeur à une définition existante",
          security: [{ cookieAuth: [] }],
          parameters: [{ $ref: "#/components/parameters/AttributeId" }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["label", "value"],
                  properties: {
                    label: { type: "string", minLength: 1, maxLength: 50 },
                    value: { type: "string", minLength: 1, maxLength: 50 },
                    color_hex: {
                      type: ["string", "null"],
                      pattern: "^#[0-9A-Fa-f]{6}$",
                    },
                    sort_order: { type: "integer", minimum: 0, default: 0 },
                  },
                },
              },
            },
          },
          responses: {
            "201": jsonOk,
            "400": jsonError,
            "401": unauthorized,
            "404": jsonError,
            "409": jsonError,
            "429": rateLimited,
          },
        },
      },
      "/api/attributes/{id}/values/{valueId}": {
        patch: {
          tags: ["Attributes"],
          summary: "Mettre à jour une valeur d'attribut",
          security: [{ cookieAuth: [] }],
          parameters: [
            { $ref: "#/components/parameters/AttributeId" },
            { $ref: "#/components/parameters/AttributeValueId" },
          ],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    label: { type: "string", minLength: 1, maxLength: 50 },
                    value: { type: "string", minLength: 1, maxLength: 50 },
                    color_hex: {
                      type: ["string", "null"],
                      pattern: "^#[0-9A-Fa-f]{6}$",
                    },
                    sort_order: { type: "integer", minimum: 0 },
                  },
                },
              },
            },
          },
          responses: {
            "200": jsonOk,
            "400": jsonError,
            "401": unauthorized,
            "404": jsonError,
            "409": jsonError,
            "429": rateLimited,
          },
        },
        delete: {
          tags: ["Attributes"],
          summary: "Supprimer une valeur (si non utilisée par des variantes)",
          security: [{ cookieAuth: [] }],
          parameters: [
            { $ref: "#/components/parameters/AttributeId" },
            { $ref: "#/components/parameters/AttributeValueId" },
          ],
          responses: {
            "204": { description: "Supprimé" },
            "401": unauthorized,
            "404": jsonError,
            "409": jsonError,
            "429": rateLimited,
          },
        },
      },
      "/api/orders": {
        get: {
          tags: ["Orders"],
          summary: "Lister les commandes d'une boutique",
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              name: "store_id",
              in: "query",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
            {
              name: "status",
              in: "query",
              schema: {
                type: "string",
                enum: [
                  "pending",
                  "confirmed",
                  "shipped",
                  "delivered",
                  "returned",
                  "cancelled",
                ],
              },
            },
            { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
            { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
          ],
          responses: {
            "200": jsonOk,
            "400": jsonError,
            "401": unauthorized,
            "429": rateLimited,
          },
        },
      },
      "/api/orders/{id}": {
        parameters: [{ $ref: "#/components/parameters/OrderPathId" }],
        get: {
          tags: ["Orders"],
          summary: "Détail commande + lignes",
          security: [{ cookieAuth: [] }],
          responses: {
            "200": jsonOk,
            "401": unauthorized,
            "404": jsonError,
            "429": rateLimited,
          },
        },
        patch: {
          tags: ["Orders"],
          summary: "Mettre à jour statut / suivi (machine d'état COD)",
          security: [{ cookieAuth: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: {
                      type: "string",
                      enum: [
                        "pending",
                        "confirmed",
                        "shipped",
                        "delivered",
                        "returned",
                        "cancelled",
                      ],
                    },
                    tracking_number: { type: ["string", "null"] },
                    shipping_provider_id: { type: ["string", "null"], format: "uuid" },
                  },
                },
              },
            },
          },
          responses: {
            "200": jsonOk,
            "400": jsonError,
            "401": unauthorized,
            "404": jsonError,
            "429": rateLimited,
          },
        },
      },
      "/api/analytics/events": {
        post: {
          tags: ["Analytics"],
          summary: "Enregistrer un événement (storefront, public)",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object" } } },
          },
          responses: {
            "201": jsonOk,
            "400": jsonError,
            "429": rateLimited,
          },
        },
      },
      "/api/analytics/overview": {
        get: {
          tags: ["Analytics"],
          summary: "Vue d'ensemble (plan Growth+)",
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              name: "store_id",
              in: "query",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
            { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
            { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
          ],
          responses: {
            "200": jsonOk,
            "400": jsonError,
            "401": unauthorized,
            "403": jsonError,
            "429": rateLimited,
          },
        },
      },
      "/api/analytics/revenue": {
        get: {
          tags: ["Analytics"],
          summary: "Série temporelle CA (plan Growth+)",
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              name: "store_id",
              in: "query",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
            { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
            { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
          ],
          responses: {
            "200": jsonOk,
            "400": jsonError,
            "401": unauthorized,
            "403": jsonError,
            "429": rateLimited,
          },
        },
      },
      "/api/analytics/funnel": {
        get: {
          tags: ["Analytics"],
          summary: "Entonnoir conversion (plan Growth+)",
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              name: "store_id",
              in: "query",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
            { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
            { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
          ],
          responses: {
            "200": jsonOk,
            "400": jsonError,
            "401": unauthorized,
            "403": jsonError,
            "429": rateLimited,
          },
        },
      },
      "/api/analytics/products": {
        get: {
          tags: ["Analytics"],
          summary: "Top produits vendus (plan Growth+)",
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              name: "store_id",
              in: "query",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
            { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
            { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
          ],
          responses: {
            "200": jsonOk,
            "400": jsonError,
            "401": unauthorized,
            "403": jsonError,
            "429": rateLimited,
          },
        },
      },
      "/api/analytics/wilayas": {
        get: {
          tags: ["Analytics"],
          summary: "Répartition par wilaya (plan Growth+)",
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              name: "store_id",
              in: "query",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
            { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
            { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
          ],
          responses: {
            "200": jsonOk,
            "400": jsonError,
            "401": unauthorized,
            "403": jsonError,
            "429": rateLimited,
          },
        },
      },
      "/api/upload": {
        post: {
          tags: ["Upload"],
          summary: "Obtenir une URL d'upload signée",
          security: [{ cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["store_id", "bucket", "path", "content_type"],
                  properties: {
                    store_id: { type: "string", format: "uuid" },
                    bucket: { type: "string", enum: ["store-assets", "product-images"] },
                    path: { type: "string" },
                    content_type: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": jsonOk,
            "400": jsonError,
            "401": unauthorized,
            "429": rateLimited,
          },
        },
      },
      "/api/storefront/{tenant}/products": {
        parameters: [{ $ref: "#/components/parameters/TenantSlug" }],
        get: {
          tags: ["Storefront"],
          summary: "Lister les produits actifs (public)",
          parameters: [
            { name: "limit", in: "query", schema: { type: "integer", default: 24 } },
            { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
          ],
          responses: {
            "200": jsonOk,
            "404": jsonError,
            "429": rateLimited,
          },
        },
      },
      "/api/storefront/{tenant}/products/{slug}": {
        parameters: [
          { $ref: "#/components/parameters/TenantSlug" },
          { $ref: "#/components/parameters/ProductSlug" },
        ],
        get: {
          tags: ["Storefront"],
          summary: "Détail produit + variantes (public)",
          responses: {
            "200": jsonOk,
            "404": jsonError,
            "429": rateLimited,
          },
        },
      },
      "/api/storefront/{tenant}/shipping": {
        parameters: [{ $ref: "#/components/parameters/TenantSlug" }],
        get: {
          tags: ["Storefront"],
          summary: "Tarif livraison pour une wilaya (public)",
          parameters: [
            {
              name: "wilaya_id",
              in: "query",
              required: true,
              schema: { type: "integer", minimum: 1, maximum: 12 },
            },
          ],
          responses: {
            "200": jsonOk,
            "400": jsonError,
            "404": jsonError,
            "429": rateLimited,
          },
        },
      },
      "/api/storefront/{tenant}/orders": {
        parameters: [{ $ref: "#/components/parameters/TenantSlug" }],
        post: {
          tags: ["Storefront"],
          summary: "Checkout invité COD (public)",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object" } } },
          },
          responses: {
            "201": jsonOk,
            "400": jsonError,
            "404": jsonError,
            "409": jsonError,
            "429": rateLimited,
          },
        },
      },
      "/api/webhooks/whatsapp": {
        get: {
          tags: ["Webhooks"],
          summary: "Vérification Meta (hub.challenge)",
          responses: { "200": { description: "Challenge" }, "403": { description: "Refusé" } },
        },
        post: {
          tags: ["Webhooks"],
          summary: "Événements WhatsApp (signature X-Hub-Signature-256)",
          responses: {
            "200": jsonOk,
            "401": jsonError,
          },
        },
      },
      "/api/webhooks/delivery": {
        post: {
          tags: ["Webhooks"],
          summary: "Mise à jour statut livraison (signature X-Signature-256)",
          responses: {
            "200": jsonOk,
            "400": jsonError,
            "401": jsonError,
            "404": jsonError,
            "429": rateLimited,
          },
        },
      },
    },
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "sb-access-token",
          description:
            "Session Supabase : les cookies sont posés après login. " +
            "Le nom exact peut varier (`sb-<project-ref>-auth-token`). " +
            "Swagger envoie les cookies same-origin si vous êtes connecté sur ce host.",
        },
      },
      parameters: {
        ProductId: {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
        VariantId: {
          name: "variantId",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
        AttributeId: {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
        AttributeValueId: {
          name: "valueId",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
        StorePathId: {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
        ZonePathId: {
          name: "zoneId",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
        OrderPathId: {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
        TenantSlug: {
          name: "tenant",
          in: "path",
          required: true,
          schema: { type: "string", pattern: "^[a-z0-9-]+$" },
        },
        ProductSlug: {
          name: "slug",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      },
    },
  }
}

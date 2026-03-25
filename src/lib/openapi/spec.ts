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
        "Pour « Try it out », être connecté sur la même origine (ex. après login).",
    },
    servers: [{ url: "/", description: "Origine courante (dev)" }],
    tags: [
      { name: "Stores", description: "Boutiques" },
      { name: "Products", description: "Produits" },
      { name: "Variants", description: "Variantes produit" },
      { name: "Attributes", description: "Attributs EAV (taille, couleur, …)" },
    ],
    paths: {
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
      },
    },
  }
}

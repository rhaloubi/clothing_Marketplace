/**
 * TanStack Query keys — keep shapes aligned with `.cursor/rules/frontend-patterns.mdc`.
 */

export const queryKeys = {
  stores: () => ["stores"] as const,
  store: (storeId: string) => ["store", storeId] as const,
  orders: (storeId: string, status?: string) =>
    ["orders", { storeId, status }] as const,
  order: (orderId: string) => ["order", orderId] as const,
  products: (storeId: string) => ["products", { storeId }] as const,
  product: (productId: string) => ["product", productId] as const,
  analytics: {
    overview: (storeId: string) => ["analytics", "overview", storeId] as const,
    revenue: (storeId: string) => ["analytics", "revenue", storeId] as const,
    funnel: (storeId: string) => ["analytics", "funnel", storeId] as const,
    products: (storeId: string) => ["analytics", "products", storeId] as const,
    wilayas: (storeId: string) => ["analytics", "wilayas", storeId] as const,
  },
  subscription: () => ["subscription"] as const,
  profile: () => ["profile"] as const,
} as const

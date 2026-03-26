import { createAdminClient } from "@/lib/supabase/admin"

export type StoreBucket = "store-assets" | "product-images"

/**
 * Returns a time-limited signed upload URL + token for direct client PUT upload.
 */
export async function createSignedStoreUploadUrl(
  bucket: StoreBucket,
  objectPath: string,
  options: { upsert?: boolean } = {}
) {
  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUploadUrl(objectPath, { upsert: options.upsert ?? true })

  if (error) throw error
  return data
}

import { BadRequestError } from "@/lib/api/errors"
import { createAdminClient } from "@/lib/supabase/admin"

export type StoreBucket = "store-assets" | "product-images"

function isStorageBucketMissing(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false
  if (!("__isStorageError" in err)) return false
  const e = err as { message?: string; status?: number; statusCode?: string }
  if (e.status === 400 && e.statusCode === "404") return true
  return /does not exist/i.test(e.message ?? "")
}

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

  if (error) {
    if (isStorageBucketMissing(error)) {
      throw new BadRequestError(
        `Le bucket Storage « ${bucket} » est introuvable. Dans Supabase : Storage → New bucket, ou exécutez db/storage-buckets.sql dans l’éditeur SQL.`
      )
    }
    throw error
  }
  return data
}

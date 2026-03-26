import { createAdminClient } from "@/lib/supabase/admin"

export async function deleteStorageObjects(bucket: string, paths: string[]): Promise<void> {
  if (paths.length === 0) return
  const admin = createAdminClient()
  const { error } = await admin.storage.from(bucket).remove(paths)
  if (error) throw error
}

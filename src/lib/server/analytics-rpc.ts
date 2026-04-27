import type { SupabaseClient } from "@supabase/supabase-js"
import type { PostgrestError } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"

type SB = SupabaseClient<Database>

type RpcFn = (
  fn: string,
  args?: Record<string, unknown>
) => Promise<{ data: unknown; error: PostgrestError | null }>

export async function runAnalyticsRpc<T>(
  supabase: SB,
  fn: string,
  args: Record<string, unknown>
): Promise<T[]> {
  const rpc = supabase.rpc.bind(supabase) as unknown as RpcFn
  const { data, error } = await rpc(fn, args)
  if (error) throw error
  if (!Array.isArray(data)) return []
  return data as T[]
}

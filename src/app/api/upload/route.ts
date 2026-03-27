import { type NextRequest } from "next/server"
import { withAuth, withRateLimit, ok, fail, ValidationError } from "@/lib/api"
import { createSignedStoreUploadUrl } from "@/lib/storage"
import { assertStoreOwnership } from "@/lib/utils"
import { signedUploadSchema } from "@/lib/validations"
import { createClient } from "@/lib/supabase/server"

export const POST = withAuth(
  withRateLimit("upload", { keyBy: "user" })(async (req: NextRequest, { auth }) => {
    const body = (await req.json()) as unknown
    const parsed = signedUploadSchema.safeParse(body)
    if (!parsed.success) {
      return fail(
        new ValidationError(
          parsed.error.errors[0]?.message ?? "Invalide",
          Object.fromEntries(parsed.error.errors.map((e) => [e.path.join("."), e.message]))
        )
      )
    }

    const supabase = await createClient()
    await assertStoreOwnership(supabase, parsed.data.store_id, auth.user.id)

    const objectPath = `${auth.user.id}/${parsed.data.store_id}/${parsed.data.path}`

    try {
      const data = await createSignedStoreUploadUrl(parsed.data.bucket, objectPath, {
        upsert: true,
      })
      return ok({
        bucket: parsed.data.bucket,
        path: data.path,
        signed_url: data.signedUrl,
        token: data.token,
        content_type: parsed.data.content_type,
      })
    } catch (err) {
      return fail(err)
    }
  })
)

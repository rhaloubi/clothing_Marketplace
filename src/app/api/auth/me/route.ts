import { withAuth, withRateLimit, ok } from "@/lib/api"

export const GET = withRateLimit("api", { keyBy: "user" })(
  withAuth(async (_req, { auth }) => {
    return ok({
      user: auth.user,
      // Keep this endpoint stable even if DB typing is temporarily out-of-sync.
      profile: auth.profile as unknown,
    })
  })
)

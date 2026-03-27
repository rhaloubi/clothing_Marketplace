import { withUserAuth, withRateLimit, ok } from "@/lib/api"

export const GET = withUserAuth(
  withRateLimit("api", { keyBy: "user" })(async (_req, { auth }) => {
    return ok({
      user: auth.user,
    })
  })
)

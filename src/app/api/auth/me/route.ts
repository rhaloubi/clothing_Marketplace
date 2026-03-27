import { withUserAuth, withRateLimit, ok } from "@/lib/api"

export const GET = withRateLimit("api", { keyBy: "user" })(
  withUserAuth(async (_req, { auth }) => {
    return ok({
      user: auth.user,
    })
  })
)

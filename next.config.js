/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION=true` to skip env validation.
 * Useful for Docker builds where env vars are injected at runtime.
 */
import "./src/env.js"

/** @type {import("next").NextConfig} */
const config = {
  images: {
    remotePatterns: [
      {
        // Supabase Storage CDN
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ]
  },
}

export default config
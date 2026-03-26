import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  /**
   * Server-side env vars — never exposed to the browser.
   */
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]),

    // Supabase — service role key (bypasses RLS)
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    SUPABASE_PROJECT_ID: z.string().min(1),

    // WhatsApp Business Cloud API
    WHATSAPP_API_URL: z.string().url().default("https://graph.facebook.com/v19.0"),
    WHATSAPP_PHONE_NUMBER_ID: z.string().min(1),
    WHATSAPP_ACCESS_TOKEN: z.string().min(1),
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().min(1),
    /** Meta app secret — used to verify `X-Hub-Signature-256` on WhatsApp webhooks (not the verify token). */
    WHATSAPP_APP_SECRET: z.string().min(1),

    // Partner webhooks (delivery status, etc.)
    DELIVERY_WEBHOOK_SECRET: z.string().min(32),

    // Upstash Redis
    UPSTASH_REDIS_REST_URL: z.string().url(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

    // Internal cron/webhook secret
    CRON_SECRET: z.string().min(32),
  },

  /**
   * Client-side env vars — must be prefixed with NEXT_PUBLIC_.
   */
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    // Root domain — used for subdomain tenant resolution
    // Local: platform.localhost  |  Prod: platform.ma
    NEXT_PUBLIC_ROOT_DOMAIN: z.string().min(1).default("platform.localhost"),
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  },

  /**
   * Destructure manually — required for Next.js edge runtime compatibility.
   */
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,

    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_PROJECT_ID: process.env.SUPABASE_PROJECT_ID,

    WHATSAPP_API_URL: process.env.WHATSAPP_API_URL,
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
    WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
    WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET,

    DELIVERY_WEBHOOK_SECRET: process.env.DELIVERY_WEBHOOK_SECRET,

    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,

    CRON_SECRET: process.env.CRON_SECRET,

    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_ROOT_DOMAIN: process.env.NEXT_PUBLIC_ROOT_DOMAIN,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  /**
   * Skip validation during Docker builds or CI.
   * Set SKIP_ENV_VALIDATION=true in those environments.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,

  /**
   * Treat empty strings as undefined.
   * SOME_VAR="" will throw instead of silently passing.
   */
  emptyStringAsUndefined: true,
})
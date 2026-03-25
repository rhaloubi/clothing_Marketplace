import { NextResponse } from "next/server"
import { getOpenApiDocument, isOpenApiDevEnabled } from "@/lib/openapi"

/**
 * OpenAPI document (JSON). **Development only** — 404 in production.
 */
export async function GET() {
  if (!isOpenApiDevEnabled()) {
    return new NextResponse(null, { status: 404 })
  }

  const doc = getOpenApiDocument()
  return NextResponse.json(doc, {
    headers: {
      "Cache-Control": "no-store",
    },
  })
}

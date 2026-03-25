"use client"

import { useEffect, useRef } from "react"

const SWAGGER_UI_VERSION = "5.17.14"
const CSS = `https://unpkg.com/swagger-ui-dist@${SWAGGER_UI_VERSION}/swagger-ui.css`
const BUNDLE = `https://unpkg.com/swagger-ui-dist@${SWAGGER_UI_VERSION}/swagger-ui-bundle.js`

declare global {
  interface Window {
    SwaggerUIBundle?: (config: {
      url: string
      dom_id: string
      deepLinking?: boolean
      requestInterceptor?: (req: Record<string, unknown>) => Record<string, unknown>
    }) => unknown
  }
}

/**
 * Loads Swagger UI from CDN (no npm dependency). Cookies are sent on Try it out (same-origin).
 */
export function ApiDocsClient() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = CSS
    document.head.appendChild(link)

    const script = document.createElement("script")
    script.src = BUNDLE
    script.async = true

    script.onload = () => {
      const bundle = window.SwaggerUIBundle
      if (!bundle || !containerRef.current) return

      bundle({
        url: "/api/openapi.json",
        dom_id: "#swagger-ui-root",
        deepLinking: true,
        requestInterceptor: (req) => {
          return { ...req, credentials: "same-origin" }
        },
      })
    }

    document.body.appendChild(script)

    return () => {
      link.remove()
      script.remove()
      if (containerRef.current) containerRef.current.innerHTML = ""
    }
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-neutral-200 px-4 py-3 text-sm text-neutral-600">
        <strong className="text-neutral-900">API docs (dev only)</strong>
        {" · "}
        Spécification :{" "}
        <a className="text-blue-600 underline" href="/api/openapi.json">
          /api/openapi.json
        </a>
      </header>
      <div ref={containerRef} id="swagger-ui-root" className="flex-1" />
    </div>
  )
}

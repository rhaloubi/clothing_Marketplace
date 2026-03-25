"use client"

import dynamic from "next/dynamic"

const ApiDocsClient = dynamic(() => import("./api-docs-client").then((m) => m.ApiDocsClient), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center text-neutral-500">
      Chargement de la documentation…
    </div>
  ),
})

export function ApiDocsSwaggerLoader() {
  return <ApiDocsClient />
}

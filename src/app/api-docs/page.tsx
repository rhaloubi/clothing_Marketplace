import { notFound } from "next/navigation"
import { isOpenApiDevEnabled } from "@/lib/openapi"
import { ApiDocsSwaggerLoader } from "./swagger-loader"

export const metadata = {
  title: "API (développement)",
  robots: { index: false, follow: false },
}

export default function ApiDocsPage() {
  if (!isOpenApiDevEnabled()) {
    notFound()
  }

  return <ApiDocsSwaggerLoader />
}

"use client"

import { useCallback, useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { parseStoreId } from "@/lib/dashboard"

/**
 * Reads / updates the dashboard `?store=` query param (UUID).
 *
 * Wrap consumers in `<Suspense>` when used under routes that are statically optimized,
 * per Next.js `useSearchParams` requirements.
 */
export function useStoreSearchParam() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const storeId = useMemo(
    () => parseStoreId(searchParams.get("store")),
    [searchParams]
  )

  const setStoreId = useCallback(
    (id: string) => {
      const next = new URLSearchParams(searchParams.toString())
      next.set("store", id)
      const qs = next.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname)
    },
    [pathname, router, searchParams]
  )

  return { storeId, setStoreId }
}

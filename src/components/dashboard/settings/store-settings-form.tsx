"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Camera, ImageIcon, Loader2 } from "lucide-react"
import { nanoid } from "nanoid"
import { ShippingZonesSettings } from "@/components/dashboard/settings/shipping-zones-settings"
import { dashboardLinkPrimary } from "@/components/dashboard/dashboard-page"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiClientError, apiFetch } from "@/lib/api-client"
import { storeSettingsFormSchema, type StoreSettingsFormInput } from "@/lib/validations"
import { cn } from "@/lib/utils"
import type { StoreSettingsInitialData } from "@/types"
import { toast } from "sonner"

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

type SignedUploadResponse = {
  bucket: string
  path: string
  signed_url: string
  content_type: string
}

function supabasePublicObjectUrl(bucket: string, objectPath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? ""
  const encoded = objectPath
    .split("/")
    .filter(Boolean)
    .map((s) => encodeURIComponent(s))
    .join("/")
  return `${base}/storage/v1/object/public/${bucket}/${encoded}`
}

function fileExtension(file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase()
  if (ext && /^[a-z0-9]+$/.test(ext) && ext.length <= 5) {
    const map: Record<string, string> = {
      jpg: "jpg",
      jpeg: "jpg",
      png: "png",
      webp: "webp",
      gif: "gif",
    }
    if (map[ext]) return map[ext]
  }
  if (file.type === "image/jpeg") return "jpg"
  if (file.type === "image/png") return "png"
  if (file.type === "image/webp") return "webp"
  return "jpg"
}

function whatsappNationalFromDb(value: string | null | undefined): string {
  if (!value) return ""
  const t = value.replace(/\s/g, "")
  if (t.startsWith("+212")) return t.slice(4)
  if (t.startsWith("0") && t.length === 10) return t.slice(1)
  return t.replace(/\D/g, "").replace(/^212/, "")
}

async function uploadStoreAsset(
  file: File,
  storeId: string,
  kind: "logo" | "banner"
): Promise<string> {
  const mime =
    file.type && ALLOWED_IMAGE_TYPES.has(file.type) ? file.type : "image/jpeg"
  const relPath = `branding/${kind}-${nanoid()}.${fileExtension(file)}`

  const data = await apiFetch<SignedUploadResponse>("/api/upload", {
    method: "POST",
    body: JSON.stringify({
      store_id: storeId,
      bucket: "store-assets",
      path: relPath,
      content_type: mime,
    }),
    redirectOnUnauthorized: true,
  })

  const putRes = await fetch(data.signed_url, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": data.content_type },
  })

  if (!putRes.ok) {
    throw new Error("L’envoi du fichier a échoué.")
  }

  return supabasePublicObjectUrl(data.bucket, data.path)
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="grid gap-6 border-b border-stripe-border pb-10 last:border-b-0 last:pb-0 lg:grid-cols-[minmax(200px,280px)_1fr] lg:items-start lg:gap-10">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-stripe-heading">{title}</h2>
        <p className="text-sm text-stripe-body">{description}</p>
      </div>
      <div className="rounded-md border border-stripe-border bg-white p-4 shadow-stripe-card sm:p-5">
        {children}
      </div>
    </section>
  )
}

export function StoreSettingsForm({ initial }: { initial: StoreSettingsInitialData }) {
  const router = useRouter()
  const storeId = initial.store.id
  const logoInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const [logoUrl, setLogoUrl] = useState<string | null>(initial.store.logo_url)
  const [bannerUrl, setBannerUrl] = useState<string | null>(initial.store.banner_url)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)

  const defaults = useMemo(
    () => ({
      name: initial.store.name,
      slug: initial.store.slug,
      whatsapp_national: whatsappNationalFromDb(initial.store.whatsapp_number),
    }),
    [initial.store]
  )

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<StoreSettingsFormInput>({
    resolver: zodResolver(storeSettingsFormSchema),
    defaultValues: defaults,
  })

  useEffect(() => {
    reset({
      name: initial.store.name,
      slug: initial.store.slug,
      whatsapp_national: whatsappNationalFromDb(initial.store.whatsapp_number),
    })
    setLogoUrl(initial.store.logo_url)
    setBannerUrl(initial.store.banner_url)
  }, [
    initial.store.name,
    initial.store.slug,
    initial.store.whatsapp_number,
    initial.store.logo_url,
    initial.store.banner_url,
    reset,
  ])

  const resetAll = useCallback(() => {
    reset(defaults)
    setLogoUrl(initial.store.logo_url)
    setBannerUrl(initial.store.banner_url)
  }, [reset, defaults, initial.store.logo_url, initial.store.banner_url])

  async function onLogoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !ALLOWED_IMAGE_TYPES.has(file.type)) {
      toast.error("Formats acceptés : JPEG, PNG, WebP.")
      return
    }
    setUploadingLogo(true)
    try {
      const url = await uploadStoreAsset(file, storeId, "logo")
      setLogoUrl(url)
      toast.success("Logo mis à jour (enregistrez pour appliquer).")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible d’envoyer le logo."
      )
    } finally {
      setUploadingLogo(false)
    }
  }

  async function onBannerPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !ALLOWED_IMAGE_TYPES.has(file.type)) {
      toast.error("Formats acceptés : JPEG, PNG, WebP.")
      return
    }
    setUploadingBanner(true)
    try {
      const url = await uploadStoreAsset(file, storeId, "banner")
      setBannerUrl(url)
      toast.success("Bannière mise à jour (enregistrez pour appliquer).")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible d’envoyer la bannière."
      )
    } finally {
      setUploadingBanner(false)
    }
  }

  const onValid = async (data: StoreSettingsFormInput) => {
    try {
      await apiFetch(`/api/stores/${storeId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: data.name,
          slug: data.slug,
          whatsapp_number: (() => {
            const t = data.whatsapp_national.replace(/\s/g, "")
            return t === "" ? null : `+212${t}`
          })(),
          logo_url: logoUrl,
          banner_url: bannerUrl,
        }),
        redirectOnUnauthorized: true,
      })
      toast.success("Paramètres enregistrés.")
      router.refresh()
      reset(data)
    } catch (e) {
      if (e instanceof ApiClientError && e.code === "CONFLICT") {
        setError("slug", { message: e.message })
        return
      }
      if (e instanceof ApiClientError) {
        toast.error(e.message)
        return
      }
      toast.error("Une erreur est survenue.")
    }
  }

  const dirtyForm =
    isDirty ||
    logoUrl !== initial.store.logo_url ||
    bannerUrl !== initial.store.banner_url

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-10">
      <SettingsSection
        title="Informations générales"
        description="L’identité visuelle et les liens publics de votre boutique."
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-stripe-label">
              Nom de la boutique
            </Label>
            <Input
              {...register("name")}
              className="min-h-11 rounded-[4px] border-stripe-border"
              autoComplete="organization"
            />
            {errors.name ? (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-stripe-label">
              Lien de la boutique
            </Label>
            <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
              <span className="shrink-0 text-sm text-stripe-body">https://</span>
              <Input
                {...register("slug")}
                className="min-h-11 min-w-0 flex-1 rounded-[4px] border-stripe-border font-mono text-sm"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              <span className="shrink-0 text-sm text-stripe-body">
                .{initial.rootDomain}
              </span>
            </div>
            {errors.slug ? (
              <p className="text-sm text-red-600">{errors.slug.message}</p>
            ) : null}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-stripe-label">
                Logo de la marque
              </Label>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={onLogoPick}
              />
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                className="relative flex aspect-square w-full max-w-[120px] flex-col items-center justify-center gap-1 rounded-md border border-dashed border-stripe-border bg-stripe-canvas text-stripe-label transition-colors hover:border-stripe-purple-soft hover:bg-white"
              >
                {uploadingLogo ? (
                  <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
                ) : logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt=""
                    width={120}
                    height={120}
                    className="size-full rounded-md object-cover"
                  />
                ) : (
                  <>
                    <Camera className="h-6 w-6" aria-hidden />
                    <span className="text-xs font-medium">Modifier</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-stripe-label">
                Bannière de couverture
              </Label>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={onBannerPick}
              />
              <button
                type="button"
                onClick={() => bannerInputRef.current?.click()}
                disabled={uploadingBanner}
                className="relative flex aspect-[21/9] w-full max-w-2xl flex-col items-center justify-center overflow-hidden rounded-md border border-dashed border-stripe-border bg-stripe-canvas text-stripe-label transition-colors hover:border-stripe-purple-soft hover:bg-white"
              >
                {uploadingBanner ? (
                  <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
                ) : bannerUrl ? (
                  <Image
                    src={bannerUrl}
                    alt=""
                    width={896}
                    height={384}
                    className="absolute inset-0 size-full object-cover"
                  />
                ) : (
                  <ImageIcon
                    className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 opacity-40"
                    aria-hidden
                  />
                )}
                <span
                  className={cn(
                    "relative z-10 inline-flex items-center gap-2 rounded-md bg-white/90 px-3 py-2 text-sm font-medium text-stripe-heading shadow-sm",
                    bannerUrl ? "mt-auto mb-3" : ""
                  )}
                >
                  <ImageIcon className="h-4 w-4" aria-hidden />
                  Télécharger la bannière
                </span>
              </button>
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="WhatsApp"
        description="Le numéro utilisé par vos clients pour passer commande via WhatsApp."
      >
        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wide text-stripe-label">
            Numéro du marchand
          </Label>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[4px] border border-stripe-border bg-[#25D366]/10 text-[#25D366]"
              aria-hidden
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </span>
            <span className="flex h-11 shrink-0 items-center rounded-[4px] border border-stripe-border bg-stripe-canvas px-3 text-sm font-medium tabular-nums-stripe text-stripe-heading">
              +212
            </span>
            <Input
              {...register("whatsapp_national")}
              placeholder="612345678"
              className="min-h-11 min-w-0 flex-1 rounded-[4px] border-stripe-border"
              inputMode="numeric"
              autoComplete="tel-national"
            />
          </div>
          <p className="text-xs text-stripe-body">
            9 chiffres après +212 (ex. 612345678), sans le 0 initial.
          </p>
          {errors.whatsapp_national ? (
            <p className="text-sm text-red-600">
              {errors.whatsapp_national.message}
            </p>
          ) : null}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Zones de livraison"
        description="Configurez vos tarifs d’expédition par wilaya (région)."
      >
        <ShippingZonesSettings
          storeId={storeId}
          zones={initial.shipping_zones}
          wilayas={initial.wilayas}
        />
      </SettingsSection>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stripe-border bg-white/95 px-4 py-3 shadow-[0_-4px_12px_rgba(6,27,49,0.06)] backdrop-blur-sm sm:sticky sm:bottom-0 sm:bg-white/90">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 text-stripe-body hover:text-stripe-heading"
            disabled={!dirtyForm || isSubmitting}
            onClick={resetAll}
          >
            Annuler les modifications
          </Button>
          <Button
            type="submit"
            disabled={!dirtyForm || isSubmitting}
            className={cn(dashboardLinkPrimary, "min-h-11 border-0 shadow-sm")}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Enregistrement…
              </>
            ) : (
              "Enregistrer les paramètres"
            )}
          </Button>
        </div>
      </div>
    </form>
  )
}

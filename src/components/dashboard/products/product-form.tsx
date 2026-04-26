"use client"

import type { ReactNode } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Camera,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Mail,
  Trash2,
  X,
} from "lucide-react"
import { nanoid } from "nanoid"
import { apiFetch, ApiClientError } from "@/lib/api-client"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { CreateCategoryDialog } from "@/components/dashboard/products/inline-category-dialogs"
import { cn, formatPrice } from "@/lib/utils"
import {
  productFormSchema,
  type ProductFormInputSchema,
  type ProductFormSubmitSchema,
} from "@/lib/validations"
import type { CategoryWithCount } from "@/types"

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"])
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

type ProductFormInput = ProductFormInputSchema
type ProductFormSubmit = ProductFormSubmitSchema

type SignedUploadResponse = {
  bucket: string
  path: string
  signed_url: string
  token: string
  content_type: string
}

export interface ProductFormInitialValues {
  name: string
  description?: string | null
  category_id?: string | null
  base_price: number
  compare_price?: number | null
  images: string[]
  is_active: boolean
  is_featured: boolean
  slug?: string | null
  meta_title?: string | null
  meta_description?: string | null
}

interface ProductFormProps {
  mode: "create" | "edit"
  storeId: string
  productId?: string
  initialValues?: ProductFormInitialValues
  /** All available categories for this store (from RSC). */
  storeCategories?: CategoryWithCount[]
  /** Edit mode: shown in breadcrumb (e.g. product name). */
  breadcrumbLabel?: string
}

function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stripe-body"
    >
      {children}
    </label>
  )
}

function FormCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        "rounded-md border border-stripe-border bg-white p-5 shadow-stripe-card lg:p-6",
        className
      )}
    >
      {children}
    </section>
  )
}

function supabasePublicObjectUrl(bucket: string, objectPath: string) {
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
  if (file.type === "image/gif") return "gif"
  return "jpg"
}

async function uploadProductImage(file: File, storeId: string): Promise<string> {
  const mime = file.type && ALLOWED_IMAGE_TYPES.has(file.type) ? file.type : "image/jpeg"
  const relPath = `products/${nanoid()}.${fileExtension(file)}`

  const data = await apiFetch<SignedUploadResponse>("/api/upload", {
    method: "POST",
    body: JSON.stringify({
      store_id: storeId,
      bucket: "product-images",
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
    throw new Error("L'envoi du fichier a échoué.")
  }

  return supabasePublicObjectUrl(data.bucket, data.path)
}

async function uploadImagesWithConcurrency(
  files: File[],
  storeId: string,
  concurrency = 3
): Promise<string[]> {
  const size = Math.max(1, Math.min(concurrency, files.length))
  const uploaded: string[] = new Array(files.length)
  let index = 0

  async function worker() {
    while (index < files.length) {
      const current = index
      index += 1
      uploaded[current] = await uploadProductImage(files[current]!, storeId)
    }
  }

  await Promise.all(Array.from({ length: size }, () => worker()))
  return uploaded
}

export function ProductForm({
  mode,
  storeId,
  productId,
  initialValues,
  storeCategories = [],
  breadcrumbLabel,
}: ProductFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageUrls, setImageUrls] = useState<string[]>(() => initialValues?.images ?? [])
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [localCategories, setLocalCategories] = useState<CategoryWithCount[]>(storeCategories)
  const [uploading, setUploading] = useState(false)
  const [imagesError, setImagesError] = useState<string | null>(null)

  const defaultValues = useMemo<ProductFormInput>(
    () => ({
      name: initialValues?.name ?? "",
      description: initialValues?.description ?? "",
      category_id: initialValues?.category_id ?? null,
      base_price: initialValues?.base_price ?? 150,
      compare_price: initialValues?.compare_price ?? undefined,
      is_active: initialValues?.is_active ?? true,
      is_featured: initialValues?.is_featured ?? false,
      slug: initialValues?.slug ?? "",
      meta_title: initialValues?.meta_title ?? "",
      meta_description: initialValues?.meta_description ?? "",
    }),
    [initialValues]
  )

  const {
    register,
    handleSubmit,
    setError,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormInput, undefined, ProductFormSubmit>({
    resolver: zodResolver(productFormSchema),
    defaultValues,
  })

  const previewName = useWatch({ control, name: "name", defaultValue: "" })
  const previewPrice = useWatch({ control, name: "base_price", defaultValue: 150 })
  const isFeatured = useWatch({ control, name: "is_featured", defaultValue: false })

  useEffect(() => {
    setLocalCategories(storeCategories)
  }, [storeCategories])

  const trimmedBreadcrumb = breadcrumbLabel?.trim()
  const breadcrumbEnd =
    mode === "create"
      ? "Ajouter un produit"
      : trimmedBreadcrumb && trimmedBreadcrumb.length > 0
        ? trimmedBreadcrumb
        : "Modifier le produit"

  async function onFilesSelected(files: FileList | null) {
    if (!files?.length) return
    setImagesError(null)

    const list = [...files]
    for (const file of list) {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        setImagesError("Formats acceptés : JPEG, PNG, WebP, GIF.")
        return
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setImagesError("Chaque image doit faire au plus 5 Mo.")
        return
      }
    }

    setUploading(true)
    try {
      const urls = await uploadImagesWithConcurrency(list, storeId, 3)
      setImageUrls((prev) => [...prev, ...urls])
    } catch (e) {
      if (e instanceof ApiClientError) {
        toast.error(e.message || "Impossible d'envoyer l'image.")
      } else {
        toast.error(e instanceof Error ? e.message : "Impossible d'envoyer l'image.")
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function saveProduct(values: ProductFormSubmit, opts: { asDraft: boolean }) {
    setImagesError(null)
    const is_active = opts.asDraft ? false : values.is_active
    const needsImages = is_active === true
    if (needsImages && imageUrls.length === 0) {
      setImagesError("Ajoutez au moins une photo pour un produit actif.")
      return
    }

    const payload = {
      ...(mode === "create" ? { store_id: storeId } : {}),
      name: values.name,
      description: values.description?.trim() ? values.description.trim() : undefined,
      category_id: values.category_id ?? null,
      base_price: values.base_price,
      compare_price: values.compare_price ?? null,
      images: imageUrls,
      is_active,
      is_featured: values.is_featured,
      slug: values.slug?.trim() ? values.slug.trim() : undefined,
      meta_title: values.meta_title?.trim() ? values.meta_title.trim() : null,
      meta_description: values.meta_description?.trim() ? values.meta_description.trim() : null,
    }

    try {
      if (mode === "create") {
        await apiFetch("/api/products", {
          method: "POST",
          body: JSON.stringify(payload),
          redirectOnUnauthorized: true,
        })
        toast.success(opts.asDraft ? "Brouillon enregistré" : "Produit créé")
      } else if (productId) {
        await apiFetch(`/api/products/${productId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
          redirectOnUnauthorized: true,
        })
        toast.success(opts.asDraft ? "Brouillon enregistré" : "Produit mis à jour")
      }

      router.push(`/dashboard/products?store=${storeId}`)
    } catch (e) {
      if (e instanceof ApiClientError) {
        if (e.fields) {
          for (const [name, msg] of Object.entries(e.fields)) {
            if (name === "images") {
              setImagesError(msg)
              continue
            }
            if (name in defaultValues) {
              setError(name as keyof ProductFormInput, { message: msg })
            }
          }
        } else {
          toast.error(e.message || "Impossible d'enregistrer le produit.")
        }
      } else {
        toast.error("Une erreur inattendue s'est produite.")
      }
    }
  }

  return (
    <>
      <form
      onSubmit={handleSubmit((values) => void saveProduct(values, { asDraft: false }))}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <nav
            aria-label="Fil d'Ariane"
            className="flex flex-wrap items-center gap-1 text-xs font-medium uppercase tracking-wide text-stripe-body"
          >
            <Link
              href={`/dashboard/products?store=${storeId}`}
              className="hover:text-stripe-heading"
            >
              Catalogue
            </Link>
            <ChevronRight className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
            <span className="text-stripe-label">{breadcrumbEnd}</span>
          </nav>
          <h1 className="text-2xl font-medium tracking-tight text-stripe-heading">
            {mode === "create" ? "Ajouter un produit" : "Modifier le produit"}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:pt-1">
          <Button
            type="button"
            variant="ghost"
            className="h-11 text-stripe-body hover:text-stripe-heading"
            disabled={isSubmitting || uploading}
            onClick={handleSubmit((values) => void saveProduct(values, { asDraft: true }))}
          >
            {isSubmitting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
            Enregistrer comme brouillon
          </Button>
          <Button
            type="submit"
            className="h-11 min-w-[8.5rem] bg-stripe-purple text-white hover:bg-stripe-purple-hover"
            disabled={isSubmitting || uploading}
          >
            {isSubmitting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
            Enregistrer
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_min(100%,300px)] lg:items-start">
        <div className="space-y-6">
          <FormCard>
            <h2 className="text-base font-medium text-stripe-heading">
              Informations de base
            </h2>
            <div className="mt-5 space-y-5">
              <div>
                <FieldLabel htmlFor="name">Nom du produit</FieldLabel>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="ex : Veste en lin artisanal"
                  className="h-11 rounded-md border-stripe-border bg-white shadow-sm focus-visible:border-stripe-purple focus-visible:ring-stripe-purple/25"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
                )}
              </div>
              <div>
                <FieldLabel htmlFor="description">Description</FieldLabel>
                <textarea
                  id="description"
                  {...register("description")}
                  rows={4}
                  className="flex w-full rounded-md border border-stripe-border bg-white px-3 py-2.5 text-sm text-stripe-heading shadow-sm outline-none focus-visible:border-stripe-purple focus-visible:ring-2 focus-visible:ring-stripe-purple/25"
                  placeholder="Décrivez les matériaux, la coupe et l'histoire de ce produit…"
                />
                {errors.description && (
                  <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="base_price">Prix (MAD)</FieldLabel>
                  <Input
                    id="base_price"
                    type="number"
                    min={1}
                    {...register("base_price")}
                    placeholder="ex : 199"
                    className="h-11 rounded-md border-stripe-border bg-white shadow-sm focus-visible:border-stripe-purple focus-visible:ring-stripe-purple/25"
                  />
                  {errors.base_price && (
                    <p className="mt-1 text-xs text-red-600">{errors.base_price.message}</p>
                  )}
                </div>
                <div>
                  <FieldLabel htmlFor="slug">Référence produit</FieldLabel>
                  <Input
                    id="slug"
                    {...register("slug")}
                    placeholder="PROD-001"
                    className="h-11 rounded-md border-stripe-border bg-white shadow-sm focus-visible:border-stripe-purple focus-visible:ring-stripe-purple/25"
                  />
                  <p className="mt-1 text-xs text-stripe-body">
                    Utilisée pour l&apos;adresse du produit sur votre boutique (lettres minuscules et
                    tirets).
                  </p>
                  {errors.slug && (
                    <p className="mt-1 text-xs text-red-600">{errors.slug.message}</p>
                  )}
                </div>
              </div>
            </div>
          </FormCard>

          <FormCard>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-medium text-stripe-heading">Photos</h2>
              <span className="text-xs font-medium uppercase tracking-wide text-stripe-body">
                Max 5 Mo / image
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="sr-only"
              id="product-images"
              disabled={uploading || isSubmitting}
              onChange={(e) => void onFilesSelected(e.target.files)}
            />
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <button
                type="button"
                disabled={uploading || isSubmitting}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-stripe-border bg-stripe-canvas/40 text-center transition-colors",
                  "hover:border-stripe-purple-soft hover:bg-stripe-purple-muted/20",
                  "disabled:pointer-events-none disabled:opacity-50"
                )}
              >
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-stripe-purple" />
                ) : (
                  <Camera className="h-8 w-8 text-stripe-purple" />
                )}
                <span className="px-2 text-xs font-medium text-stripe-heading">
                  Ajouter une photo
                </span>
              </button>
              {imageUrls.map((url) => (
                <div
                  key={url}
                  className="relative aspect-square overflow-hidden rounded-md border border-stripe-border bg-stripe-canvas shadow-sm"
                >
                  <Image
                    src={url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, 33vw"
                  />
                  <button
                    type="button"
                    className="absolute end-1.5 top-1.5 inline-flex h-9 w-9 items-center justify-center rounded-md border border-stripe-border bg-white/95 text-stripe-heading shadow-sm backdrop-blur-sm transition-colors hover:bg-red-50 hover:text-red-600"
                    aria-label="Retirer cette photo"
                    disabled={uploading || isSubmitting}
                    onClick={() => {
                      setImageUrls((prev) => prev.filter((u) => u !== url))
                      setImagesError(null)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            {imagesError && (
              <p className="mt-3 text-xs text-red-600">{imagesError}</p>
            )}
            <p className="mt-3 text-xs text-stripe-body">
              JPEG, PNG, WebP ou GIF. Les brouillons peuvent être enregistrés sans photo.
            </p>
          </FormCard>

          <FormCard>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-medium text-stripe-heading">
                Tailles et couleurs
              </h2>
              {mode === "edit" && productId ? (
                <Link
                  href={`/dashboard/products/${productId}/variants?store=${storeId}`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "text-stripe-purple"
                  )}
                >
                  Gérer les déclinaisons
                </Link>
              ) : (
                <span className="text-xs font-semibold uppercase tracking-wide text-stripe-purple">
                  Après enregistrement
                </span>
              )}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-stripe-body">
              {mode === "edit" && productId
                ? "Ajoutez une déclinaison par combinaison (taille, couleur, stock) pour la vente."
                : "Une fois le produit enregistré, vous pourrez configurer les déclinaisons depuis la fiche produit."}
            </p>
            {mode === "edit" && productId ? (
              <Link
                href={`/dashboard/products/${productId}/variants?store=${storeId}`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "default" }),
                  "mt-4 flex h-11 w-full items-center justify-center border-stripe-border"
                )}
              >
                Ouvrir les déclinaisons
              </Link>
            ) : (
              <div className="mt-4 rounded-md border border-dashed border-stripe-border bg-stripe-canvas/50 px-4 py-6 text-center text-sm text-stripe-body">
                Les tailles et couleurs se configurent après la création du produit.
              </div>
            )}
          </FormCard>

          <Accordion
            defaultValue={[]}
            className="rounded-md border border-stripe-border bg-white shadow-stripe-card"
          >
            <AccordionItem value="advanced" className="border-0 px-5">
              <AccordionTrigger className="py-4 text-base font-medium text-stripe-heading hover:no-underline">
                Options avancées
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pb-5">
                <div>
                  <FieldLabel htmlFor="compare_price">Prix barré (MAD)</FieldLabel>
                  <Input
                    id="compare_price"
                    type="number"
                    min={1}
                    {...register("compare_price")}
                    className="h-11 rounded-md border-stripe-border"
                  />
                  {errors.compare_price && (
                    <p className="mt-1 text-xs text-red-600">{errors.compare_price.message}</p>
                  )}
                </div>
                <div>
                  <FieldLabel htmlFor="meta_title">Titre SEO (optionnel)</FieldLabel>
                  <Input id="meta_title" {...register("meta_title")} className="h-11 rounded-md border-stripe-border" />
                  {errors.meta_title && (
                    <p className="mt-1 text-xs text-red-600">{errors.meta_title.message}</p>
                  )}
                </div>
                <div>
                  <FieldLabel htmlFor="meta_description">Description SEO (optionnel)</FieldLabel>
                  <Input
                    id="meta_description"
                    {...register("meta_description")}
                    className="h-11 rounded-md border-stripe-border"
                  />
                  {errors.meta_description && (
                    <p className="mt-1 text-xs text-red-600">{errors.meta_description.message}</p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <div className="space-y-4 lg:sticky lg:top-4">
          <FormCard className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-stripe-body">
              Statut
            </p>
            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={() => field.onChange(true)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md border px-3 py-3 text-left text-sm transition-colors",
                      field.value
                        ? "border-stripe-purple bg-stripe-purple-muted/25 ring-2 ring-stripe-purple/20"
                        : "border-stripe-border bg-white hover:bg-stripe-canvas/80"
                    )}
                  >
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-stripe-success" />
                    <span className="font-medium text-stripe-heading">Actif</span>
                    <span
                      className={cn(
                        "ms-auto flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                        field.value
                          ? "border-stripe-purple bg-stripe-purple"
                          : "border-stripe-border bg-white"
                      )}
                      aria-hidden
                    >
                      {field.value ? (
                        <span className="block h-1.5 w-1.5 rounded-full bg-white" />
                      ) : null}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => field.onChange(false)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md border px-3 py-3 text-left text-sm transition-colors",
                      !field.value
                        ? "border-stripe-purple bg-stripe-purple-muted/25 ring-2 ring-stripe-purple/20"
                        : "border-stripe-border bg-white hover:bg-stripe-canvas/80"
                    )}
                  >
                    <Mail className="h-5 w-5 shrink-0 text-stripe-body" />
                    <span className="font-medium text-stripe-heading">Brouillon</span>
                    <span
                      className={cn(
                        "ms-auto flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                        !field.value
                          ? "border-stripe-purple bg-stripe-purple"
                          : "border-stripe-border bg-white"
                      )}
                      aria-hidden
                    >
                      {!field.value ? (
                        <span className="block h-1.5 w-1.5 rounded-full bg-white" />
                      ) : null}
                    </span>
                  </button>
                </div>
              )}
            />
          </FormCard>

          <FormCard className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-stripe-body">
              Catégorie
            </p>
            <Controller
              name="category_id"
              control={control}
              render={({ field }) => (
                <div className="mt-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs text-stripe-body">
                      Choisissez une catégorie ou ajoutez-en une nouvelle.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-md border-stripe-border text-xs"
                      onClick={() => setCategoryDialogOpen(true)}
                    >
                      + Ajouter
                    </Button>
                  </div>
                  <select
                    id="product-category-id"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                    onBlur={field.onBlur}
                    className="h-11 w-full rounded-md border border-stripe-border bg-white px-3 text-sm text-stripe-heading shadow-sm focus:border-stripe-purple focus:outline-none focus:ring-2 focus:ring-stripe-purple/25"
                  >
                    <option value="">— Aucune catégorie —</option>
                    {localCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {errors.category_id && (
                    <p className="mt-1 text-xs text-red-600">{errors.category_id.message}</p>
                  )}
                </div>
              )}
            />
          </FormCard>

          <FormCard className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-stripe-body">
              Visibilité catalogue
            </p>
            <p className="mt-1 text-sm text-stripe-body">
              <span className="font-medium text-stripe-heading">Mettre en avant</span> — le produit
              ressort en premier sur la page d&apos;accueil de votre boutique.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {isFeatured ? (
                <button
                  type="button"
                  onClick={() => setValue("is_featured", false)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-900 transition-colors hover:bg-blue-100"
                >
                  Produit à la une
                  <X className="h-3.5 w-3.5 shrink-0" aria-hidden />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setValue("is_featured", true)}
                  className="text-xs font-semibold text-stripe-purple hover:underline"
                >
                  + Activer « à la une »
                </button>
              )}
            </div>
          </FormCard>

          <div className="overflow-hidden rounded-md border border-stripe-border bg-stripe-heading shadow-stripe-card">
            <p className="border-b border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white/70">
              Aperçu boutique
            </p>
            <div className="p-4">
              <div className="relative mx-auto aspect-square w-full max-w-[200px] overflow-hidden rounded-md bg-stripe-label/30">
                {imageUrls[0] ? (
                  <Image
                    src={imageUrls[0]}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="200px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-white/50">
                    Photo
                  </div>
                )}
              </div>
              <p className="mt-3 truncate text-center text-sm font-semibold text-white">
                {previewName?.trim() || "Nom du produit…"}
              </p>
              <p className="mt-1 text-center text-sm text-white/60 tabular-nums-stripe">
                {formatPrice(
                  typeof previewPrice === "number" && !Number.isNaN(previewPrice)
                    ? previewPrice
                    : 0
                )}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            className="h-11 w-full text-stripe-body hover:text-stripe-heading"
            onClick={() => router.push(`/dashboard/products?store=${storeId}`)}
          >
            Annuler
          </Button>
        </div>
      </div>
      </form>
      <CreateCategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        storeId={storeId}
        onCreated={(category) => {
          setLocalCategories((prev) => {
            if (prev.some((c) => c.id === category.id)) return prev
            return [...prev, category].sort((a, b) => a.name.localeCompare(b.name, "fr"))
          })
          setValue("category_id", category.id)
        }}
      />
    </>
  )
}

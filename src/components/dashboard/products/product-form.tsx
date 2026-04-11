"use client"

import { useMemo, useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Trash2, Upload } from "lucide-react"
import { nanoid } from "nanoid"
import { z } from "zod"
import { apiFetch, ApiClientError } from "@/lib/api-client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"])
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const productFormSchema = z
  .object({
    name: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(200),
    description: z.string().max(2000).optional(),
    category: z.string().max(100).optional(),
    base_price: z.coerce
      .number()
      .int("Le prix doit être un nombre entier")
      .min(1, "Le prix doit être supérieur à 0")
      .max(100000, "Prix trop élevé"),
    compare_price: z
      .preprocess(
        (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
        z.number().int().min(1).optional()
      )
      .optional(),
    is_active: z.boolean().default(true),
    is_featured: z.boolean().default(false),
    slug: z.string().max(80).optional(),
    meta_title: z.string().max(60).optional(),
    meta_description: z.string().max(160).optional(),
  })
  .refine(
    (data) =>
      data.compare_price === undefined || data.compare_price === null || data.compare_price > data.base_price,
    { message: "Le prix barré doit être supérieur au prix de vente", path: ["compare_price"] }
  )

type ProductFormInput = z.input<typeof productFormSchema>
type ProductFormSubmit = z.output<typeof productFormSchema>

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
  category?: string | null
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

export function ProductForm({
  mode,
  storeId,
  productId,
  initialValues,
}: ProductFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageUrls, setImageUrls] = useState<string[]>(() => initialValues?.images ?? [])
  const [uploading, setUploading] = useState(false)
  const [imagesError, setImagesError] = useState<string | null>(null)

  const defaultValues = useMemo<ProductFormInput>(
    () => ({
      name: initialValues?.name ?? "",
      description: initialValues?.description ?? "",
      category: initialValues?.category ?? "",
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
    formState: { errors, isSubmitting },
  } = useForm<ProductFormInput, undefined, ProductFormSubmit>({
    resolver: zodResolver(productFormSchema),
    defaultValues,
  })

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
      const urls: string[] = []
      for (const file of list) {
        const url = await uploadProductImage(file, storeId)
        urls.push(url)
      }
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

  async function onSubmit(values: ProductFormSubmit) {
    setImagesError(null)
    if (imageUrls.length === 0) {
      setImagesError("Ajoutez au moins une photo.")
      return
    }

    const payload = {
      ...(mode === "create" ? { store_id: storeId } : {}),
      name: values.name,
      description: values.description?.trim() ? values.description.trim() : undefined,
      category: values.category?.trim() ? values.category.trim() : undefined,
      base_price: values.base_price,
      compare_price: values.compare_price ?? null,
      images: imageUrls,
      is_active: values.is_active,
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
        toast.success("Produit créé")
      } else if (productId) {
        await apiFetch(`/api/products/${productId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
          redirectOnUnauthorized: true,
        })
        toast.success("Produit mis à jour")
      }

      router.push(`/dashboard/products?store=${storeId}`)
      router.refresh()
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="name">Nom du produit</Label>
          <Input id="name" {...register("name")} placeholder="T-shirt Oversize" />
          {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="base_price">Prix (MAD)</Label>
          <Input id="base_price" type="number" min={1} {...register("base_price")} />
          {errors.base_price && (
            <p className="text-xs text-red-600">{errors.base_price.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="compare_price">Prix barré (MAD)</Label>
          <Input id="compare_price" type="number" min={1} {...register("compare_price")} />
          {errors.compare_price && (
            <p className="text-xs text-red-600">{errors.compare_price.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Catégorie</Label>
          <Input id="category" {...register("category")} placeholder="Homme, Femme, Accessoires..." />
          {errors.category && <p className="text-xs text-red-600">{errors.category.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Slug (optionnel)</Label>
          <Input id="slug" {...register("slug")} placeholder="t-shirt-oversize" />
          {errors.slug && <p className="text-xs text-red-600">{errors.slug.message}</p>}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            {...register("description")}
            rows={4}
            className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            placeholder="Décrivez votre produit..."
          />
          {errors.description && (
            <p className="text-xs text-red-600">{errors.description.message}</p>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Photos</Label>
          <p className="text-xs text-muted-foreground">
            JPEG, PNG, WebP ou GIF, jusqu&apos;à 5 Mo par fichier. Les images sont enregistrées dans votre
            espace de stockage.
          </p>
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
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11"
              disabled={uploading || isSubmitting}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="me-2 h-4 w-4" />
              )}
              Ajouter des photos
            </Button>
          </div>
          {imagesError && <p className="text-xs text-red-600">{imagesError}</p>}
          {imageUrls.length > 0 ? (
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {imageUrls.map((url) => (
                <li
                  key={url}
                  className="relative aspect-square overflow-hidden rounded-lg border bg-muted"
                >
                  <Image
                    src={url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                  <button
                    type="button"
                    className="absolute end-1 top-1 inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background/90 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-destructive hover:text-destructive-foreground"
                    aria-label="Retirer cette photo"
                    disabled={uploading || isSubmitting}
                    onClick={() => {
                      setImageUrls((prev) => prev.filter((u) => u !== url))
                      setImagesError(null)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="meta_title">Meta title (optionnel)</Label>
          <Input id="meta_title" {...register("meta_title")} />
          {errors.meta_title && (
            <p className="text-xs text-red-600">{errors.meta_title.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="meta_description">Meta description (optionnel)</Label>
          <Input id="meta_description" {...register("meta_description")} />
          {errors.meta_description && (
            <p className="text-xs text-red-600">{errors.meta_description.message}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("is_active")} />
          Produit actif
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("is_featured")} />
          Mettre en avant
        </label>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting || uploading}>
          {isSubmitting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
          {mode === "create" ? "Créer le produit" : "Enregistrer"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/dashboard/products?store=${storeId}`)}
        >
          Annuler
        </Button>
      </div>
    </form>
  )
}

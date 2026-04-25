"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MoreVertical, Plus, SlidersHorizontal } from "lucide-react"
import type { StoreAttributeDefinitionWithValues } from "@/lib/server/catalog"
import type { AttributeDisplayType } from "@/types"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import {
  AddAttributeValueDialog,
  NewAttributeOptionDialog,
} from "@/components/dashboard/products/inline-attribute-dialogs"

const DISPLAY_TYPE_LABEL: Record<AttributeDisplayType, string> = {
  select: "Liste",
  color_swatch: "Couleur",
  button: "Boutons",
  text: "Texte",
}

function coerceDisplayType(raw: string): AttributeDisplayType {
  if (raw === "color_swatch" || raw === "button" || raw === "text") return raw
  return "select"
}

function DefinitionPreview({
  displayType,
  values,
}: {
  displayType: AttributeDisplayType
  values: StoreAttributeDefinitionWithValues["values"]
}) {
  const maxPreview = 4
  const slice = values.slice(0, maxPreview)
  const rest = values.length - slice.length

  if (displayType === "color_swatch") {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {slice.map((v) => (
          <span
            key={v.id}
            title={v.label}
            className="h-6 w-6 shrink-0 rounded-full border border-stripe-border"
            style={{
              backgroundColor: v.color_hex?.trim() ? v.color_hex : "var(--stripe-canvas, #f6f8fa)",
            }}
          />
        ))}
        {rest > 0 ? (
          <span className="text-xs font-medium text-stripe-body">+{rest}</span>
        ) : null}
      </div>
    )
  }

  if (displayType === "button" || displayType === "select") {
    return (
      <div className="flex flex-wrap gap-1">
        {slice.map((v) => (
          <span
            key={v.id}
            className="inline-flex max-w-[72px] truncate rounded-md border border-stripe-border bg-stripe-canvas/60 px-2 py-0.5 text-xs font-medium text-stripe-heading"
          >
            {v.label}
          </span>
        ))}
        {rest > 0 ? (
          <span className="inline-flex items-center rounded-md border border-dashed border-stripe-border px-2 py-0.5 text-xs text-stripe-body">
            +{rest}
          </span>
        ) : null}
      </div>
    )
  }

  const joined = values.map((v) => v.label).join(", ")
  const truncated = joined.length > 72 ? `${joined.slice(0, 72)}…` : joined || "—"
  return <p className="line-clamp-2 text-xs leading-relaxed text-stripe-body">{truncated}</p>
}

export function AttributeDefinitionsSection({
  storeId,
  definitions,
  usageByDefinitionId,
}: {
  storeId: string
  definitions: StoreAttributeDefinitionWithValues[]
  usageByDefinitionId: Record<string, number>
}) {
  const router = useRouter()
  const [newOpen, setNewOpen] = useState(false)
  const [addFor, setAddFor] = useState<{ id: string; name: string } | null>(null)

  function onMutated() {
    router.refresh()
  }

  return (
    <div className="rounded-xl border border-stripe-border bg-white p-4 shadow-stripe-card sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-stripe-purple/10 text-stripe-purple">
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-stripe-heading">Options du catalogue</h2>
            <p className="text-xs text-stripe-body">
              Partagées entre vos produits (taille, couleur, etc.)
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="h-auto min-h-11 px-2 text-sm font-medium text-stripe-purple hover:bg-stripe-purple/5 hover:text-stripe-purple"
          onClick={() => setNewOpen(true)}
        >
          + Nouvelle option
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {definitions.map((def) => {
          const dt = coerceDisplayType(def.display_type)
          const typeLabel = DISPLAY_TYPE_LABEL[dt]
          const nValues = def.values.length
          const used = usageByDefinitionId[def.id] ?? 0

          return (
            <article
              key={def.id}
              className="relative flex flex-col rounded-lg border border-stripe-border bg-stripe-canvas/30 p-4 pe-11"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-stripe-label">
                  {typeLabel}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    type="button"
                    className={cn(
                      "absolute end-2 top-3 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-stripe-body transition-colors",
                      "hover:bg-stripe-canvas hover:text-stripe-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stripe-purple/25"
                    )}
                    aria-label={`Actions pour ${def.name}`}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem
                      onSelect={() => setAddFor({ id: def.id, name: def.name })}
                    >
                      Ajouter une valeur
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault()
                        document
                          .getElementById("declinaisons")
                          ?.scrollIntoView({ behavior: "smooth", block: "start" })
                      }}
                    >
                      Voir les déclinaisons
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <h3 className="text-base font-semibold text-stripe-heading">{def.name}</h3>
              <div className="mt-3 min-h-[2rem] flex-1">
                <DefinitionPreview displayType={dt} values={def.values} />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-stripe-border/80 pt-3 text-xs text-stripe-body">
                <span>
                  {nValues} valeur{nValues > 1 ? "s" : ""}
                </span>
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-900">
                  {used} déclinaison{used > 1 ? "s" : ""} dans la boutique
                </span>
              </div>
            </article>
          )
        })}

        <button
          type="button"
          onClick={() => setNewOpen(true)}
          className={cn(
            "flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-stripe-border bg-white/60 p-4 text-center transition-colors",
            "hover:border-stripe-purple/40 hover:bg-stripe-purple/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stripe-purple/25"
          )}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-stripe-border bg-stripe-canvas text-stripe-heading">
            <Plus className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-sm font-medium text-stripe-heading">Nouvelle option</span>
          <span className="max-w-[200px] text-xs text-stripe-body">
            Ex. Taille, Couleur — utilisée sur plusieurs produits
          </span>
        </button>
      </div>

      <NewAttributeOptionDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        storeId={storeId}
        onCreated={onMutated}
      />
      {addFor ? (
        <AddAttributeValueDialog
          key={addFor.id}
          open
          onOpenChange={(o) => {
            if (!o) setAddFor(null)
          }}
          definitionId={addFor.id}
          definitionName={addFor.name}
          onAdded={() => {
            setAddFor(null)
            onMutated()
          }}
        />
      ) : null}
    </div>
  )
}

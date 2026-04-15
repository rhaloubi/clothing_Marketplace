"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, User } from "lucide-react"
import { dashboardLinkPrimary } from "@/components/dashboard/dashboard-page"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiClientError, apiFetch } from "@/lib/api-client"
import {
  profileSettingsFormSchema,
  type ProfileSettingsFormInput,
} from "@/lib/validations"
import type { MerchantProfile } from "@/types"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

function normalizePhoneForApi(phone: string): string | null {
  const t = phone.replace(/\s/g, "")
  if (t === "") return null
  return t.startsWith("0") ? `+212${t.slice(1)}` : t
}

type ProfileRow = Pick<
  MerchantProfile,
  "full_name" | "phone" | "id"
>

export function ProfilePersonalForm({
  email,
  profile,
}: {
  email: string
  profile: ProfileRow
}) {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileSettingsFormInput>({
    resolver: zodResolver(profileSettingsFormSchema),
    defaultValues: {
      full_name: profile.full_name,
      phone: profile.phone ?? "",
    },
  })

  useEffect(() => {
    reset({
      full_name: profile.full_name,
      phone: profile.phone ?? "",
    })
  }, [profile.full_name, profile.phone, reset])

  async function onSubmit(data: ProfileSettingsFormInput) {
    try {
      await apiFetch("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          full_name: data.full_name,
          phone: normalizePhoneForApi(data.phone),
        }),
        redirectOnUnauthorized: true,
      })
      toast.success("Profil enregistré.")
      router.refresh()
      reset(data)
    } catch (e) {
      toast.error(
        e instanceof ApiClientError ? e.message : "Enregistrement impossible."
      )
    }
  }

  return (
    <section className="rounded-md border border-stripe-border bg-white p-4 shadow-stripe-card sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-stripe-purple-muted/40 text-stripe-purple">
          <User className="h-4 w-4" aria-hidden />
        </div>
        <h2 className="text-base font-semibold text-stripe-heading">
          Informations personnelles
        </h2>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wide text-stripe-label">
            Nom complet
          </Label>
          <Input
            {...register("full_name")}
            className="min-h-11 rounded-[4px] border-stripe-border"
            autoComplete="name"
          />
          {errors.full_name ? (
            <p className="text-sm text-red-600">{errors.full_name.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wide text-stripe-label">
            E-mail professionnel
          </Label>
          <Input
            readOnly
            value={email}
            className="min-h-11 rounded-[4px] border-stripe-border bg-stripe-canvas text-stripe-body"
            aria-readonly
          />
          <p className="text-xs text-stripe-body">
            L’e-mail de connexion ne peut pas être modifié ici pour le moment.
          </p>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wide text-stripe-label">
            Téléphone
          </Label>
          <Input
            {...register("phone")}
            placeholder="+212 ou 0… + 9 chiffres"
            className="min-h-11 rounded-[4px] border-stripe-border"
            inputMode="tel"
            autoComplete="tel"
          />
          {errors.phone ? (
            <p className="text-sm text-red-600">{errors.phone.message}</p>
          ) : null}
        </div>
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={!isDirty || isSubmitting}
            className={cn(dashboardLinkPrimary, "min-h-11 border-0")}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Enregistrement…
              </>
            ) : (
              "Enregistrer les modifications"
            )}
          </Button>
        </div>
      </form>
    </section>
  )
}

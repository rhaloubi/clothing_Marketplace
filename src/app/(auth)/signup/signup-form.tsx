"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { signupSchema, type SignupInput } from "@/lib/validations"
import { apiFetch, ApiClientError } from "@/lib/api-client"
import { toast } from "sonner"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export function SignupForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  })

  async function onSubmit(values: SignupInput) {
    try {
      await apiFetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(values),
      })
      toast.success("Compte créé avec succès !")
      router.push("/dashboard")
    } catch (e) {
      if (e instanceof ApiClientError) {
        if (e.fields) {
          for (const [name, msg] of Object.entries(e.fields)) {
            setError(name as keyof SignupInput, { message: msg })
          }
        } else if (e.code === "CONFLICT") {
          setError("email", {
            message: "Un compte existe déjà avec cet email.",
          })
        } else {
          toast.error("Une erreur est survenue. Réessayez.")
        }
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Full Name Field */}
      <div className="space-y-2">
        <Label
          htmlFor="full_name"
          className="label-tracking block text-[10px] font-semibold uppercase text-primary-fixed"
        >
          Nom complet
        </Label>
        <Input
          id="full_name"
          type="text"
          placeholder="Votre nom"
          autoComplete="name"
          aria-invalid={!!errors.full_name}
          className="liquid-input h-12 w-full rounded-lg border-none px-4 text-on-surface placeholder:text-outline outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-secondary/20"
          {...register("full_name")}
        />
        {errors.full_name && (
          <p className="text-xs text-error">{errors.full_name.message}</p>
        )}
      </div>

      {/* Email Field */}
      <div className="space-y-2">
        <Label
          htmlFor="email"
          className="label-tracking block text-[10px] font-semibold uppercase text-primary-fixed"
        >
          Adresse Email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="vous@exemple.com"
          autoComplete="email"
          aria-invalid={!!errors.email}
          className="liquid-input h-12 w-full rounded-lg border-none px-4 text-on-surface placeholder:text-outline outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-secondary/20"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-error">{errors.email.message}</p>
        )}
      </div>

      {/* Password Field */}
      <div className="space-y-2">
        <Label
          htmlFor="password"
          className="label-tracking block text-[10px] font-semibold uppercase text-primary-fixed"
        >
          Mot de passe
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Min. 8 caractères, 1 majuscule, 1 chiffre"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            className="liquid-input h-12 w-full rounded-lg border-none px-4 text-on-surface placeholder:text-outline outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-secondary/20"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-error">{errors.password.message}</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-4 pt-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="primary-gradient liquid-shine flex h-12 w-full items-center justify-center rounded-lg font-medium text-on-primary-container transition-all duration-200 hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          Créer mon compte
        </Button>
      </div>
    </form>
  )
}

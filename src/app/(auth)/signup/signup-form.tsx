"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { signupSchema, type SignupInput } from "@/lib/validations"
import { apiFetch, ApiClientError } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export function SignupForm() {
  const router = useRouter()

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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="full_name">Nom complet</Label>
        <Input
          id="full_name"
          type="text"
          placeholder="Votre nom"
          autoComplete="name"
          aria-invalid={!!errors.full_name}
          {...register("full_name")}
        />
        {errors.full_name && (
          <p className="text-xs text-destructive">{errors.full_name.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="vous@exemple.com"
          autoComplete="email"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          type="password"
          placeholder="Min. 8 caractères, 1 majuscule, 1 chiffre"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
        Créer mon compte
      </Button>
    </form>
  )
}

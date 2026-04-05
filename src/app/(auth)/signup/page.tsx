import Link from "next/link"
import { SignupForm } from "./signup-form"

export const metadata = {
  title: "Créer un compte — Shri",
}

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Créer un compte</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Lancez votre boutique en quelques minutes
          </p>
        </div>
        <SignupForm />
        <p className="text-center text-sm text-muted-foreground">
          Déjà un compte ?{" "}
          <Link href="/login" className="font-medium underline underline-offset-4">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}

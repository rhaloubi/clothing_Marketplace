import Link from "next/link"
import { LoginForm } from "./login-form"

export const metadata = {
  title: "Connexion — Shri",
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Connexion</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Accédez à votre espace marchand
          </p>
        </div>
        <LoginForm />
        <p className="text-center text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link href="/signup" className="font-medium underline underline-offset-4">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  )
}

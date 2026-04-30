import Link from "next/link"
import Image from "next/image"
import { Suspense } from "react"
import { LoginForm } from "./login-form"

export const metadata = {
  title: "Connexion — Shri",
}

export default function LoginPage() {
  return (
    <div className="liquid-bg relative flex min-h-screen flex-col selection:bg-secondary-container selection:text-on-secondary-container">
      <div className="liquid-orb absolute -top-24 -left-16 h-72 w-72 bg-white/80" />
      <div className="liquid-orb absolute top-20 right-4 h-64 w-64 bg-secondary/20" />
      <div className="liquid-orb absolute bottom-12 left-1/2 h-52 w-52 -translate-x-1/2 bg-white/70" />
      <main className="flex flex-grow items-center justify-center px-4 py-20">
        <div className="relative z-10 flex w-full max-w-[440px] flex-col gap-12">
          {/* Branding/Intro */}
          <div className="space-y-4 text-center">
            <h1 className="display-lg text-4xl font-bold text-on-surface">
              Bon retour
            </h1>
            <p className="font-light text-on-surface-variant">
              Accédez à votre espace marchand.
            </p>
          </div>

          {/* Login Card */}
          <div className="liquid-card liquid-shine rounded-lg p-8">
            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>
          </div>

          {/* Footer Link */}
          <div className="text-center">
            <p className="text-sm text-on-surface-variant">
              Pas encore de compte ?
              <Link
                href="/signup"
                className="ml-1 font-semibold text-secondary underline-offset-4 hover:underline"
              >
                Créer un compte
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Imagery Decoration (Subtle background textures) */}
      <div className="pointer-events-none fixed right-0 top-0 -z-10 h-full w-1/3 opacity-25 relative">
        <Image
          alt="Minimalist abstract render with flowing silk textures in monochromatic tones and soft shadows"
          className="object-cover"
          fill
          sizes="33vw"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuA38zljxdSfvP6_jjDTr0f2VtToae_hPYH2Uc9zHi0z0rgGf4mTNj4X2apRtBox5VH6-3l3In3Nx82FGEYLJ2ablVf6CTtNsP7eiQFqBhlnDLHFNjU-ACy77DelZOp9Z8e8nEr18a_a2v3OyOMSYTrAlfajJ2Kz64QSKV4r9e2vnvGaI3A6VmzWVuLWDHqWUWgkKQyMniYiQHpltdon6bjqvTBSEEuMZWF44uHTabh8cPjfq0PBNMcPrW-cKt1PYytnufvkXrCDe3Q"
        />
      </div>
    </div>
  )
}

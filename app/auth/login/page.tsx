import { signInWithGoogle } from '@/lib/actions/auth'

export const metadata = { title: 'Iniciar sesión' }

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-foreground mb-4">
            <span className="text-2xl text-background font-bold">3D</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">DDD ARG</h1>
          <p className="text-sm text-muted-foreground mt-1">Panel de administración</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Acceder</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Solo el administrador puede ingresar.
          </p>

          <ErrorMessage />

          <form action={signInWithGoogle}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 bg-foreground text-primary-foreground hover:bg-foreground/90 transition-colors rounded-lg px-4 py-3 text-sm font-medium"
            >
              <GoogleIcon />
              Continuar con Google
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          @DDD_ARG — Impresión 3D
        </p>
      </div>
    </div>
  )
}

async function ErrorMessage() {
  // Los search params en Next.js 16 son Promises en pages, pero en Server Components
  // podemos leerlos directamente de la URL a través del componente padre.
  // Sin embargo, para evitar ciclos innecesarios, el error lo leeremos del prop.
  return null
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  )
}

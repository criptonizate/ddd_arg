'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { saveMyProfile, type UserProfile } from '@/lib/actions/perfil'
import { signOutCliente } from '@/lib/actions/auth'
import { CheckCircle2, Pencil, LogOut, Gift } from 'lucide-react'

interface Props {
  nombre: string
  email: string
  avatarUrl: string | null
  profile: UserProfile | null
}

export default function PerfilTab({ nombre, email, avatarUrl, profile: initialProfile }: Props) {
  const [imgError, setImgError] = useState(false)
  const [editing, setEditing] = useState(false)
  const [apodo, setApodo] = useState(initialProfile?.apodo ?? '')
  const [telefono, setTelefono] = useState(initialProfile?.telefono ?? '')
  const [dni, setDni] = useState(initialProfile?.dni ?? '')
  const [sexo, setSexo] = useState<'M' | 'F' | 'otro' | ''>(initialProfile?.sexo ?? '')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (savedTimerRef.current) clearTimeout(savedTimerRef.current) }, [])

  function handleSave() {
    setError('')
    startTransition(async () => {
      const result = await saveMyProfile({
        numero_cliente: initialProfile?.numero_cliente ?? null,
        apodo: apodo || null,
        telefono: telefono || null,
        dni: dni || null,
        sexo: sexo || null,
      })
      if (result.error) { setError(result.error); return }
      setEditing(false)
      setSaved(true)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSaved(false), 3000)
    })
  }

  function handleCancel() {
    setApodo(initialProfile?.apodo ?? '')
    setTelefono(initialProfile?.telefono ?? '')
    setDni(initialProfile?.dni ?? '')
    setSexo(initialProfile?.sexo ?? '')
    setEditing(false)
    setError('')
  }

  const inputCls = "w-full text-base border border-border rounded-xl px-3.5 py-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-green-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
  const labelCls = "text-xs font-semibold text-muted-foreground block mb-1.5"

  // Perfil sin ningún dato = aún no reclamó los 20 pts; incompleto = tiene algo pero falta
  const perfilVirgen = !initialProfile?.telefono && !initialProfile?.dni && !initialProfile?.apodo
  const perfilFaltante = !initialProfile?.telefono || !initialProfile?.dni
  const inicial = (nombre?.trim()?.[0] ?? '?').toUpperCase()

  return (
    <div className="space-y-6">

      {/* Banner incentivo: +20 pts solo si todavía no reclamó, o invitación suave si falta algo */}
      {perfilVirgen && !editing ? (
        <div className="rounded-2xl border p-4 flex items-center gap-3" style={{ backgroundColor: 'oklch(0.22 0.04 60)', borderColor: '#d97706' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(217,119,6,0.25)' }}>
            <Gift size={18} style={{ color: '#fcd34d' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: '#f0fdf4' }}>Completá tu perfil y ganá <span style={{ color: '#fcd34d' }}>+20 🪙 pts</span></p>
            <p className="text-xs mt-0.5" style={{ color: '#86efac' }}>Nos ayuda a contactarte más rápido con tus pedidos.</p>
          </div>
        </div>
      ) : perfilFaltante && !editing ? (
        <div className="rounded-2xl border border-border bg-secondary/40 p-3 flex items-center gap-2.5">
          <span className="text-amber-500 text-sm">💡</span>
          <p className="text-xs text-muted-foreground flex-1">
            Agregá tu <strong className="text-foreground">{!initialProfile?.telefono ? 'teléfono' : 'DNI'}</strong> para que podamos contactarte más rápido.
          </p>
        </div>
      ) : null}

      {/* Número de cliente */}
      {initialProfile?.numero_cliente && (
        <div className="bg-card border border-border rounded-2xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-0.5">Tu número de cliente</p>
            <p className="text-3xl font-black tracking-tight" style={{ color: '#4ade80' }}>
              N° {initialProfile.numero_cliente}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Mencionalo cuando vengas al local o nos escribas por WhatsApp
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0" style={{ backgroundColor: 'oklch(0.25 0.02 145)' }}>
            🪪
          </div>
        </div>
      )}

      {/* Identidad Google (solo lectura) */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <p className="text-sm font-bold">Cuenta Google</p>
          <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">Solo lectura</span>
        </div>
        <div className="px-5 py-4 flex items-center gap-4">
          {avatarUrl && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" onError={() => setImgError(true)} className="w-14 h-14 rounded-full border border-border shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
              <span className="text-2xl font-black text-green-600">{inicial}</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-base truncate">{nombre}</p>
            <p className="text-sm text-muted-foreground truncate">{email}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">El nombre y foto provienen de tu cuenta de Google</p>
          </div>
        </div>
      </div>

      {/* Datos personales */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <p className="text-sm font-bold">Datos personales</p>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-xl text-white transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: '#16a34a' }}
            >
              <Pencil size={11} /> Editar perfil
            </button>
          )}
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Apodo */}
          <div>
            <label className={labelCls}>Apodo / nombre preferido</label>
            {editing ? (
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={apodo}
                  onChange={e => setApodo(e.target.value)}
                  placeholder={`Por defecto: ${nombre}`}
                  maxLength={40}
                  className={inputCls}
                />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Si lo completás, lo usamos en lugar de tu nombre de Google en toda la plataforma.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className={`text-sm py-2.5 px-3.5 rounded-xl border border-transparent flex-1 ${apodo ? 'text-foreground font-medium' : 'text-muted-foreground italic'}`}>
                  {apodo || <span className="font-normal">Usando nombre de Google: <span className="font-semibold not-italic text-foreground">{nombre}</span></span>}
                </p>
              </div>
            )}
          </div>

          {/* Teléfono */}
          <div>
            <label className={labelCls}>Número de teléfono</label>
            {editing ? (
              <input
                type="tel"
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                placeholder="Ej: 3804559900"
                className={inputCls}
              />
            ) : (
              <p className={`text-sm py-2.5 px-3.5 rounded-xl border border-transparent ${telefono ? 'text-foreground' : 'text-muted-foreground italic'}`}>
                {telefono || 'Sin teléfono guardado'}
              </p>
            )}
            {editing && (
              <p className="text-[10px] mt-1.5 leading-relaxed" style={{ color: '#f59e0b' }}>
                📲 <strong>Importante:</strong> lo usamos para contactarte por WhatsApp con actualizaciones de tus pedidos, beneficios exclusivos y promociones.
              </p>
            )}
          </div>

          {/* DNI */}
          <div>
            <label className={labelCls}>DNI</label>
            {editing ? (
              <input
                type="text"
                value={dni}
                onChange={e => setDni(e.target.value)}
                placeholder="Ej: 38456789"
                maxLength={15}
                className={inputCls}
              />
            ) : (
              <p className={`text-sm py-2.5 px-3.5 rounded-xl border border-transparent ${dni ? 'text-foreground' : 'text-muted-foreground italic'}`}>
                {dni || 'Sin DNI guardado'}
              </p>
            )}
          </div>

          {/* Sexo */}
          <div>
            <label className={labelCls}>Género</label>
            {editing ? (
              <div className="flex gap-2">
                {([
                  { value: 'M',    label: 'Masculino' },
                  { value: 'F',    label: 'Femenino'  },
                  { value: 'otro', label: 'Otro'      },
                ] as { value: 'M' | 'F' | 'otro'; label: string }[]).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSexo(sexo === opt.value ? '' : opt.value)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                      sexo === opt.value
                        ? 'bg-green-600 text-white border-green-600'
                        : 'border-border hover:bg-secondary'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            ) : (
              <p className={`text-sm py-2.5 px-3.5 rounded-xl border border-transparent ${sexo ? 'text-foreground' : 'text-muted-foreground italic'}`}>
                {sexo === 'M' ? 'Masculino' : sexo === 'F' ? 'Femenino' : sexo === 'otro' ? 'Otro' : 'Sin especificar'}
              </p>
            )}
          </div>

          {/* Acciones */}
          {editing && (
            <div className="space-y-2 pt-1">
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={isPending}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50"
                >
                  {isPending ? 'Guardando...' : 'Guardar cambios'}
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-border hover:bg-secondary transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Toast de éxito */}
          {saved && !editing && (
            <div className="flex items-center gap-2 text-sm font-semibold text-green-600 dark:text-green-400" role="status" aria-live="polite">
              <CheckCircle2 size={15} /> Datos guardados correctamente
            </div>
          )}
        </div>
      </div>

      {/* Cerrar sesión — tap target grande */}
      <form action={signOutCliente}>
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-muted-foreground border border-border hover:bg-secondary hover:text-foreground transition-colors min-h-[48px]"
        >
          <LogOut size={15} /> Cerrar sesión
        </button>
      </form>
    </div>
  )
}

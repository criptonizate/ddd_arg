'use client'

import { useState, useTransition } from 'react'
import { saveMyProfile, type UserProfile } from '@/lib/actions/perfil'
import { CheckCircle2, Pencil } from 'lucide-react'

interface Props {
  nombre: string
  email: string
  avatarUrl: string | null
  profile: UserProfile | null
}

export default function PerfilTab({ nombre, email, avatarUrl, profile: initialProfile }: Props) {
  const [editing, setEditing] = useState(false)
  const [telefono, setTelefono] = useState(initialProfile?.telefono ?? '')
  const [dni, setDni] = useState(initialProfile?.dni ?? '')
  const [sexo, setSexo] = useState<'M' | 'F' | 'otro' | ''>(initialProfile?.sexo ?? '')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [, startTransition] = useTransition()

  function handleSave() {
    setError('')
    startTransition(async () => {
      const result = await saveMyProfile({
        telefono: telefono || null,
        dni: dni || null,
        sexo: sexo || null,
      })
      if (result.error) { setError(result.error); return }
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  function handleCancel() {
    setTelefono(initialProfile?.telefono ?? '')
    setDni(initialProfile?.dni ?? '')
    setSexo(initialProfile?.sexo ?? '')
    setEditing(false)
    setError('')
  }

  const inputCls = "w-full text-sm border border-border rounded-xl px-3.5 py-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-green-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
  const labelCls = "text-xs font-semibold text-muted-foreground block mb-1.5"

  return (
    <div className="space-y-6">

      {/* Identidad Google (solo lectura) */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <p className="text-sm font-bold">Cuenta Google</p>
          <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">Solo lectura</span>
        </div>
        <div className="px-5 py-4 flex items-center gap-4">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="w-14 h-14 rounded-full border border-border shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
              <span className="text-2xl font-black text-green-600">{nombre[0]?.toUpperCase()}</span>
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
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-border hover:bg-secondary transition-colors"
            >
              <Pencil size={11} /> Editar
            </button>
          )}
        </div>

        <div className="px-5 py-5 space-y-5">
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
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-green-600 hover:bg-green-700 text-white transition-colors"
                >
                  Guardar cambios
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
            <div className="flex items-center gap-2 text-sm font-semibold text-green-600 dark:text-green-400">
              <CheckCircle2 size={15} /> Datos guardados correctamente
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

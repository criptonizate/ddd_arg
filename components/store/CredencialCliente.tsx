'use client'

import { useRef, useState, useTransition } from 'react'
import { Camera, X, Loader2 } from 'lucide-react'
import { uploadMyAvatar, removeMyAvatar } from '@/lib/actions/perfil'

// ─────────────────────────────────────────────────────────────────────────────
// CredencialCliente
//
// Tarjeta tipo "membership card" para mostrar los datos personales en forma
// de credencial. Reemplaza al cuadro liso del N° de cliente.
//
// El avatar puede ser:
//   1. El avatar custom guardado en user_profiles.avatar_url (prioridad).
//   2. El avatar que vino de Google (user_metadata.avatar_url).
//   3. Fallback: inicial del nombre dentro de un círculo verde.
//
// Al tocar el avatar se abre un file picker y la imagen se sube al bucket
// `avatars` vía uploadMyAvatar server action.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  numeroCliente: number | null
  nombre: string
  email: string
  telefono: string | null
  dni: string | null
  nivelMembresia: string | null
  nivelEmoji: string | null
  avatarGoogle: string | null
  avatarCustom: string | null
  fechaRegistroISO: string
}

function fmtFecha(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
  } catch { return '' }
}

function fmtDni(dni: string | null) {
  if (!dni) return null
  const digits = dni.replace(/\D/g, '')
  if (digits.length < 7) return dni
  // 38.456.789 — formato AR clásico
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function fmtTel(tel: string | null) {
  if (!tel) return null
  const digits = tel.replace(/\D/g, '')
  if (digits.length < 8) return tel
  return tel
}

export default function CredencialCliente({
  numeroCliente, nombre, email, telefono, dni,
  nivelMembresia, nivelEmoji, avatarGoogle, avatarCustom, fechaRegistroISO,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [imgError, setImgError] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const avatarActual = preview ?? avatarCustom ?? avatarGoogle
  const tieneCustom = !!avatarCustom
  const inicial = (nombre?.trim()?.[0] ?? '?').toUpperCase()

  function abrirFilePicker() {
    fileInputRef.current?.click()
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    // Preview inmediato para que el usuario vea que tocó bien.
    const reader = new FileReader()
    reader.onload = () => setPreview(typeof reader.result === 'string' ? reader.result : null)
    reader.readAsDataURL(file)

    const fd = new FormData()
    fd.append('file', file)
    startTransition(async () => {
      const result = await uploadMyAvatar(fd)
      if (result.error) {
        setError(result.error)
        setPreview(null)
      }
      // Si fue exitoso, revalidatePath('/cuenta') refresca y avatarCustom
      // llega por props con la URL final.
    })
    // Reset del input para poder re-subir la misma imagen si quiere.
    e.target.value = ''
  }

  function quitarFoto() {
    setError('')
    setPreview(null)
    startTransition(async () => {
      const result = await removeMyAvatar()
      if (result.error) setError(result.error)
    })
  }

  return (
    <div
      className="relative rounded-2xl overflow-hidden shadow-xl"
      style={{
        background: 'linear-gradient(135deg, #15803d 0%, #166534 45%, #14532d 100%)',
        border: '1px solid rgba(255,255,255,0.12)',
        aspectRatio: '1.6 / 1',
        maxWidth: '520px',
      }}
    >
      {/* Textura decorativa — chip holográfico + tramas */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 85% 20%, rgba(255,255,255,0.08) 0%, transparent 35%),
            radial-gradient(circle at 15% 90%, rgba(255,255,255,0.05) 0%, transparent 35%),
            repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0 2px, transparent 2px 10px)
          `,
        }}
      />

      {/* Header: logo tipográfico + título */}
      <div className="relative px-5 pt-4 pb-2 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: 'rgba(240,253,244,0.65)' }}>
            DDD ARG
          </p>
          <p className="text-[11px] font-semibold" style={{ color: '#f0fdf4' }}>
            Credencial de cliente
          </p>
        </div>
        {nivelMembresia && (
          <span
            className="shrink-0 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.14)', color: '#f0fdf4', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            {nivelEmoji} {nivelMembresia}
          </span>
        )}
      </div>

      {/* Chip EMV decorativo */}
      <div
        aria-hidden="true"
        className="absolute left-5 top-14 w-10 h-7 rounded"
        style={{
          background: 'linear-gradient(135deg, #fde68a, #d97706)',
          border: '1px solid rgba(0,0,0,0.25)',
          boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4)',
        }}
      />

      {/* Cuerpo: avatar + datos */}
      <div className="relative px-5 pt-14 pb-3 flex items-end gap-4">
        {/* Avatar clickeable */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={abrirFilePicker}
            disabled={isPending}
            aria-label="Cambiar foto de perfil"
            className="relative w-16 h-16 rounded-full overflow-hidden shadow-lg transition-transform active:scale-95 disabled:cursor-wait"
            style={{ border: '2px solid rgba(255,255,255,0.65)' }}
          >
            {avatarActual && !imgError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarActual}
                alt=""
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>
                <span className="text-2xl font-black text-white">{inicial}</span>
              </div>
            )}
            {/* Overlay "cámara" al hover */}
            <span
              className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
              style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
            >
              {isPending ? <Loader2 size={18} className="text-white animate-spin" /> : <Camera size={18} className="text-white" />}
            </span>
          </button>
          {/* Botón X para quitar la foto custom — solo visible si hay una */}
          {tieneCustom && !isPending && (
            <button
              type="button"
              onClick={quitarFoto}
              aria-label="Volver a la foto de Google"
              className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center shadow transition-transform active:scale-90"
              style={{ backgroundColor: '#dc2626', color: 'white', border: '2px solid white' }}
            >
              <X size={11} />
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={onFileChange}
          />
        </div>

        {/* Nombre + info textual */}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'rgba(240,253,244,0.55)' }}>
            Titular
          </p>
          <p className="font-black text-base sm:text-lg leading-tight truncate" style={{ color: '#f0fdf4' }}>
            {nombre}
          </p>
          <p className="text-[10px] truncate" style={{ color: 'rgba(240,253,244,0.7)' }}>
            {email}
          </p>
        </div>
      </div>

      {/* Footer: N° + fecha registro + extras */}
      <div
        className="relative px-5 py-3 flex items-end justify-between gap-3"
        style={{ backgroundColor: 'rgba(0,0,0,0.25)', borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'rgba(240,253,244,0.55)' }}>
            N° cliente
          </p>
          <p className="font-black text-xl sm:text-2xl tabular-nums leading-none" style={{ color: '#f0fdf4', letterSpacing: '0.08em' }}>
            {numeroCliente != null ? String(numeroCliente).padStart(5, '0') : '—'}
          </p>
        </div>
        <div className="text-right text-[10px] leading-snug" style={{ color: 'rgba(240,253,244,0.7)' }}>
          <p>Desde <strong style={{ color: '#f0fdf4' }}>{fmtFecha(fechaRegistroISO)}</strong></p>
          {fmtTel(telefono) && <p>Tel: <strong style={{ color: '#f0fdf4' }}>{fmtTel(telefono)}</strong></p>}
          {fmtDni(dni) && <p>DNI: <strong style={{ color: '#f0fdf4' }}>{fmtDni(dni)}</strong></p>}
        </div>
      </div>

      {error && (
        <p role="alert" className="absolute bottom-1 left-5 right-5 text-[11px] font-semibold text-red-200">
          {error}
        </p>
      )}
    </div>
  )
}

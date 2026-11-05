// Next 16 captura errores de runtime (en Server Components, server actions,
// API routes y middleware) a través de `onRequestError` desde este archivo.
// Los mandamos a Telegram para que un 500 en producción llegue al admin
// antes que un cliente escriba "no me carga la página".
//
// Para que el hook esté activo en producción no hace falta nada más —
// Next detecta `instrumentation.ts` en la raíz automáticamente.

export async function register() {
  // Hook de Node.js. Si algún día agregamos tracing (OpenTelemetry) va acá.
}

type ErrorContext = {
  routerKind: 'Pages Router' | 'App Router'
  routePath: string
  routeType: 'render' | 'route' | 'action' | 'middleware'
  renderSource?: 'react-server-components' | 'react-server-components-payload' | 'server-rendering'
  revalidateReason?: 'on-demand' | 'stale' | undefined
  renderType?: 'dynamic' | 'dynamic-resume'
}

type RequestContext = {
  path: string
  method: string
  headers: { [key: string]: string }
}

export const onRequestError = async (
  error: { digest?: string } & Error,
  request: RequestContext,
  context: ErrorContext,
) => {
  // Solo en producción — en dev los errores ya los ves en consola.
  if (process.env.NODE_ENV !== 'production') return
  // Error de bot / crawler (404 sondas) no es un bug nuestro.
  if (error.name === 'NotFoundError' || /ENOENT|AbortError/i.test(error.message)) return

  // Import dinámico para que esto no cargue nada en el edge runtime si
  // alguna ruta lo usa.
  const { notifyAdmin } = await import('@/lib/telegram')

  const resumen = [
    `${request.method} ${request.path}`,
    `tipo: ${context.routeType}`,
    `digest: ${error.digest ?? '—'}`,
    '',
    error.message?.slice(0, 500) ?? String(error).slice(0, 500),
  ].join('\n')

  await notifyAdmin({
    emoji: '🔥',
    titulo: `Error en producción (${context.routePath})`,
    detalle: resumen,
  }).catch(() => { /* nunca bloqueamos un error con otro error */ })
}

export const metadata = { title: 'Política de Privacidad — DDD ARG' }

export default function PrivacidadPage() {
  return (
    <div className="store-dark min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <h1 className="text-2xl sm:text-3xl font-black mb-2">Política de Privacidad</h1>
        <p className="text-sm text-muted-foreground mb-10">
          Última actualización: octubre de 2025 · Ley 25.326 de Protección de Datos Personales (Argentina)
        </p>

        <div className="space-y-10 text-sm leading-relaxed">

          <section>
            <h2 className="text-base font-bold mb-3">1. Responsable del tratamiento</h2>
            <p className="text-muted-foreground">
              El responsable del tratamiento de tus datos personales es <strong className="text-foreground">DDD ARG</strong>, con domicilio en Capital, La Rioja, Argentina.
              Podés contactarnos para cualquier consulta sobre esta política escribiéndonos por WhatsApp al{' '}
              <a href="https://wa.me/543804559909" className="underline" target="_blank" rel="noopener noreferrer">+54 380 455-9909</a>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3">2. Datos que recolectamos</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
              <li><strong className="text-foreground">Nombre completo</strong> — provisto al registrar un pedido.</li>
              <li><strong className="text-foreground">Dirección de correo electrónico</strong> — obtenida mediante inicio de sesión con Google (Google OAuth).</li>
              <li><strong className="text-foreground">Número de teléfono / WhatsApp</strong> — opcional, provisto al registrar un pedido.</li>
              <li><strong className="text-foreground">Dirección de entrega</strong> — en caso de solicitar envío a domicilio.</li>
              <li><strong className="text-foreground">Historial de pedidos</strong> — registros de los pedidos realizados en nuestra plataforma.</li>
              <li><strong className="text-foreground">Apodo / nombre de cuenta</strong> — opcional, para personalizar tu experiencia.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3">3. Finalidad del tratamiento</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
              <li>Gestionar y coordinar tus pedidos de filamentos.</li>
              <li>Enviarte notificaciones sobre el estado de tu pedido (por email y/o WhatsApp).</li>
              <li>Avisarte cuando un producto sin stock vuelva a estar disponible (si lo solicitaste).</li>
              <li>Calcular descuentos por volumen y beneficios de membresía mayorista.</li>
              <li>Mejorar nuestra tienda y atención al cliente.</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              No utilizamos tus datos para publicidad de terceros ni los vendemos bajo ninguna circunstancia.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3">4. Almacenamiento y terceros</h2>
            <p className="text-muted-foreground">
              Los datos se almacenan de forma segura en <strong className="text-foreground">Supabase</strong> (supabase.com), plataforma de base de datos con sede en EE.UU.,
              con servidores en South America (sa-east-1). El acceso a los datos está restringido mediante autenticación y políticas de seguridad de fila (Row Level Security).
            </p>
            <p className="text-muted-foreground mt-2">
              Los emails transaccionales (confirmaciones de pedido) se envían a través de <strong className="text-foreground">Resend</strong> (resend.com).
              El inicio de sesión es gestionado por <strong className="text-foreground">Google OAuth</strong> (Google LLC).
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3">5. Tus derechos (art. 14 Ley 25.326)</h2>
            <p className="text-muted-foreground mb-3">
              Como titular de tus datos personales, tenés derecho a:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
              <li><strong className="text-foreground">Acceso</strong> — solicitar qué datos tenemos sobre vos.</li>
              <li><strong className="text-foreground">Rectificación</strong> — corregir datos inexactos o incompletos.</li>
              <li><strong className="text-foreground">Supresión</strong> — pedir que eliminemos tus datos personales.</li>
              <li><strong className="text-foreground">Confidencialidad</strong> — oponerte al tratamiento de tus datos.</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              Para ejercer estos derechos, escribinos por WhatsApp al{' '}
              <a href="https://wa.me/543804559909" className="underline" target="_blank" rel="noopener noreferrer">+54 380 455-9909</a>.
              Responderemos en un plazo de 10 días hábiles.
            </p>
            <p className="text-muted-foreground mt-2">
              La Agencia de Acceso a la Información Pública (AAIP) es el organismo de control en materia de protección de datos personales en Argentina.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3">6. Cookies y analytics</h2>
            <p className="text-muted-foreground">
              Nuestra tienda utiliza cookies técnicas necesarias para el funcionamiento del inicio de sesión y la sesión de usuario.
              No utilizamos cookies de seguimiento ni plataformas de analytics de terceros.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3">7. Cambios a esta política</h2>
            <p className="text-muted-foreground">
              Podemos actualizar esta política ocasionalmente. La fecha de última actualización figura al inicio de esta página.
              El uso continuado de nuestra tienda implica la aceptación de los cambios.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}

import { createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import './dashboard.css'
import Sidebar from './_components/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const db = createAdminClient()

  // Por ahora usamos la barbería del seed para desarrollo
  // En producción esto vendría del auth de Supabase
  const { data: barberia } = await db
    .from('barberias')
    .select('id, nombre, slug, suscripcion_estado, suscripcion_vence_en, estado')
    .eq('slug', 'barber-kings')
    .single()

  if (!barberia) redirect('/')

  // Calcular días restantes del trial
  let diasTrial = 0
  if (barberia.suscripcion_estado === 'trial' && barberia.suscripcion_vence_en) {
    const vence = new Date(barberia.suscripcion_vence_en)
    const hoy   = new Date()
    diasTrial = Math.max(0, Math.ceil((vence.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)))
  }

  return (
    <div className="dash-wrap">
      <Sidebar
        barberia={barberia}
        diasTrial={diasTrial}
      />
      <main className="dash-main">
        {children}
      </main>
    </div>
  )
}

import { createAdminClient } from '@/lib/supabase/server'
import LiquidacionesClient from './_components/LiquidacionesClient'
import { format, startOfMonth } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const BARBERIA_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const TZ = 'America/Argentina/Buenos_Aires'

export default async function LiquidacionesPage() {
  const db  = createAdminClient()
  const hoy = toZonedTime(new Date(), TZ)

  const { data: liquidaciones } = await db
    .from('liquidaciones')
    .select(`
      id, periodo_desde, periodo_hasta,
      turnos_completados, turnos_cobrados,
      monto_bruto, monto_barbero,
      estado, pagado_en, creado_en,
      barberos(comision_pct, usuarios(nombre))
    `)
    .eq('barberia_id', BARBERIA_ID)
    .order('creado_en', { ascending: false })

  const lista = (liquidaciones ?? []).map((l: any) => ({
    id:                 l.id,
    barbero_nombre:     l.barberos?.usuarios?.nombre ?? '—',
    comision_pct:       l.barberos?.comision_pct ?? 0,
    periodo_desde:      l.periodo_desde,
    periodo_hasta:      l.periodo_hasta,
    turnos_completados: l.turnos_completados,
    turnos_cobrados:    l.turnos_cobrados,
    monto_bruto:        l.monto_bruto,
    monto_barbero:      l.monto_barbero,
    estado:             l.estado,
    pagado_en:          l.pagado_en,
  }))

  const { data: barberos } = await db
    .from('barberos')
    .select('id, usuarios(nombre)')
    .eq('barberia_id', BARBERIA_ID)
    .eq('activo', true)

  const barberosList = (barberos ?? []).map((b: any) => ({
    id: b.id, nombre: b.usuarios?.nombre ?? '',
  }))

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Liquidaciones</div>
      </div>
      <div className="dash-content">
        <LiquidacionesClient
          liquidaciones={lista}
          barberos={barberosList}
          barberia_id={BARBERIA_ID}
          periodo_desde={format(startOfMonth(hoy), 'yyyy-MM-dd')}
          periodo_hasta={format(hoy, 'yyyy-MM-dd')}
        />
      </div>
    </>
  )
}

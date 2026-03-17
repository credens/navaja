import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format, startOfDay, endOfDay } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import AgendaHoy from './_components/AgendaHoy'
import MiniChart from './_components/MiniChart'

const TZ = 'America/Argentina/Buenos_Aires'

function formatPrecio(n: number) {
  return '$' + Math.round(n).toLocaleString('es-AR')
}

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/registro')

  const db = createAdminClient()

  const { data: usuario } = await db
    .from('usuarios')
    .select('barberia_id')
    .eq('auth_id', user.id)
    .single()

  if (!usuario) redirect('/registro')

  const barberia_id = usuario.barberia_id
  const ahora = toZonedTime(new Date(), TZ)
  const hoyDesde = startOfDay(ahora).toISOString()
  const hoyHasta = endOfDay(ahora).toISOString()

  const { data: turnosHoy } = await db
    .from('v_turnos_completo')
    .select('*')
    .eq('barberia_id', barberia_id)
    .gte('fecha_hora_inicio', hoyDesde)
    .lte('fecha_hora_inicio', hoyHasta)
    .order('fecha_hora_inicio', { ascending: true })

  const confirmados  = turnosHoy?.filter(t => ['confirmado','en_curso','completado'].includes(t.estado)) ?? []
  const cancelados   = turnosHoy?.filter(t => t.estado.startsWith('cancelado')) ?? []
  const recaudadoHoy = confirmados.reduce((s, t) => s + (t.monto_total ?? 0), 0)

  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString()
  const { data: turnosMes } = await db
    .from('turnos')
    .select('monto_total, estado')
    .eq('barberia_id', barberia_id)
    .gte('fecha_hora_inicio', inicioMes)
    .in('estado', ['completado','cancelado_sin_reembolso','no_show'])

  const recaudadoMes = turnosMes?.reduce((s, t) => s + (t.monto_total ?? 0), 0) ?? 0

  const { data: barberos } = await db
    .from('barberos')
    .select('id, comision_pct, usuarios(nombre)')
    .eq('barberia_id', barberia_id)
    .eq('activo', true)

  const barberoStats = (barberos ?? []).map((b: any) => {
    const bTurnos = confirmados.filter(t => t.barbero_id === b.id)
    const monto   = bTurnos.reduce((s, t) => s + (t.monto_barbero ?? 0), 0)
    return { id: b.id, nombre: b.usuarios?.nombre ?? '', comision: b.comision_pct, turnos: bTurnos.length, monto }
  })

  const { data: liquidaciones } = await db
    .from('v_liquidaciones_pendientes')
    .select('*')
    .eq('barberia_id', barberia_id)
    .order('periodo_desde', { ascending: false })
    .limit(5)

  const chart_data = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(ahora)
    d.setDate(d.getDate() - (6 - i))
    return { dia: ['L','M','M','J','V','S','D'][d.getDay() === 0 ? 6 : d.getDay() - 1], valor: Math.floor(Math.random() * 80000 + 20000), today: i === 6 }
  })

  const { data: barberia } = await db
    .from('barberias')
    .select('onboarding_completado, mp_access_token, plan_id')
    .eq('id', barberia_id)
    .single()

  const { count: svcCount } = await db
    .from('servicios')
    .select('id', { count: 'exact', head: true })
    .eq('barberia_id', barberia_id)
    .eq('activo', true)

  const { count: horCount } = await db
    .from('barberias_horarios')
    .select('id', { count: 'exact', head: true })
    .eq('barberia_id', barberia_id)

  const onboarding_items = [
    { label: 'Cuenta creada',         done: true },
    { label: 'MercadoPago conectado', done: !!barberia?.mp_access_token },
    { label: 'Plan elegido',          done: !!barberia?.plan_id },
    { label: 'Servicios cargados',    done: (svcCount ?? 0) > 0, href: '/dashboard/servicios' },
    { label: 'Horarios configurados', done: (horCount ?? 0) > 0, href: '/dashboard/configuracion' },
  ]
  const onboarding_completo = onboarding_items.every(i => i.done)

  return (
    <>
      {!onboarding_completo && (
        <div className="dcard" style={{ marginBottom: '20px', borderLeft: '2px solid var(--gold)' }}>
          <div className="dcard-head">
            <div className="dcard-title">Completá tu configuración</div>
            <div style={{ fontSize: '12px', color: '#555' }}>
              {onboarding_items.filter(i => i.done).length} de {onboarding_items.length} listos
            </div>
          </div>
          <div className="dcard-body">
            <div className="checklist">
              {onboarding_items.map((item, i) => (
                <div className="check-item" key={i}>
                  <div className={`check-ico ${item.done ? 'done' : 'todo'}`}>{item.done ? '✓' : i + 1}</div>
                  <div className={`check-label ${item.done ? 'done' : ''}`}>{item.label}</div>
                  {!item.done && item.href && <a href={item.href} className="check-cta">Configurar →</a>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="metrics">
        <div className="metric">
          <div className="metric-label">Turnos hoy</div>
          <div className="metric-value">{confirmados.length}</div>
          <div className="metric-delta up">↑ {cancelados.length} cancelados</div>
        </div>
        <div className="metric">
          <div className="metric-label">Recaudado hoy</div>
          <div className="metric-value gold">{formatPrecio(recaudadoHoy)}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Recaudado este mes</div>
          <div className="metric-value gold">{formatPrecio(recaudadoMes)}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Liquidaciones pendientes</div>
          <div className="metric-value">{liquidaciones?.length ?? 0}</div>
        </div>
      </div>

      <div className="dash-grid-3">
        <AgendaHoy turnos={turnosHoy ?? []} barberos={barberoStats} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="dcard">
            <div className="dcard-head">
              <div className="dcard-title">Barberos hoy</div>
              <a href="/dashboard/barberos" className="dcard-action">Gestionar</a>
            </div>
            <div className="dcard-body">
              <div className="barbero-rows">
                {barberoStats.length === 0 ? (
                  <div className="empty-state"><span className="empty-state-icon">💈</span>No hay barberos activos</div>
                ) : barberoStats.map(b => (
                  <div className="barbero-row" key={b.id}>
                    <div className="br-av">{b.nombre[0]}</div>
                    <div className="br-info">
                      <div className="br-name">{b.nombre}</div>
                      <div className="br-comision">Comisión {b.comision}%</div>
                    </div>
                    <div className="br-stats">
                      <div className="br-turnos">{b.turnos} turnos</div>
                      <div className="br-monto">{formatPrecio(b.monto)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="dcard">
            <div className="dcard-head">
              <div className="dcard-title">Liquidaciones</div>
              <a href="/dashboard/liquidaciones" className="dcard-action">Ver todas</a>
            </div>
            <div className="dcard-body">
              <div className="liq-rows">
                {!liquidaciones?.length ? (
                  <div className="empty-state" style={{ padding: '16px 0' }}>No hay liquidaciones pendientes</div>
                ) : liquidaciones.map((l: any) => (
                  <div className="liq-row" key={l.id}>
                    <div className="liq-info">
                      <div className="liq-nombre">{l.barbero_nombre}</div>
                      <div className="liq-periodo">{format(new Date(l.periodo_desde), 'd MMM')} — {format(new Date(l.periodo_hasta), 'd MMM')} · {l.turnos_cobrados} turnos</div>
                    </div>
                    <div className="liq-monto">{formatPrecio(l.monto_barbero)}</div>
                    <button className="liq-btn pagar">Pagar</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="dcard">
        <div className="dcard-head">
          <div className="dcard-title">Ingresos — últimos 7 días</div>
          <div style={{ fontSize: '12px', color: '#555' }}>Total: {formatPrecio(chart_data.reduce((s, d) => s + d.valor, 0))}</div>
        </div>
        <MiniChart data={chart_data} />
      </div>
    </>
  )
}

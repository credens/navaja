import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { cancelarTurno } from '@/lib/services/cancelaciones'
import {
  notificarRecordatorio24hs,
  notificarRecordatorio2hs,
  notificarNoShow,
} from '@/lib/whatsapp/client'
import { addHours, addMinutes, format, parseISO } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { es } from 'date-fns/locale'

const TZ = 'America/Argentina/Buenos_Aires'

// Vercel Cron: corre cada 15 minutos
// vercel.json: { "crons": [{ "path": "/api/cron/turnos", "schedule": "*/15 * * * *" }] }
export async function GET(req: NextRequest) {

  // Verificar cron secret para evitar ejecuciones no autorizadas
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db   = createAdminClient()
  const ahora = new Date()
  const stats = { no_shows: 0, recordatorios_24hs: 0, recordatorios_2hs: 0, bajas: 0 }

  // ── 1. Detectar no-shows ─────────────────────────────────────
  // Turnos confirmados cuya hora de fin pasó hace más de 15 min
  const { data: turnosVencidos } = await db
    .from('v_turnos_completo')
    .select('*')
    .eq('estado', 'confirmado')
    .lt('fecha_hora_fin', addMinutes(ahora, -15).toISOString())

  for (const turno of turnosVencidos ?? []) {
    const { data: barberia } = await db
      .from('barberias')
      .select('politica_no_show, wsp_modo, wsp_phone_number_id, wsp_access_token')
      .eq('id', turno.barberia_id)
      .single()

    if (barberia?.politica_no_show === 'cobra') {
      await db.from('turnos').update({ estado: 'no_show' }).eq('id', turno.id)
    } else {
      await cancelarTurno(turno.id, 'sistema')
    }

    // Notificar al barbero
    if (turno.barbero_nombre && turno.cliente_telefono) {
      const { data: barbero } = await db
        .from('barberos')
        .select('usuarios(telefono)')
        .eq('id', turno.barbero_id)
        .single()

      if (barbero?.usuarios?.telefono) {
        const inicio = toZonedTime(parseISO(turno.fecha_hora_inicio), TZ)
        await notificarNoShow({
          barberia:          barberia as any,
          barbero_nombre:    turno.barbero_nombre,
          barbero_telefono:  barbero.usuarios.telefono,
          cliente_nombre:    turno.cliente_nombre,
          hora:              format(inicio, 'HH:mm'),
          monto:             turno.monto_total,
        })
      }
    }
    stats.no_shows++
  }

  // ── 2. Recordatorios 24hs ────────────────────────────────────
  const desde_24 = addHours(ahora, 23.75).toISOString()
  const hasta_24 = addHours(ahora, 24.25).toISOString()

  const { data: turnos24 } = await db
    .from('v_turnos_completo')
    .select('*')
    .eq('estado', 'confirmado')
    .eq('recordatorio_24hs_enviado', false)
    .gte('fecha_hora_inicio', desde_24)
    .lte('fecha_hora_inicio', hasta_24)

  for (const turno of turnos24 ?? []) {
    const { data: barberia } = await db
      .from('barberias')
      .select('*')
      .eq('id', turno.barberia_id)
      .single()

    const inicio = toZonedTime(parseISO(turno.fecha_hora_inicio), TZ)

    await notificarRecordatorio24hs({
      barberia:        barberia as any,
      cliente_nombre:  turno.cliente_nombre,
      cliente_telefono: turno.cliente_telefono,
      servicio_nombre: turno.servicio_nombre,
      barbero_nombre:  turno.barbero_nombre,
      fecha:           format(inicio, "EEEE d 'de' MMMM", { locale: es }),
      hora:            format(inicio, 'HH:mm'),
    })

    await db
      .from('turnos')
      .update({ recordatorio_24hs_enviado: true })
      .eq('id', turno.id)

    stats.recordatorios_24hs++
  }

  // ── 3. Recordatorios 2hs ──────────────────────────────────────
  const desde_2 = addHours(ahora, 1.75).toISOString()
  const hasta_2 = addHours(ahora, 2.25).toISOString()

  const { data: turnos2 } = await db
    .from('v_turnos_completo')
    .select('*')
    .eq('estado', 'confirmado')
    .eq('recordatorio_2hs_enviado', false)
    .gte('fecha_hora_inicio', desde_2)
    .lte('fecha_hora_inicio', hasta_2)

  for (const turno of turnos2 ?? []) {
    const { data: barberia } = await db
      .from('barberias')
      .select('*')
      .eq('id', turno.barberia_id)
      .single()

    const inicio = toZonedTime(parseISO(turno.fecha_hora_inicio), TZ)

    await notificarRecordatorio2hs({
      barberia:         barberia as any,
      cliente_nombre:   turno.cliente_nombre,
      cliente_telefono: turno.cliente_telefono,
      servicio_nombre:  turno.servicio_nombre,
      barbero_nombre:   turno.barbero_nombre,
      hora:             format(inicio, 'HH:mm'),
    })

    await db
      .from('turnos')
      .update({ recordatorio_2hs_enviado: true })
      .eq('id', turno.id)

    stats.recordatorios_2hs++
  }

  // ── 4. Procesar bajas pendientes ──────────────────────────────
  const { data: bajas } = await db
    .from('bajas_pendientes')
    .select('*, turnos(estado, barberia_id)')
    .is('ejecutado_en', null)

  for (const baja of bajas ?? []) {
    const turnoTerminado = ['completado', 'cancelado', 'cancelado_por_local', 'no_show']
      .includes(baja.turnos?.estado)

    if (turnoTerminado) {
      const { darBajaBarbero } = await import('@/lib/services/barberos')
      await darBajaBarbero(baja.turnos.barberia_id, baja.barbero_id, baja.motivo)
      await db
        .from('bajas_pendientes')
        .update({ ejecutado_en: new Date().toISOString() })
        .eq('id', baja.id)
      stats.bajas++
    }
  }

  // ── 5. Liberar preferencias vencidas ─────────────────────────
  await db
    .from('turnos')
    .update({ estado: 'cancelado', cancelado_por: 'sistema' })
    .eq('estado', 'pendiente_pago')
    .lt('mp_preference_expira_en', ahora.toISOString())

  console.log('[cron/turnos]', stats)
  return NextResponse.json({ ok: true, stats })
}

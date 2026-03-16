import { createAdminClient } from '@/lib/supabase/server'
import { addMinutes, format, parseISO, setHours, setMinutes } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import type { Slot } from '@/types'

const TZ = 'America/Argentina/Buenos_Aires'
const INTERVALO_GRILLA_MIN = 15

export async function obtenerSlots(
  barbero_id: string,
  servicio_id: string,
  fecha: string   // 'YYYY-MM-DD'
): Promise<Slot[]> {

  const db = createAdminClient()

  // 1. Duración del servicio
  const { data: servicio, error: errSvc } = await db
    .from('servicios')
    .select('duracion_min')
    .eq('id', servicio_id)
    .single()

  if (errSvc || !servicio) return []
  const duracion = servicio.duracion_min

  // 2. Barbero y su barbería
  const { data: barbero, error: errBar } = await db
    .from('barberos')
    .select('barberia_id, acepta_turnos, activo')
    .eq('id', barbero_id)
    .single()

  if (errBar || !barbero || !barbero.activo || !barbero.acepta_turnos) return []

  // 3. Día de la semana (0=dom, 1=lun...)
  const fechaLocal = toZonedTime(new Date(fecha + 'T12:00:00'), TZ)
  const diaSemana  = fechaLocal.getDay()

  // 4. Disponibilidad del barbero ese día
  const { data: dispBarbero } = await db
    .from('barberos_disponibilidad')
    .select('hora_inicio, hora_fin')
    .eq('barbero_id', barbero_id)
    .eq('dia_semana', diaSemana)
    .eq('activo', true)
    .single()

  if (!dispBarbero) return []   // no trabaja ese día

  // 5. Horario de la barbería ese día
  const { data: horBarberia } = await db
    .from('barberias_horarios')
    .select('hora_apertura, hora_cierre')
    .eq('barberia_id', barbero.barberia_id)
    .eq('dia_semana', diaSemana)
    .eq('activo', true)
    .single()

  if (!horBarberia) return []   // barbería cerrada ese día

  // 6. Calcular rango efectivo (intersección barbero ∩ barbería)
  const inicio_efectivo = max_hora(dispBarbero.hora_inicio, horBarberia.hora_apertura)
  const fin_efectivo    = min_hora(dispBarbero.hora_fin,    horBarberia.hora_cierre)

  // 7. Bloqueos del barbero para esa fecha
  const inicioFecha = fromZonedTime(new Date(fecha + 'T00:00:00'), TZ).toISOString()
  const finFecha    = fromZonedTime(new Date(fecha + 'T23:59:59'), TZ).toISOString()

  const { data: bloqueos } = await db
    .from('barberos_bloqueos')
    .select('fecha_desde, fecha_hasta')
    .eq('barbero_id', barbero_id)
    .lt('fecha_desde', finFecha)
    .gt('fecha_hasta', inicioFecha)

  // 8. Turnos ya ocupados ese día
  const { data: turnosOcupados } = await db
    .from('turnos')
    .select('fecha_hora_inicio, fecha_hora_fin')
    .eq('barbero_id', barbero_id)
    .gte('fecha_hora_inicio', inicioFecha)
    .lte('fecha_hora_inicio', finFecha)
    .not('estado', 'in', '("cancelado","cancelado_por_local")')

  // 9. Generar slots
  const slots: Slot[] = []
  const ahora = new Date()

  let cursor = hora_str_a_date(fecha, inicio_efectivo)
  const limite = hora_str_a_date(fecha, fin_efectivo)

  while (addMinutes(cursor, duracion) <= limite) {
    const slot_inicio = cursor
    const slot_fin    = addMinutes(cursor, duracion)

    // Descartar slots en el pasado (con 15 min de buffer)
    if (slot_inicio <= addMinutes(ahora, 15)) {
      cursor = addMinutes(cursor, INTERVALO_GRILLA_MIN)
      continue
    }

    // Verificar si el slot cae dentro de un bloqueo
    const enBloqueo = (bloqueos || []).some(b =>
      slot_inicio < new Date(b.fecha_hasta) &&
      slot_fin    > new Date(b.fecha_desde)
    )

    // Verificar si se superpone con un turno existente
    const enTurno = (turnosOcupados || []).some(t =>
      slot_inicio < new Date(t.fecha_hora_fin) &&
      slot_fin    > new Date(t.fecha_hora_inicio)
    )

    slots.push({
      hora_inicio:       format(toZonedTime(slot_inicio, TZ), 'HH:mm'),
      hora_fin:          format(toZonedTime(slot_fin,    TZ), 'HH:mm'),
      fecha_hora_inicio: fromZonedTime(slot_inicio, TZ).toISOString(),
      fecha_hora_fin:    fromZonedTime(slot_fin,    TZ).toISOString(),
      duracion_min:      duracion,
      disponible:        !enBloqueo && !enTurno,
    })

    cursor = addMinutes(cursor, INTERVALO_GRILLA_MIN)
  }

  return slots
}

// Obtener slots para todos los barberos disponibles en una fecha
export async function obtenerSlotsMultiBarbero(
  barberia_id: string,
  servicio_id: string,
  fecha: string
): Promise<{ barbero_id: string; nombre: string; slots: Slot[] }[]> {

  const db = createAdminClient()

  const { data: barberos } = await db
    .from('barberos')
    .select('id, usuario_id, usuarios(nombre)')
    .eq('barberia_id', barberia_id)
    .eq('activo', true)
    .eq('acepta_turnos', true)
    .in('id', db
      .from('barberos_servicios')
      .select('barbero_id')
      .eq('servicio_id', servicio_id)
    )

  if (!barberos?.length) return []

  const resultados = await Promise.all(
    barberos.map(async (b: any) => ({
      barbero_id: b.id,
      nombre:     b.usuarios?.nombre ?? '',
      slots:      await obtenerSlots(b.id, servicio_id, fecha),
    }))
  )

  return resultados
}

// ── Helpers de tiempo ────────────────────────────────────────

function hora_str_a_date(fecha: string, hora: string): Date {
  const [hh, mm] = hora.split(':').map(Number)
  const d = toZonedTime(new Date(fecha + 'T12:00:00'), TZ)
  return fromZonedTime(setMinutes(setHours(d, hh), mm), TZ)
}

function max_hora(a: string, b: string): string {
  return a > b ? a : b
}

function min_hora(a: string, b: string): string {
  return a < b ? a : b
}

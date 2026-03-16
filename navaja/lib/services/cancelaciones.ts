import { createAdminClient } from '@/lib/supabase/server'
import { addHours, parseISO } from 'date-fns'
import type { EstadoTurno, Result, Turno } from '@/types'

export async function cancelarTurno(
  turno_id: string,
  cancelado_por: 'cliente' | 'barbero' | 'dueno' | 'sistema',
  motivo?: string
): Promise<Result<{ estado: EstadoTurno; reembolso: boolean }>> {

  const db = createAdminClient()

  // Obtener turno
  const { data: turno, error } = await db
    .from('turnos')
    .select('*, barberias(hs_cancelacion, politica_no_show)')
    .eq('id', turno_id)
    .single()

  if (error || !turno) {
    return { ok: false, error: 'Turno no encontrado' }
  }

  // Solo se puede cancelar si está confirmado
  if (!['confirmado', 'en_curso'].includes(turno.estado)) {
    return { ok: false, error: `El turno no puede cancelarse (estado: ${turno.estado})` }
  }

  let nuevo_estado: EstadoTurno
  let reembolso = false

  if (cancelado_por === 'cliente') {
    const hs_limite = turno.barberias?.hs_cancelacion ?? 3
    const limite    = addHours(parseISO(turno.fecha_hora_inicio), -hs_limite)
    const ahora     = new Date()

    if (ahora <= limite) {
      // A tiempo → reembolso total
      nuevo_estado = 'cancelado'
      reembolso    = true
    } else {
      // Tardía → sin reembolso
      nuevo_estado = 'cancelado_sin_reembolso'
      reembolso    = false
    }

  } else {
    // Barbero, dueño o sistema → siempre reembolso
    nuevo_estado = 'cancelado_por_local'
    reembolso    = true
  }

  // Actualizar turno
  const { error: errUpdate } = await db
    .from('turnos')
    .update({
      estado:            nuevo_estado,
      cancelado_en:      new Date().toISOString(),
      cancelado_por,
      cancelacion_motivo: motivo ?? null,
    })
    .eq('id', turno_id)

  if (errUpdate) {
    return { ok: false, error: errUpdate.message }
  }

  // Procesar reembolso si corresponde
  if (reembolso && turno.mp_payment_id) {
    const { procesarReembolso } = await import('@/lib/mp/refunds')
    const resultReembolso = await procesarReembolso(turno as Turno)
    if (!resultReembolso.ok) {
      // Guardar para reintentar — el turno ya está cancelado igual
      await db.from('reembolsos_pendientes').insert({
        turno_id:    turno_id,
        monto:       turno.monto_total,
        ultimo_error: resultReembolso.error,
      })
    }
  }

  return { ok: true, data: { estado: nuevo_estado, reembolso } }
}

// Cancelar todos los turnos futuros de un barbero (para baja)
export async function cancelarTurnosFuturos(
  barbero_id: string
): Promise<{ cancelados: number }> {

  const db = createAdminClient()

  const { data: turnos } = await db
    .from('turnos')
    .select('id')
    .eq('barbero_id', barbero_id)
    .eq('estado', 'confirmado')
    .gt('fecha_hora_inicio', new Date().toISOString())

  if (!turnos?.length) return { cancelados: 0 }

  let cancelados = 0
  for (const t of turnos) {
    const result = await cancelarTurno(t.id, 'dueno', 'Barbero dado de baja')
    if (result.ok) cancelados++
  }

  return { cancelados }
}

import { createAdminClient } from '@/lib/supabase/server'
import type { Liquidacion, Result } from '@/types'

export async function generarLiquidacion(
  barberia_id: string,
  barbero_id: string,
  periodo_desde: string,  // 'YYYY-MM-DD'
  periodo_hasta: string
): Promise<Liquidacion | null> {

  const db = createAdminClient()

  // Buscar turnos liquidables del período no incluidos en liquidaciones anteriores
  const { data: turnosLiquidados } = await db
    .from('liquidaciones_detalle')
    .select('turno_id')

  const ids_ya_liquidados = turnosLiquidados?.map(t => t.turno_id) ?? []

  const { data: turnos } = await db
    .from('turnos')
    .select('id, monto_total, monto_barbero, estado')
    .eq('barbero_id', barbero_id)
    .gte('fecha_hora_inicio', periodo_desde + 'T00:00:00-03:00')
    .lte('fecha_hora_inicio', periodo_hasta + 'T23:59:59-03:00')
    .in('estado', ['completado', 'cancelado_sin_reembolso', 'no_show'])
    .not('id', 'in', `(${ids_ya_liquidados.join(',') || 'null'})`)

  // Siempre crear liquidación (aunque sea en $0 — registro de cierre)
  const monto_bruto   = turnos?.reduce((s, t) => s + (t.monto_total   ?? 0), 0) ?? 0
  const monto_barbero = turnos?.reduce((s, t) => s + (t.monto_barbero ?? 0), 0) ?? 0
  const completados   = turnos?.filter(t => t.estado === 'completado').length ?? 0

  const { data: liquidacion, error } = await db
    .from('liquidaciones')
    .insert({
      barberia_id,
      barbero_id,
      periodo_desde,
      periodo_hasta,
      turnos_completados: completados,
      turnos_cobrados:    turnos?.length ?? 0,
      monto_bruto,
      monto_barbero,
      estado: 'pendiente',
    })
    .select()
    .single()

  if (error || !liquidacion) return null

  // Insertar detalle
  if (turnos?.length) {
    await db.from('liquidaciones_detalle').insert(
      turnos.map(t => ({
        liquidacion_id: liquidacion.id,
        turno_id:       t.id,
        monto_barbero:  t.monto_barbero ?? 0,
      }))
    )
  }

  return liquidacion
}

export async function marcarLiquidacionPagada(
  liquidacion_id: string,
  pagado_por: string,
  notas?: string
): Promise<Result<Liquidacion>> {

  const db = createAdminClient()

  const { data, error } = await db
    .from('liquidaciones')
    .update({
      estado:    'pagada',
      pagado_en: new Date().toISOString(),
      pagado_por,
      notas:     notas ?? null,
    })
    .eq('id', liquidacion_id)
    .eq('estado', 'pendiente')
    .select()
    .single()

  if (error || !data) {
    return { ok: false, error: error?.message ?? 'Error al marcar como pagada' }
  }

  return { ok: true, data }
}

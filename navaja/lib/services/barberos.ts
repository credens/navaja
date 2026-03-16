import { createAdminClient } from '@/lib/supabase/server'
import { cancelarTurnosFuturos } from './cancelaciones'
import { generarLiquidacion } from './liquidaciones'
import { startOfMonth, format } from 'date-fns'
import type { Result, Barbero } from '@/types'

// ── Alta ─────────────────────────────────────────────────────
export async function darAltaBarbero(
  barberia_id: string,
  datos: {
    nombre: string
    email: string
    telefono?: string
    comision_pct: number
    foto_url?: string
    descripcion?: string
    servicio_ids?: string[]
    disponibilidad?: { dia_semana: number; hora_inicio: string; hora_fin: string }[]
  }
): Promise<Result<Barbero>> {

  const db = createAdminClient()

  // Validaciones
  if (datos.comision_pct < 0 || datos.comision_pct > 100) {
    return { ok: false, error: 'Comisión inválida (debe ser entre 0 y 100)' }
  }

  const { data: barberia } = await db
    .from('barberias')
    .select('estado, plan_id')
    .eq('id', barberia_id)
    .single()

  if (barberia?.estado !== 'activa') {
    return { ok: false, error: 'La barbería no está activa' }
  }

  // Verificar email único en la barbería
  const { data: existe } = await db
    .from('usuarios')
    .select('id')
    .eq('barberia_id', barberia_id)
    .eq('email', datos.email)
    .single()

  if (existe) {
    return { ok: false, error: 'Ya existe un barbero con ese email' }
  }

  // Crear usuario
  const { data: usuario, error: errUsuario } = await db
    .from('usuarios')
    .insert({
      barberia_id,
      nombre:   datos.nombre,
      email:    datos.email,
      telefono: datos.telefono ?? null,
      rol:      'barbero',
    })
    .select()
    .single()

  if (errUsuario || !usuario) {
    return { ok: false, error: errUsuario?.message ?? 'Error al crear usuario' }
  }

  // Crear barbero
  const { data: barbero, error: errBarbero } = await db
    .from('barberos')
    .insert({
      usuario_id:    usuario.id,
      barberia_id,
      comision_pct:  datos.comision_pct,
      foto_url:      datos.foto_url ?? null,
      descripcion:   datos.descripcion ?? null,
      acepta_turnos: true,
      activo:        true,
    })
    .select()
    .single()

  if (errBarbero || !barbero) {
    return { ok: false, error: errBarbero?.message ?? 'Error al crear barbero' }
  }

  // Asignar servicios
  if (datos.servicio_ids?.length) {
    await db.from('barberos_servicios').insert(
      datos.servicio_ids.map(sid => ({
        barbero_id:  barbero.id,
        servicio_id: sid,
      }))
    )
  }

  // Asignar disponibilidad
  if (datos.disponibilidad?.length) {
    await db.from('barberos_disponibilidad').insert(
      datos.disponibilidad.map(d => ({
        barbero_id:  barbero.id,
        dia_semana:  d.dia_semana,
        hora_inicio: d.hora_inicio,
        hora_fin:    d.hora_fin,
      }))
    )
  }

  return { ok: true, data: { ...barbero, nombre: usuario.nombre, email: usuario.email } }
}

// ── Baja ─────────────────────────────────────────────────────
export async function darBajaBarbero(
  barberia_id: string,
  barbero_id: string,
  motivo?: string
): Promise<Result<{ turno_activo: boolean; liquidacion_id: string | null; turnos_cancelados: number }>> {

  const db = createAdminClient()

  // Validar que pertenece a esta barbería
  const { data: barbero } = await db
    .from('barberos')
    .select('barberia_id, activo')
    .eq('id', barbero_id)
    .single()

  if (!barbero || barbero.barberia_id !== barberia_id) {
    return { ok: false, error: 'Barbero no encontrado en esta barbería' }
  }

  if (!barbero.activo) {
    return { ok: false, error: 'El barbero ya está dado de baja' }
  }

  // Verificar si hay turno en curso ahora mismo
  const { data: turnoActivo } = await db
    .from('turnos')
    .select('id')
    .eq('barbero_id', barbero_id)
    .eq('estado', 'en_curso')
    .single()

  if (turnoActivo) {
    // Registrar baja pendiente para después del turno
    await db.from('bajas_pendientes').insert({
      barbero_id,
      turno_id: turnoActivo.id,
      motivo:   motivo ?? null,
    })

    return {
      ok: true,
      data: {
        turno_activo:      true,
        liquidacion_id:    null,
        turnos_cancelados: 0,
      },
    }
  }

  // Paso 1: bloquear nuevas reservas
  await db
    .from('barberos')
    .update({ acepta_turnos: false })
    .eq('id', barbero_id)

  // Paso 2: cancelar turnos futuros
  const { cancelados } = await cancelarTurnosFuturos(barbero_id)

  // Paso 3: generar liquidación de cierre
  const hoy    = new Date()
  const inicio = startOfMonth(hoy)

  const liquidacion = await generarLiquidacion(
    barberia_id,
    barbero_id,
    format(inicio, 'yyyy-MM-dd'),
    format(hoy,    'yyyy-MM-dd')
  )

  // Paso 4: dar de baja
  await db
    .from('barberos')
    .update({
      activo:      false,
      acepta_turnos: false,
      fecha_baja:  hoy.toISOString(),
      motivo_baja: motivo ?? null,
    })
    .eq('id', barbero_id)

  await db
    .from('usuarios')
    .update({ activo: false })
    .in('id',
      db.from('barberos').select('usuario_id').eq('id', barbero_id)
    )

  return {
    ok: true,
    data: {
      turno_activo:      false,
      liquidacion_id:    liquidacion?.id ?? null,
      turnos_cancelados: cancelados,
    },
  }
}

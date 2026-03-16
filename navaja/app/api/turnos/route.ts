import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { calcularComisiones } from '@/lib/services/comisiones'
import { crearPreferencia } from '@/lib/mp/client'
import { z } from 'zod'

const schema = z.object({
  barberia_id:  z.string().uuid(),
  barbero_id:   z.string().uuid(),
  servicio_id:  z.string().uuid(),
  fecha_hora_inicio: z.string().datetime(),
  cliente: z.object({
    nombre:   z.string().min(2),
    telefono: z.string().min(8),
    email:    z.string().email().optional(),
  }),
})

export async function POST(req: NextRequest) {
  const body = await req.json()

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { barberia_id, barbero_id, servicio_id, fecha_hora_inicio, cliente } = parsed.data
  const db = createAdminClient()

  // Verificar barbería activa
  const { data: barberia } = await db
    .from('barberias')
    .select('*')
    .eq('id', barberia_id)
    .eq('estado', 'activa')
    .single()

  if (!barberia) {
    return NextResponse.json({ error: 'Barbería no disponible' }, { status: 400 })
  }

  // Obtener servicio
  const { data: servicio } = await db
    .from('servicios')
    .select('*')
    .eq('id', servicio_id)
    .eq('activo', true)
    .single()

  if (!servicio) {
    return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 400 })
  }

  // Verificar que el slot sigue disponible
  const fecha_fin = new Date(
    new Date(fecha_hora_inicio).getTime() + servicio.duracion_min * 60 * 1000
  ).toISOString()

  const { data: conflicto } = await db
    .from('turnos')
    .select('id')
    .eq('barbero_id', barbero_id)
    .not('estado', 'in', '("cancelado","cancelado_por_local")')
    .lt('fecha_hora_inicio', fecha_fin)
    .gt('fecha_hora_fin', fecha_hora_inicio)
    .limit(1)
    .single()

  if (conflicto) {
    return NextResponse.json({ error: 'El horario ya no está disponible' }, { status: 409 })
  }

  // Crear o encontrar cliente
  let cliente_id: string
  const { data: clienteExistente } = await db
    .from('clientes')
    .select('id')
    .eq('barberia_id', barberia_id)
    .ilike('telefono', `%${cliente.telefono.replace(/\D/g, '').slice(-10)}`)
    .single()

  if (clienteExistente) {
    cliente_id = clienteExistente.id
  } else {
    const { data: nuevoCliente, error: errCliente } = await db
      .from('clientes')
      .insert({
        barberia_id,
        nombre:   cliente.nombre,
        telefono: cliente.telefono,
        email:    cliente.email ?? null,
      })
      .select('id')
      .single()

    if (errCliente || !nuevoCliente) {
      return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 })
    }
    cliente_id = nuevoCliente.id
  }

  // Calcular comisiones
  const comisiones = await calcularComisiones(barberia_id, barbero_id, servicio.precio)

  // Crear turno en estado pendiente_pago
  const { data: turno, error: errTurno } = await db
    .from('turnos')
    .insert({
      barberia_id,
      barbero_id,
      servicio_id,
      cliente_id,
      fecha_hora_inicio,
      // fecha_hora_fin se calcula por el trigger
      monto_total:             comisiones.monto_total,
      monto_mp_comision:       comisiones.monto_mp_comision,
      monto_neto:              comisiones.monto_neto,
      monto_plataforma:        comisiones.monto_plataforma,
      monto_barberia:          comisiones.monto_barberia,
      monto_barbero:           comisiones.monto_barbero,
      monto_dueno:             comisiones.monto_dueno,
      comision_plataforma_pct: comisiones.comision_plataforma_pct,
      comision_barbero_pct:    comisiones.comision_barbero_pct,
      estado:                  'pendiente_pago',
    })
    .select(`
      *,
      clientes(nombre, telefono, email),
      barberos(usuarios(nombre)),
      servicios(nombre)
    `)
    .single()

  if (errTurno || !turno) {
    return NextResponse.json({ error: 'Error al crear turno' }, { status: 500 })
  }

  // Crear preferencia de MercadoPago
  const preferencia = await crearPreferencia(
    {
      ...turno,
      barbero_nombre:  turno.barberos?.usuarios?.nombre ?? '',
      servicio_nombre: turno.servicios?.nombre ?? '',
      cliente_email:   turno.clientes?.email ?? `${Date.now()}@navaja.app`,
    },
    barberia
  )

  if (!preferencia) {
    // Limpiar turno si MP falla
    await db.from('turnos').delete().eq('id', turno.id)
    return NextResponse.json({ error: 'Error al crear pago en MercadoPago' }, { status: 500 })
  }

  // Guardar preference_id y expiración (30 min)
  await db
    .from('turnos')
    .update({
      mp_preference_id:        preferencia.preference_id,
      mp_preference_expira_en: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    })
    .eq('id', turno.id)

  return NextResponse.json({
    turno_id:   turno.id,
    init_point: preferencia.init_point,  // URL de MercadoPago
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { validarFirmaWebhook, obtenerPago } from '@/lib/mp/client'
import {
  notificarTurnoConfirmado,
  notificarAvisoBarberoTurnoNuevo,
} from '@/lib/whatsapp/client'
import { format, addHours, parseISO } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const TZ = 'America/Argentina/Buenos_Aires'

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Validar firma de Meta
  const signature  = req.headers.get('x-signature')
  const request_id = req.headers.get('x-request-id')

  if (body.data?.id) {
    const parts     = (signature ?? '').split(',')
    const timestamp = parts[0]?.split('=')[1] ?? ''
    const valid     = await validarFirmaWebhook(signature, request_id, body.data.id, timestamp)
    if (!valid) {
      return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
    }
  }

  const db = createAdminClient()

  // ── Evento de pago ──────────────────────────────────────────
  if (body.type === 'payment') {
    const payment = await obtenerPago(body.data.id)
    if (!payment) return NextResponse.json({ ok: true })

    // Buscar el turno por external_reference o preference_id
    const { data: turno } = await db
      .from('turnos')
      .select(`
        *,
        barberias(*),
        clientes(nombre, telefono, email),
        barberos(usuario_id, usuarios(nombre, telefono)),
        servicios(nombre, duracion_min)
      `)
      .or(`id.eq.${payment.external_reference},mp_preference_id.eq.${payment.preference_id}`)
      .single()

    if (!turno) return NextResponse.json({ ok: true })

    switch (payment.status) {

      case 'approved': {
        // Calcular comisión real de MP desde fee_details
        const fee_mp = payment.fee_details?.find(
          (f: any) => f.type === 'mercadopago_fee'
        )?.amount ?? 0

        await db
          .from('turnos')
          .update({
            estado:           'confirmado',
            mp_payment_id:    payment.id,
            monto_mp_comision: fee_mp,
          })
          .eq('id', turno.id)

        // Notificar al cliente
        const inicio    = toZonedTime(parseISO(turno.fecha_hora_inicio), TZ)
        const hs_cancel = turno.barberias?.hs_cancelacion ?? 3
        const limite    = toZonedTime(addHours(inicio, -hs_cancel), TZ)

        await notificarTurnoConfirmado({
          barberia:           turno.barberias,
          cliente_nombre:     turno.clientes.nombre,
          cliente_telefono:   turno.clientes.telefono,
          servicio_nombre:    turno.servicios.nombre,
          barbero_nombre:     turno.barberos.usuarios.nombre,
          fecha:              format(inicio, "EEEE d 'de' MMMM"),
          hora:               format(inicio, 'HH:mm'),
          limite_cancelacion: format(limite, "HH:mm 'del' d/M"),
          url_cancelacion:    `${process.env.NEXT_PUBLIC_APP_URL}/${turno.barberias.slug}/turno/${turno.id}`,
        })

        // Notificar al barbero
        await notificarAvisoBarberoTurnoNuevo({
          barberia:         turno.barberias,
          barbero_nombre:   turno.barberos.usuarios.nombre,
          barbero_telefono: turno.barberos.usuarios.telefono,
          cliente_nombre:   turno.clientes.nombre,
          servicio_nombre:  turno.servicios.nombre,
          fecha:            format(inicio, "d/M"),
          hora:             format(inicio, 'HH:mm'),
        })
        break
      }

      case 'rejected':
      case 'cancelled':
        // No cambiar estado — el cliente puede reintentar dentro de la ventana
        break

      case 'refunded':
        await db
          .from('turnos')
          .update({ mp_reembolso_id: payment.id })
          .eq('id', turno.id)
        break
    }
  }

  // ── Evento de suscripción ───────────────────────────────────
  if (body.type === 'subscription_preapproval') {
    const sub_id = body.data.id

    const { data: barberia } = await db
      .from('barberias')
      .select('id, nombre, telefono, suscripcion_estado')
      .eq('mp_subscription_id', sub_id)
      .single()

    if (barberia) {
      // Obtener estado real de la suscripción desde MP
      const res  = await fetch(
        `https://api.mercadopago.com/preapproval/${sub_id}`,
        { headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN_PLATFORM}` } }
      )
      const sub = await res.json()

      let nuevo_estado = barberia.suscripcion_estado
      let nuevo_estado_barberia = undefined

      if (sub.status === 'authorized') {
        nuevo_estado = 'activa'
        nuevo_estado_barberia = 'activa'
      } else if (['paused', 'cancelled'].includes(sub.status)) {
        nuevo_estado = 'suspendida'
        nuevo_estado_barberia = 'suspendida'
      }

      await db
        .from('barberias')
        .update({
          suscripcion_estado: nuevo_estado,
          ...(nuevo_estado_barberia ? { estado: nuevo_estado_barberia } : {}),
        })
        .eq('id', barberia.id)
    }
  }

  // Siempre responder 200 a MP
  return NextResponse.json({ ok: true })
}

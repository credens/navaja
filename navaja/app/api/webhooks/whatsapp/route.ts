import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { cancelarTurno } from '@/lib/services/cancelaciones'
import { sendText, marcarLeido, formatTelefono } from '@/lib/whatsapp/client'
import { format, parseISO } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const TZ = 'America/Argentina/Buenos_Aires'

// Verificación del webhook por Meta
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WSP_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }
  return new Response('Forbidden', { status: 403 })
}

// Recibir mensajes entrantes
export async function POST(req: NextRequest) {
  const body = await req.json()

  const entry   = body.entry?.[0]
  const changes = entry?.changes?.[0]
  const messages = changes?.value?.messages

  if (!messages?.length) return NextResponse.json({ ok: true })

  const phone_number_id = changes.value.phone_number_id

  for (const msg of messages) {
    const telefono = msg.from
    const texto    = msg.text?.body?.trim().toUpperCase() ?? ''
    const wamid    = msg.id

    // Marcar como leído
    await marcarLeido(wamid, phone_number_id)

    if (texto === 'CANCELAR') {
      await procesarCancelacionPorWsp(telefono, phone_number_id)
    } else {
      // Respuesta automática
      await sendText(null, telefono,
        'Hola! Para gestionar tu turno ingresá a navaja.app o respondé *CANCELAR* para cancelar tu próximo turno.'
      )
    }
  }

  return NextResponse.json({ ok: true })
}

async function procesarCancelacionPorWsp(
  telefono: string,
  phone_number_id: string
) {
  const db = createAdminClient()

  // Buscar el próximo turno confirmado de este teléfono
  const tel_normalizado = formatTelefono(telefono).replace('+', '')

  const { data: turno } = await db
    .from('v_turnos_completo')
    .select('*')
    .ilike('cliente_telefono', `%${tel_normalizado.slice(-10)}`)
    .eq('estado', 'confirmado')
    .gt('fecha_hora_inicio', new Date().toISOString())
    .order('fecha_hora_inicio', { ascending: true })
    .limit(1)
    .single()

  if (!turno) {
    await sendText(null, telefono,
      'No encontramos turnos activos para este número. Si tenés un turno con otro número, ingresá a navaja.app.'
    )
    return
  }

  const resultado = await cancelarTurno(turno.id, 'cliente')

  const inicio = toZonedTime(parseISO(turno.fecha_hora_inicio), TZ)
  const fecha  = format(inicio, "d/M 'a las' HH:mm")

  if (!resultado.ok) {
    await sendText(null, telefono, `No pudimos cancelar tu turno. Ingresá a navaja.app para gestionarlo.`)
    return
  }

  if (resultado.data.reembolso) {
    await sendText(null, telefono,
      `✓ Tu turno del ${fecha} fue cancelado. El reembolso de $${turno.monto_total?.toLocaleString('es-AR')} se acreditará en 3 a 5 días hábiles.`
    )
  } else {
    const { data: barberia } = await db
      .from('barberias')
      .select('hs_cancelacion')
      .eq('id', turno.barberia_id)
      .single()
    const hs = barberia?.hs_cancelacion ?? 3

    await sendText(null, telefono,
      `Tu turno del ${fecha} fue cancelado. Como la cancelación fue con menos de ${hs}hs de anticipación, el pago de $${turno.monto_total?.toLocaleString('es-AR')} no es reembolsable.`
    )
  }
}

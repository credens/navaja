import type { Turno, Barberia } from '@/types'

const MP_API = 'https://api.mercadopago.com'

// Crear preferencia de pago (Checkout Pro + marketplace_fee)
export async function crearPreferencia(
  turno: Turno & { barbero_nombre: string; servicio_nombre: string; cliente_email: string },
  barberia: Barberia
): Promise<{ preference_id: string; init_point: string } | null> {

  const expira_en = new Date(Date.now() + 30 * 60 * 1000).toISOString()

  const body = {
    items: [{
      title:       turno.servicio_nombre,
      quantity:    1,
      unit_price:  turno.monto_total,
      currency_id: 'ARS',
    }],
    marketplace_fee:  turno.monto_plataforma,   // split automático a la plataforma
    payer: {
      email: turno.cliente_email,
    },
    back_urls: {
      success: `${process.env.NEXT_PUBLIC_APP_URL}/reserva/${turno.id}/confirmado`,
      failure: `${process.env.NEXT_PUBLIC_APP_URL}/reserva/${turno.id}/error`,
      pending: `${process.env.NEXT_PUBLIC_APP_URL}/reserva/${turno.id}/pendiente`,
    },
    auto_return:        'approved',
    notification_url:   `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mp`,
    external_reference: turno.id,
    expires:            true,
    expiration_date_to: expira_en,
    statement_descriptor: 'NAVAJA TURNOS',
  }

  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${barberia.mp_access_token}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    console.error('[MP] crearPreferencia error:', await res.text())
    return null
  }

  const data = await res.json()
  return {
    preference_id: data.id,
    init_point:    data.init_point,
  }
}

// Obtener pago por ID
export async function obtenerPago(payment_id: string) {
  const res = await fetch(`${MP_API}/v1/payments/${payment_id}`, {
    headers: {
      'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN_PLATFORM}`,
    },
  })
  if (!res.ok) return null
  return res.json()
}

// Validar firma del webhook
export async function validarFirmaWebhook(
  signature: string | null,
  request_id: string | null,
  data_id: string,
  timestamp: string
): Promise<boolean> {
  if (!signature) return false

  const manifest = `id:${data_id};request-id:${request_id};ts:${timestamp};`
  const hash_recibido = signature.split('v1=')[1]
  if (!hash_recibido) return false

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(process.env.MP_WEBHOOK_SECRET!),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const firma = await crypto.subtle.sign('HMAC', key, encoder.encode(manifest))
  const hash_calculado = Buffer.from(firma).toString('hex')

  return hash_calculado === hash_recibido
}

// OAuth: intercambiar code por tokens
export async function exchangeOAuthCode(code: string): Promise<{
  access_token: string
  refresh_token: string
  user_id: string
} | null> {

  const res = await fetch(`${MP_API}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type:    'authorization_code',
      client_id:     process.env.MP_APP_ID,
      client_secret: process.env.MP_CLIENT_SECRET,
      code,
      redirect_uri:  `${process.env.NEXT_PUBLIC_APP_URL}/api/mp/callback`,
    }),
  })

  if (!res.ok) return null
  return res.json()
}

// Renovar access_token
export async function renovarToken(refresh_token: string) {
  const res = await fetch(`${MP_API}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type:    'refresh_token',
      client_id:     process.env.MP_APP_ID,
      client_secret: process.env.MP_CLIENT_SECRET,
      refresh_token,
    }),
  })
  if (!res.ok) return null
  return res.json()
}

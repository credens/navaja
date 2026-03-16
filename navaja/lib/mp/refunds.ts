import { createAdminClient } from '@/lib/supabase/server'
import type { Result, Turno } from '@/types'

const MP_API = 'https://api.mercadopago.com'

export async function procesarReembolso(turno: Turno): Promise<Result<string>> {

  if (!turno.mp_payment_id) {
    return { ok: false, error: 'El turno no tiene pago de MP asociado' }
  }

  const db = createAdminClient()

  // Obtener access_token de la barbería
  const { data: barberia } = await db
    .from('barberias')
    .select('mp_access_token')
    .eq('id', turno.barberia_id)
    .single()

  if (!barberia?.mp_access_token) {
    return { ok: false, error: 'No se encontró el token de MP de la barbería' }
  }

  const res = await fetch(
    `${MP_API}/v1/payments/${turno.mp_payment_id}/refunds`,
    {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${barberia.mp_access_token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({}),  // body vacío = reembolso total
    }
  )

  if (!res.ok) {
    const err = await res.text()
    return { ok: false, error: err }
  }

  const data = await res.json()

  // Guardar ID del reembolso en el turno
  await db
    .from('turnos')
    .update({ mp_reembolso_id: data.id })
    .eq('id', turno.id)

  return { ok: true, data: data.id }
}

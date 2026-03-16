import { createAdminClient } from '@/lib/supabase/server'
import type { Barberia } from '@/types'

const META_API = 'https://graph.facebook.com/v19.0'

interface WspConfig {
  phone_number_id: string
  access_token: string
}

function getConfig(barberia: Barberia | null): WspConfig {
  if (barberia?.wsp_modo === 'propio' && barberia.wsp_phone_number_id) {
    return {
      phone_number_id: barberia.wsp_phone_number_id,
      access_token:    barberia.wsp_access_token!,
    }
  }
  return {
    phone_number_id: process.env.WSP_PLATFORM_PHONE_NUMBER_ID!,
    access_token:    process.env.WSP_PLATFORM_ACCESS_TOKEN!,
  }
}

// Enviar template
async function sendTemplate(
  barberia: Barberia | null,
  to: string,
  template: string,
  params: string[]
): Promise<{ ok: boolean; message_id?: string; error?: string }> {

  const config = getConfig(barberia)
  const numero = formatTelefono(to)

  const res = await fetch(`${META_API}/${config.phone_number_id}/messages`, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${config.access_token}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to:     numero,
      type:   'template',
      template: {
        name:     template,
        language: { code: 'es_AR' },
        components: [{
          type:       'body',
          parameters: params.map(p => ({ type: 'text', text: String(p) })),
        }],
      },
    }),
  })

  const data = await res.json()
  if (!res.ok) return { ok: false, error: data.error?.message }
  return { ok: true, message_id: data.messages?.[0]?.id }
}

// Enviar texto libre (solo dentro de ventana de 24hs)
export async function sendText(
  barberia: Barberia | null,
  to: string,
  texto: string
): Promise<{ ok: boolean }> {

  const config = getConfig(barberia)

  const res = await fetch(`${META_API}/${config.phone_number_id}/messages`, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${config.access_token}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to:   formatTelefono(to),
      type: 'text',
      text: { body: texto },
    }),
  })

  return { ok: res.ok }
}

// Marcar mensaje como leído
export async function marcarLeido(wamid: string, phone_number_id: string) {
  await fetch(`${META_API}/${phone_number_id}/messages`, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${process.env.WSP_PLATFORM_ACCESS_TOKEN}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status:     'read',
      message_id: wamid,
    }),
  })
}

// ── Templates ─────────────────────────────────────────────────

export async function notificarTurnoConfirmado(params: {
  barberia: Barberia
  cliente_nombre: string
  cliente_telefono: string
  servicio_nombre: string
  barbero_nombre: string
  fecha: string
  hora: string
  limite_cancelacion: string
  url_cancelacion: string
}) {
  return sendTemplate(params.barberia, params.cliente_telefono, 'turno_confirmado', [
    params.cliente_nombre,
    params.barberia.nombre,
    params.servicio_nombre,
    params.barbero_nombre,
    params.fecha,
    params.hora,
    params.barberia.direccion ?? '',
    params.limite_cancelacion,
    params.url_cancelacion,
  ])
}

export async function notificarRecordatorio24hs(params: {
  barberia: Barberia
  cliente_nombre: string
  cliente_telefono: string
  servicio_nombre: string
  barbero_nombre: string
  fecha: string
  hora: string
}) {
  return sendTemplate(params.barberia, params.cliente_telefono, 'turno_recordatorio_24hs', [
    params.barberia.nombre,
    params.servicio_nombre,
    params.barbero_nombre,
    params.fecha,
    params.hora,
    params.barberia.direccion ?? '',
  ])
}

export async function notificarRecordatorio2hs(params: {
  barberia: Barberia
  cliente_nombre: string
  cliente_telefono: string
  servicio_nombre: string
  barbero_nombre: string
  hora: string
}) {
  return sendTemplate(params.barberia, params.cliente_telefono, 'turno_recordatorio_2hs', [
    params.barberia.nombre,
    params.servicio_nombre,
    params.barbero_nombre,
    params.hora,
    params.barberia.direccion ?? '',
  ])
}

export async function notificarCancelacionConReembolso(params: {
  barberia: Barberia
  cliente_nombre: string
  cliente_telefono: string
  fecha: string
  hora: string
  monto: number
}) {
  return sendTemplate(params.barberia, params.cliente_telefono, 'turno_cancelado_reembolso', [
    params.cliente_nombre,
    params.fecha,
    params.hora,
    params.barberia.nombre,
    formatPrecio(params.monto),
  ])
}

export async function notificarCancelacionSinReembolso(params: {
  barberia: Barberia
  cliente_nombre: string
  cliente_telefono: string
  fecha: string
  hora: string
  monto: number
  hs_cancelacion: number
}) {
  return sendTemplate(params.barberia, params.cliente_telefono, 'turno_cancelado_sin_reembolso', [
    params.cliente_nombre,
    params.fecha,
    params.hora,
    params.barberia.nombre,
    String(params.hs_cancelacion),
    formatPrecio(params.monto),
  ])
}

export async function notificarAvisoBarberoTurnoNuevo(params: {
  barberia: Barberia
  barbero_nombre: string
  barbero_telefono: string
  cliente_nombre: string
  servicio_nombre: string
  fecha: string
  hora: string
}) {
  return sendTemplate(params.barberia, params.barbero_telefono, 'aviso_barbero_turno_nuevo', [
    params.barbero_nombre,
    params.cliente_nombre,
    params.servicio_nombre,
    params.fecha,
    params.hora,
  ])
}

export async function notificarNoShow(params: {
  barberia: Barberia
  barbero_nombre: string
  barbero_telefono: string
  cliente_nombre: string
  hora: string
  monto: number
}) {
  return sendTemplate(params.barberia, params.barbero_telefono, 'aviso_no_show', [
    params.barbero_nombre,
    params.cliente_nombre,
    params.hora,
    formatPrecio(params.monto),
  ])
}

export async function notificarLiquidacionGenerada(params: {
  barberia: Barberia
  barbero_nombre: string
  barbero_telefono: string
  periodo_desde: string
  periodo_hasta: string
  turnos: number
  monto: number
  url: string
}) {
  return sendTemplate(params.barberia, params.barbero_telefono, 'liquidacion_generada', [
    params.barbero_nombre,
    params.periodo_desde,
    params.periodo_hasta,
    String(params.turnos),
    formatPrecio(params.monto),
    params.url,
  ])
}

export async function notificarCanonFallido(params: {
  barberia: Barberia
  dueno_nombre: string
  dueno_telefono: string
  horas_restantes: number
  url: string
}) {
  return sendTemplate(null, params.dueno_telefono, 'canon_fallido', [
    params.dueno_nombre,
    String(params.horas_restantes),
    params.url,
  ])
}

// ── Helpers ───────────────────────────────────────────────────

export function formatTelefono(tel: string): string {
  let n = tel.replace(/\D/g, '')
  if (n.startsWith('549'))  return `+${n}`
  if (n.startsWith('54'))   return `+${n}`
  if (n.startsWith('0'))    n = n.slice(1)
  if (n.startsWith('15'))   n = n.slice(2)
  return `+549${n}`
}

function formatPrecio(n: number): string {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 0 })
}

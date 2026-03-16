import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  notificarTrialPorVencer,
  notificarTrialVencido,
  notificarOnboardingActivado,
} from '@/lib/whatsapp/onboarding'
import { notificarCanonFallido } from '@/lib/whatsapp/client'
import { addDays, format } from 'date-fns'

// Vercel Cron: corre todos los días a las 9:00 AM
// vercel.json: { "crons": [{ "path": "/api/cron/suscripciones", "schedule": "0 9 * * *" }] }
export async function GET(req: NextRequest) {

  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db    = createAdminClient()
  const hoy   = new Date()
  const stats = { avisos_vencimiento: 0, suspendidas: 0, reactivadas: 0, canon_fallido: 0 }

  // ── 1. Trials que vencen en 2 días → aviso ───────────────────
  const en2dias = addDays(hoy, 2).toISOString().split('T')[0]

  const { data: porVencer } = await db
    .from('barberias')
    .select('id, nombre, telefono, suscripcion_vence_en')
    .eq('suscripcion_estado', 'trial')
    .eq('suscripcion_vence_en', en2dias)

  for (const b of porVencer ?? []) {
    await notificarTrialPorVencer(b as any)
    stats.avisos_vencimiento++
  }

  // ── 2. Trials vencidos sin plan → suspender ──────────────────
  const { data: vencidos } = await db
    .from('barberias')
    .select('id, nombre, telefono')
    .eq('suscripcion_estado', 'trial')
    .is('plan_id', null)
    .lt('suscripcion_vence_en', hoy.toISOString().split('T')[0])

  for (const b of vencidos ?? []) {
    await db
      .from('barberias')
      .update({ suscripcion_estado: 'suspendida', estado: 'suspendida' })
      .eq('id', b.id)

    await notificarTrialVencido(b as any)
    stats.suspendidas++
  }

  // ── 3. Suscripciones suspendidas hace 2 días → 2do aviso ─────
  const { data: suspendidas } = await db
    .from('barberias')
    .select('id, nombre, telefono')
    .eq('suscripcion_estado', 'suspendida')
    .eq('estado', 'activa')   // todavía activas pero con sub suspendida
    .lt('actualizado_en', addDays(hoy, -1).toISOString())
    .gt('actualizado_en',  addDays(hoy, -3).toISOString())

  for (const b of suspendidas ?? []) {
    await notificarCanonFallido({
      barberia:         b as any,
      dueno_nombre:     b.nombre,
      dueno_telefono:   b.telefono ?? '',
      horas_restantes:  24,
      url:              `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/plan`,
    })
    stats.canon_fallido++
  }

  console.log('[cron/suscripciones]', stats)
  return NextResponse.json({ ok: true, stats })
}

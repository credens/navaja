import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const db   = createAdminClient()
  const body = await req.json()
  const { barberia_id, servicios, horarios } = body

  // Insertar servicios
  if (servicios?.length) {
    const svcs = servicios.map((s: any, i: number) => ({
      barberia_id,
      nombre:       s.nombre,
      precio:       parseFloat(s.precio),
      duracion_min: parseInt(s.duracion) || 30,
      orden:        i + 1,
      activo:       true,
    }))

    const { error } = await db.from('servicios').insert(svcs)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Insertar horarios
  if (horarios?.length) {
    const hors = horarios.map((h: any) => ({
      barberia_id,
      dia_semana:   h.dia,
      hora_apertura: h.apertura,
      hora_cierre:   h.cierre,
      activo:        true,
    }))

    const { error } = await db.from('barberias_horarios').insert(hors)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Marcar onboarding completo
  await db
    .from('barberias')
    .update({ onboarding_completado: true, onboarding_paso_actual: 5 })
    .eq('id', barberia_id)

  return NextResponse.json({ ok: true })
}

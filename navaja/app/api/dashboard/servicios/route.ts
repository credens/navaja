import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const db   = createAdminClient()

  // Calcular orden
  const { count } = await db
    .from('servicios')
    .select('id', { count: 'exact', head: true })
    .eq('barberia_id', body.barberia_id)

  const { data, error } = await db
    .from('servicios')
    .insert({
      barberia_id:  body.barberia_id,
      nombre:       body.nombre,
      descripcion:  body.descripcion || null,
      precio:       body.precio,
      duracion_min: body.duracion_min,
      orden:        (count ?? 0) + 1,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

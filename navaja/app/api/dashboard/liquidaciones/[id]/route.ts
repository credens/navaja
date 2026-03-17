import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const db   = createAdminClient()

  const update: any = {}
  if (body.nombre      !== undefined) update.nombre       = body.nombre
  if (body.descripcion !== undefined) update.descripcion  = body.descripcion
  if (body.precio      !== undefined) update.precio       = body.precio
  if (body.duracion_min !== undefined) update.duracion_min = body.duracion_min
  if (body.activo      !== undefined) update.activo       = body.activo

  const { data, error } = await db
    .from('servicios')
    .update(update)
    .eq('id', params.id)
    .eq('barberia_id', body.barberia_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

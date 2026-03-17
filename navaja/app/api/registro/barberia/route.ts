import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const db = createAdminClient()
  const body = await req.json()

  const { auth_id, nombre, email, telefono, barberia_nombre, barberia_dir, slug } = body

  // Verificar slug disponible
  const { data: existing } = await db
    .from('barberias')
    .select('id')
    .eq('slug', slug)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Ese nombre de URL ya está en uso. Elegí otro.' }, { status: 400 })
  }

  // Crear barbería
  const { data: barberia, error: errBar } = await db
    .from('barberias')
    .insert({
      nombre:            barberia_nombre,
      slug,
      email,
      telefono:          telefono || null,
      direccion:         barberia_dir || null,
      estado:            'activa',
      suscripcion_estado: 'trial',
      suscripcion_vence_en: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    })
    .select('id')
    .single()

  if (errBar || !barberia) {
    return NextResponse.json({ error: errBar?.message ?? 'Error al crear la barbería' }, { status: 500 })
  }

  // Crear usuario dueño
  const { error: errUser } = await db
    .from('usuarios')
    .insert({
      auth_id,
      barberia_id: barberia.id,
      nombre,
      email,
      telefono: telefono || null,
      rol: 'dueno',
    })

  if (errUser) {
    // Limpiar barbería si falla el usuario
    await db.from('barberias').delete().eq('id', barberia.id)
    return NextResponse.json({ error: errUser.message }, { status: 500 })
  }

  return NextResponse.json({ barberia_id: barberia.id })
}

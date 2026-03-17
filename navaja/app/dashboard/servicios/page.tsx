import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ServiciosClient from './_client'

export default async function ServiciosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/registro')

  const db = createAdminClient()
  const { data: usuario } = await db
    .from('usuarios')
    .select('barberia_id')
    .eq('auth_id', user.id)
    .single()

  if (!usuario) redirect('/registro')

  const { data: servicios } = await db
    .from('servicios')
    .select('id, nombre, descripcion, precio, duracion_min, activo, orden')
    .eq('barberia_id', usuario.barberia_id)
    .order('orden', { ascending: true })

  return (
    <ServiciosClient
      servicios={servicios ?? []}
      barberia_id={usuario.barberia_id}
    />
  )
}

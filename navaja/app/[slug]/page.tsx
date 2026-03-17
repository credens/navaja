import { createAdminClient as createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import ReservaFlow from './_components/ReservaFlow'

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const db = createClient()
  const { data: barberia } = await db
    .from('barberias')
    .select('nombre, direccion')
    .eq('slug', params.slug)
    .single()

  // console.log('slug:', params.slug)
  // console.log('barberia:', barberia)
  // console.log('error:', error)

  if (!barberia) return { title: 'Navaja' }

  return {
    title: `${barberia.nombre} — Reservá tu turno`,
    description: `Reservá tu turno en ${barberia.nombre}. ${barberia.direccion ?? ''}`,
  }
}

export default async function BarberiaPage({ params }: Props) {
  const db = createClient()

  // Cargar barbería
  const { data: barberia } = await db
    .from('barberias')
    .select('id, nombre, slug, direccion, telefono, logo_url, hs_cancelacion')
    .eq('slug', params.slug)
    .eq('estado', 'activa')
    .single()

  if (!barberia) notFound()

  // Cargar servicios activos
  const { data: servicios } = await db
    .from('servicios')
    .select('id, nombre, descripcion, precio, duracion_min, orden')
    .eq('barberia_id', barberia.id)
    .eq('activo', true)
    .order('orden', { ascending: true })

  // Cargar barberos activos
  const { data: barberos } = await db
    .from('barberos')
    .select('id, foto_url, descripcion, comision_pct, usuarios(nombre)')
    .eq('barberia_id', barberia.id)
    .eq('activo', true)
    .eq('acepta_turnos', true)

  // Normalizar barberos
  const barberosList = (barberos ?? []).map((b: any) => ({
    id:          b.id,
    nombre:      b.usuarios?.nombre ?? '',
    foto_url:    b.foto_url,
    descripcion: b.descripcion,
  }))

  return (
    <ReservaFlow
      barberia={barberia}
      servicios={servicios ?? []}
      barberos={barberosList}
    />
  )
}

import { createAdminClient } from '@/lib/supabase/server'
import BarberosClient from './_components/BarberosClient'

const BARBERIA_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

export default async function BarberosPage() {
  const db = createAdminClient()

  const { data: barberos } = await db
    .from('barberos')
    .select('id, comision_pct, foto_url, descripcion, activo, acepta_turnos, fecha_baja, usuarios(nombre, email, telefono)')
    .eq('barberia_id', BARBERIA_ID)
    .order('activo', { ascending: false })

  const { data: servicios } = await db
    .from('servicios')
    .select('id, nombre')
    .eq('barberia_id', BARBERIA_ID)
    .eq('activo', true)

  const lista = (barberos ?? []).map((b: any) => ({
    id:           b.id,
    nombre:       b.usuarios?.nombre ?? '',
    email:        b.usuarios?.email ?? '',
    telefono:     b.usuarios?.telefono ?? '',
    comision_pct: b.comision_pct,
    descripcion:  b.descripcion,
    activo:       b.activo,
    acepta_turnos: b.acepta_turnos,
    fecha_baja:   b.fecha_baja,
  }))

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Barberos</div>
      </div>
      <div className="dash-content">
        <BarberosClient
          barberos={lista}
          servicios={servicios ?? []}
          barberia_id={BARBERIA_ID}
        />
      </div>
    </>
  )
}

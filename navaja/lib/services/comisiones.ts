import { createAdminClient } from '@/lib/supabase/server'
import type { ComisionesCalculadas } from '@/types'

const PCT_MP = 5.99  // comisión de MercadoPago

export async function calcularComisiones(
  barberia_id: string,
  barbero_id: string,
  precio: number
): Promise<ComisionesCalculadas> {

  const db = createAdminClient()

  // Obtener porcentaje de la plataforma (barbería o global)
  const { data: barberia } = await db
    .from('barberias')
    .select('comision_plataforma_pct')
    .eq('id', barberia_id)
    .single()

  const { data: config } = await db
    .from('plataforma_config')
    .select('comision_pct')
    .single()

  const { data: barbero } = await db
    .from('barberos')
    .select('comision_pct')
    .eq('id', barbero_id)
    .single()

  const pct_plataforma = barberia?.comision_plataforma_pct ?? config?.comision_pct ?? 5
  const pct_barbero    = barbero?.comision_pct ?? 50

  // Cálculo
  const monto_mp_comision = redondear(precio * PCT_MP / 100)
  const monto_neto        = precio - monto_mp_comision
  const monto_plataforma  = redondear(monto_neto * pct_plataforma / 100)
  const monto_barberia    = monto_neto - monto_plataforma
  const monto_barbero     = redondear(monto_barberia * pct_barbero / 100)
  const monto_dueno       = monto_barberia - monto_barbero  // absorbe centavos

  return {
    monto_total:             precio,
    monto_mp_comision,
    monto_neto,
    monto_plataforma,
    monto_barberia,
    monto_barbero,
    monto_dueno,
    comision_plataforma_pct: pct_plataforma,
    comision_barbero_pct:    pct_barbero,
  }
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100
}

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { exchangeOAuthCode } from '@/lib/mp/client'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code      = searchParams.get('code')
  const state     = searchParams.get('state')  // barberia_id

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/registro?error=mp_oauth_fallido', process.env.NEXT_PUBLIC_APP_URL!)
    )
  }

  const db = createAdminClient()

  // Verificar que la barbería existe y está en estado pendiente_mp
  const { data: barberia } = await db
    .from('barberias')
    .select('id, nombre, email, telefono')
    .eq('id', state)
    .eq('estado', 'pendiente_mp')
    .single()

  if (!barberia) {
    return NextResponse.redirect(
      new URL('/registro?error=barberia_no_encontrada', process.env.NEXT_PUBLIC_APP_URL!)
    )
  }

  // Intercambiar code por tokens
  const tokens = await exchangeOAuthCode(code)
  if (!tokens) {
    return NextResponse.redirect(
      new URL(`/registro?step=3&error=mp_token_fallido&bid=${state}`, process.env.NEXT_PUBLIC_APP_URL!)
    )
  }

  // Activar la barbería con trial de 7 días
  const vence = new Date()
  vence.setDate(vence.getDate() + 7)

  await db
    .from('barberias')
    .update({
      mp_access_token:     tokens.access_token,
      mp_refresh_token:    tokens.refresh_token,
      mp_user_id:          tokens.user_id,
      mp_token_vence:      new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      estado:              'activa',
      suscripcion_estado:  'trial',
      suscripcion_vence_en: vence.toISOString().split('T')[0],
    })
    .eq('id', state)

  // WSP de bienvenida
  const { notificarOnboardingActivado } = await import('@/lib/whatsapp/onboarding')
  await notificarOnboardingActivado(barberia, vence)

  return NextResponse.redirect(
    new URL('/dashboard?onboarding=mp_ok', process.env.NEXT_PUBLIC_APP_URL!)
  )
}

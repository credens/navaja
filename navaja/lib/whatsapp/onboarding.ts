import { sendTemplate } from '@/lib/whatsapp/client'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export async function notificarOnboardingActivado(
  barberia: { nombre: string; telefono: string | null },
  vence: Date
) {
  if (!barberia.telefono) return
  return sendTemplate(null, barberia.telefono, 'onboarding_mp_conectado', [
    barberia.nombre,
    format(vence, "d 'de' MMMM", { locale: es }),
    `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/plan`,
  ])
}

export async function notificarTrialPorVencer(
  barberia: { nombre: string; telefono: string | null; suscripcion_vence_en: string }
) {
  if (!barberia.telefono) return
  return sendTemplate(null, barberia.telefono, 'trial_por_vencer', [
    barberia.nombre,
    barberia.suscripcion_vence_en,
    `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/plan`,
  ])
}

export async function notificarTrialVencido(
  barberia: { nombre: string; telefono: string | null }
) {
  if (!barberia.telefono) return
  return sendTemplate(null, barberia.telefono, 'trial_vencido', [
    barberia.nombre,
    `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/plan`,
  ])
}

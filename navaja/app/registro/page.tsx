import { redirect } from 'next/navigation'

// Por ahora redirige al login
// El registro completo se implementa en la siguiente iteración
export default function RegistroPage() {
  redirect('/login')
}

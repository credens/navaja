'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface FormState {
  nombre: string; email: string; password: string; telefono: string
  barberia_nombre: string; barberia_dir: string; slug: string
  servicios: { nombre: string; precio: string; duracion: string }[]
  horarios:  { dia: number; activo: boolean; apertura: string; cierre: string }[]
}

const DIAS_LABELS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']

const SERVICIOS_DEFAULT = [
  { nombre: 'Corte',            precio: '', duracion: '30' },
  { nombre: 'Corte + Barba',    precio: '', duracion: '45' },
  { nombre: 'Arreglo de barba', precio: '', duracion: '20' },
]

const HORARIOS_DEFAULT = [0,1,2,3,4,5,6].map(d => ({
  dia: d, activo: d >= 1 && d <= 6,
  apertura: '09:00', cierre: d === 6 ? '18:00' : '20:00',
}))

function generarSlug(nombre: string) {
  return nombre.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 40)
}

function Stepper({ step }: { step: number }) {
  const steps = ['Tu cuenta','Tu barbería','MercadoPago','Configuración']
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '24px', height: '24px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: 600,
            background: i+1 < step ? '#c9a84c' : i+1 === step ? 'rgba(201,168,76,.15)' : '#161616',
            color: i+1 < step ? '#0a0a0a' : i+1 === step ? '#c9a84c' : '#444',
            border: i+1 === step ? '1px solid #c9a84c' : '1px solid #222',
          }}>
            {i+1 < step ? '✓' : i+1}
          </div>
          {i < steps.length-1 && (
            <div style={{ width: '24px', height: '1px', background: i+1 < step ? '#c9a84c' : '#222', opacity: .4 }} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function RegistroPage() {
  const router = useRouter()
  const [step, setStep]         = useState(1)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [barberia_id, setBid]   = useState<string | null>(null)

  const [form, setForm] = useState<FormState>({
    nombre: '', email: '', password: '', telefono: '',
    barberia_nombre: '', barberia_dir: '', slug: '',
    servicios: SERVICIOS_DEFAULT.map(s => ({ ...s })),
    horarios:  HORARIOS_DEFAULT.map(h => ({ ...h })),
  })

  const upd = (k: keyof FormState, v: any) => setForm(f => ({ ...f, [k]: v }))

  const inp: React.CSSProperties = {
    width: '100%', background: '#161616', border: '1px solid #222',
    color: '#f5f0e8', padding: '11px 14px', fontSize: '14px',
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '16px',
  }
  const lbl: React.CSSProperties = {
    fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase',
    color: '#666', display: 'block', marginBottom: '7px', fontWeight: 500,
  }
  const btnP: React.CSSProperties = {
    background: '#c9a84c', color: '#0a0a0a', border: 'none',
    padding: '11px 28px', fontSize: '13px', fontWeight: 500,
    letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit',
  }
  const btnS: React.CSSProperties = {
    background: 'transparent', border: '1px solid #222', color: '#666',
    padding: '11px 20px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
  }

  async function paso1() {
    setLoading(true); setError(null)
    const sb = createClient()
    const { error } = await sb.auth.signUp({
      email: form.email, password: form.password,
      options: { data: { nombre: form.nombre, telefono: form.telefono } }
    })
    if (error) { setError(error.message); setLoading(false); return }
    setStep(2); setLoading(false)
  }

  async function paso2() {
    setLoading(true); setError(null)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { setError('Sesión expirada, recargá la página'); setLoading(false); return }

    const res = await fetch('/api/registro/barberia', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_id: user.id, nombre: form.nombre,
        email: form.email, telefono: form.telefono,
        barberia_nombre: form.barberia_nombre,
        barberia_dir: form.barberia_dir, slug: form.slug,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setBid(data.barberia_id); setStep(3); setLoading(false)
  }

  function conectarMP() {
    if (!barberia_id) return
    const url = new URL('https://auth.mercadopago.com/authorization')
    url.searchParams.set('client_id', process.env.NEXT_PUBLIC_MP_APP_ID ?? 'TEST')
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('platform_id', 'mp')
    url.searchParams.set('redirect_uri', `${window.location.origin}/api/mp/callback`)
    url.searchParams.set('state', barberia_id)
    window.location.href = url.toString()
  }

  async function paso4() {
    if (!barberia_id) return
    setLoading(true); setError(null)
    const res = await fetch('/api/registro/setup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        barberia_id,
        servicios: form.servicios.filter(s => s.nombre && s.precio),
        horarios:  form.horarios.filter(h => h.activo),
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    router.push('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: '20px' }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      <div style={{ width: '100%', maxWidth: '480px', background: '#111', border: '1px solid #1e1e1e' }}>

        {/* HEAD */}
        <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid #1e1e1e' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', fontWeight: 700, color: '#c9a84c', letterSpacing: '2px', marginBottom: '16px' }}>Navaja</div>
          <Stepper step={step} />
        </div>

        {/* PASO 1 */}
        {step === 1 && (
          <>
            <div style={{ padding: '28px 32px' }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', marginBottom: '20px' }}>Creá tu cuenta</p>
              <label style={lbl}>Nombre completo</label>
              <input style={inp} type="text" placeholder="Rodrigo Martínez" value={form.nombre} onChange={e => upd('nombre', e.target.value)} />
              <label style={lbl}>Email</label>
              <input style={inp} type="email" placeholder="rodrigo@mibarberia.com" value={form.email} onChange={e => upd('email', e.target.value)} />
              <label style={lbl}>Contraseña</label>
              <input style={inp} type="password" placeholder="Mínimo 8 caracteres" value={form.password} onChange={e => upd('password', e.target.value)} />
              <label style={lbl}>WhatsApp</label>
              <input style={{ ...inp, marginBottom: 0 }} type="tel" placeholder="11 XXXX-XXXX" value={form.telefono} onChange={e => upd('telefono', e.target.value)} />
              {error && <p style={{ color: '#e05555', fontSize: '13px', marginTop: '14px' }}>{error}</p>}
            </div>
            <div style={{ padding: '20px 32px', borderTop: '1px solid #1e1e1e', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <a href="/login" style={{ ...btnS, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>Ya tengo cuenta</a>
              <button style={btnP} onClick={paso1} disabled={loading || !form.nombre || !form.email || form.password.length < 8}>
                {loading ? 'Creando...' : 'Continuar →'}
              </button>
            </div>
          </>
        )}

        {/* PASO 2 */}
        {step === 2 && (
          <>
            <div style={{ padding: '28px 32px' }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', marginBottom: '20px' }}>Tu barbería</p>
              <label style={lbl}>Nombre de la barbería</label>
              <input style={inp} type="text" placeholder="Barber Kings" value={form.barberia_nombre}
                onChange={e => { upd('barberia_nombre', e.target.value); upd('slug', generarSlug(e.target.value)) }} />
              <label style={lbl}>Dirección</label>
              <input style={inp} type="text" placeholder="Av. Corrientes 1234, CABA" value={form.barberia_dir} onChange={e => upd('barberia_dir', e.target.value)} />
              <label style={lbl}>Tu URL pública</label>
              <div style={{ display: 'flex', marginBottom: '16px' }}>
                <span style={{ background: '#0a0a0a', border: '1px solid #222', borderRight: 'none', padding: '11px 12px', fontSize: '13px', color: '#444', whiteSpace: 'nowrap' }}>navaja.app/</span>
                <input style={{ ...inp, marginBottom: 0, flex: 1 }} type="text" placeholder="barber-kings" value={form.slug}
                  onChange={e => upd('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
              </div>
              {error && <p style={{ color: '#e05555', fontSize: '13px' }}>{error}</p>}
            </div>
            <div style={{ padding: '20px 32px', borderTop: '1px solid #1e1e1e', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button style={btnS} onClick={() => setStep(1)}>← Volver</button>
              <button style={btnP} onClick={paso2} disabled={loading || !form.barberia_nombre || !form.slug}>
                {loading ? 'Guardando...' : 'Continuar →'}
              </button>
            </div>
          </>
        )}

        {/* PASO 3 */}
        {step === 3 && (
          <>
            <div style={{ padding: '28px 32px' }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', marginBottom: '8px' }}>Conectá MercadoPago</p>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '24px', lineHeight: 1.6 }}>
                Necesitamos conectar tu cuenta de MP para procesar los pagos de tus clientes.
              </p>
              <div style={{ background: '#161616', border: '1px solid #222', padding: '20px', marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', color: '#888', lineHeight: 2 }}>
                  <div>✓ Los pagos se acreditan directo en tu cuenta</div>
                  <div>✓ El split con tus barberos es automático</div>
                  <div>✓ Podés desconectarlo cuando quieras</div>
                </div>
              </div>
              <button onClick={conectarMP}
                style={{ width: '100%', background: '#009ee3', color: '#fff', border: 'none', padding: '14px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                Conectar con MercadoPago
              </button>
            </div>
            <div style={{ padding: '20px 32px', borderTop: '1px solid #1e1e1e', display: 'flex', gap: '10px', justifyContent: 'space-between' }}>
              <button style={btnS} onClick={() => setStep(2)}>← Volver</button>
              <button style={{ ...btnS, fontSize: '12px' }} onClick={() => setStep(4)}>Saltar por ahora</button>
            </div>
          </>
        )}

        {/* PASO 4 */}
        {step === 4 && (
          <>
            <div style={{ padding: '28px 32px', maxHeight: '60vh', overflowY: 'auto' }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', marginBottom: '20px' }}>Configuración inicial</p>

              <div style={{ fontSize: '11px', letterSpacing: '2px', color: '#555', textTransform: 'uppercase', marginBottom: '12px' }}>Servicios</div>
              {form.servicios.map((s, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                  <div>
                    <label style={lbl}>Nombre</label>
                    <input style={{ ...inp, marginBottom: 0 }} type="text" value={s.nombre}
                      onChange={e => { const a = [...form.servicios]; a[i] = { ...a[i], nombre: e.target.value }; upd('servicios', a) }} />
                  </div>
                  <div>
                    <label style={lbl}>Precio ($)</label>
                    <input style={{ ...inp, marginBottom: 0 }} type="number" placeholder="8000" value={s.precio}
                      onChange={e => { const a = [...form.servicios]; a[i] = { ...a[i], precio: e.target.value }; upd('servicios', a) }} />
                  </div>
                </div>
              ))}
              <button style={{ fontSize: '12px', color: '#c9a84c', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '24px' }}
                onClick={() => upd('servicios', [...form.servicios, { nombre: '', precio: '', duracion: '30' }])}>
                + Agregar servicio
              </button>

              <div style={{ fontSize: '11px', letterSpacing: '2px', color: '#555', textTransform: 'uppercase', marginBottom: '12px' }}>Horarios</div>
              {form.horarios.map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <input type="checkbox" checked={h.activo} style={{ accentColor: '#c9a84c' }}
                    onChange={e => { const a = [...form.horarios]; a[i] = { ...a[i], activo: e.target.checked }; upd('horarios', a) }} />
                  <span style={{ fontSize: '13px', minWidth: '80px', color: h.activo ? '#f5f0e8' : '#444' }}>{DIAS_LABELS[h.dia]}</span>
                  {h.activo && (
                    <>
                      <input type="time" value={h.apertura}
                        style={{ background: '#161616', border: '1px solid #222', color: '#f5f0e8', padding: '6px 10px', fontSize: '13px', outline: 'none' }}
                        onChange={e => { const a = [...form.horarios]; a[i] = { ...a[i], apertura: e.target.value }; upd('horarios', a) }} />
                      <span style={{ color: '#444' }}>—</span>
                      <input type="time" value={h.cierre}
                        style={{ background: '#161616', border: '1px solid #222', color: '#f5f0e8', padding: '6px 10px', fontSize: '13px', outline: 'none' }}
                        onChange={e => { const a = [...form.horarios]; a[i] = { ...a[i], cierre: e.target.value }; upd('horarios', a) }} />
                    </>
                  )}
                </div>
              ))}
              {error && <p style={{ color: '#e05555', fontSize: '13px', marginTop: '16px' }}>{error}</p>}
            </div>
            <div style={{ padding: '20px 32px', borderTop: '1px solid #1e1e1e', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button style={btnS} onClick={() => setStep(3)}>← Volver</button>
              <button style={btnP} onClick={paso4} disabled={loading}>
                {loading ? 'Configurando...' : '¡Listo, empezar! →'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

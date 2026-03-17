'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]     = useState('')
  const [pass, setPass]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleLogin() {
    setLoading(true); setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
    if (error) { setError('Email o contraseña incorrectos'); setLoading(false); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--sans)', padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: '28px', fontWeight: 700, color: '#c9a84c', letterSpacing: '2px', marginBottom: '8px' }}>
          Navaja
        </div>
        <div style={{ fontSize: '14px', color: '#555', marginBottom: '32px' }}>
          Ingresá a tu panel
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '11px', letterSpacing: '1px', color: '#666', display: 'block', marginBottom: '7px' }}>EMAIL</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="rodrigo@barberkings.com"
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{
              width: '100%', background: '#161616', border: '1px solid #222',
              color: '#f5f0e8', padding: '12px 14px', fontSize: '14px',
              outline: 'none', fontFamily: 'var(--sans)',
            }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '11px', letterSpacing: '1px', color: '#666', display: 'block', marginBottom: '7px' }}>CONTRASEÑA</label>
          <input
            type="password"
            value={pass}
            onChange={e => setPass(e.target.value)}
            placeholder="••••••••"
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{
              width: '100%', background: '#161616', border: '1px solid #222',
              color: '#f5f0e8', padding: '12px 14px', fontSize: '14px',
              outline: 'none', fontFamily: 'var(--sans)',
            }}
          />
        </div>

        {error && (
          <p style={{ color: '#e05555', fontSize: '13px', marginBottom: '16px' }}>{error}</p>
        )}

        <button
          onClick={handleLogin}
          disabled={loading || !email || !pass}
          style={{
            width: '100%', background: '#c9a84c', color: '#0a0a0a',
            border: 'none', padding: '14px', fontSize: '13px',
            fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? .6 : 1, fontFamily: 'var(--sans)',
          }}
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: '#555' }}>
          ¿No tenés cuenta?{' '}
          <a href="/registro" style={{ color: '#c9a84c', textDecoration: 'none' }}>Registrá tu barbería</a>
        </div>
      </div>
    </div>
  )
}

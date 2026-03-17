'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Liquidacion {
  id: string
  barbero_nombre: string
  comision_pct: number
  periodo_desde: string
  periodo_hasta: string
  turnos_completados: number
  turnos_cobrados: number
  monto_bruto: number
  monto_barbero: number
  estado: string
  pagado_en: string | null
}

interface Barbero { id: string; nombre: string }

interface Props {
  liquidaciones: Liquidacion[]
  barberos:      Barbero[]
  barberia_id:   string
  periodo_desde: string
  periodo_hasta: string
}

function formatPrecio(n: number) {
  return '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 0 })
}

function formatFecha(f: string) {
  const [y, m, d] = f.split('-')
  return `${parseInt(d)}/${parseInt(m)}/${y.slice(2)}`
}

export default function LiquidacionesClient({ liquidaciones, barberos, barberia_id, periodo_desde, periodo_hasta }: Props) {
  const router  = useRouter()
  const [tab, setTab]         = useState<'pendiente' | 'pagada'>('pendiente')
  const [loading, setLoading] = useState<string | null>(null)
  const [generando, setGenerando] = useState(false)
  const [items, setItems]     = useState(liquidaciones)

  const filtradas = items.filter(l => l.estado === tab)

  async function handlePagar(id: string) {
    setLoading(id)
    try {
      const res = await fetch(`/api/liquidaciones/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'pagada' }),
      })
      if (res.ok) {
        setItems(prev => prev.map(l =>
          l.id === id ? { ...l, estado: 'pagada', pagado_en: new Date().toISOString() } : l
        ))
      }
    } finally { setLoading(null) }
  }

  async function handleGenerar(barbero_id: string) {
    setGenerando(true)
    try {
      const res = await fetch('/api/liquidaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barberia_id, barbero_id, periodo_desde, periodo_hasta }),
      })
      if (res.ok) router.refresh()
    } finally { setGenerando(false) }
  }

  const totalPendiente = items
    .filter(l => l.estado === 'pendiente')
    .reduce((s, l) => s + l.monto_barbero, 0)

  return (
    <>
      {/* RESUMEN */}
      {totalPendiente > 0 && (
        <div className="alert warning" style={{ marginBottom: '20px' }}>
          <span>💰</span>
          <span>Total pendiente de pago: <strong>{formatPrecio(totalPendiente)}</strong></span>
        </div>
      )}

      {/* ACCIONES */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div className="tabs" style={{ marginBottom: 0, borderBottom: 'none' }}>
          <button className={`tab ${tab === 'pendiente' ? 'active' : ''}`} onClick={() => setTab('pendiente')}>
            Pendientes ({items.filter(l => l.estado === 'pendiente').length})
          </button>
          <button className={`tab ${tab === 'pagada' ? 'active' : ''}`} onClick={() => setTab('pagada')}>
            Pagadas
          </button>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {barberos.map(b => (
            <button
              key={b.id}
              className="btn-ghost"
              style={{ fontSize: '12px', padding: '8px 14px' }}
              onClick={() => handleGenerar(b.id)}
              disabled={generando}
            >
              {generando ? '...' : `Generar ${b.nombre.split(' ')[0]}`}
            </button>
          ))}
        </div>
      </div>

      {/* LISTA */}
      {filtradas.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">{tab === 'pendiente' ? '✓' : '📋'}</div>
          <div className="empty-text">
            {tab === 'pendiente' ? 'No hay liquidaciones pendientes' : 'No hay liquidaciones pagadas'}
          </div>
        </div>
      ) : (
        <div className="card">
          {filtradas.map((l, i) => (
            <div key={l.id} style={{
              display: 'flex', alignItems: 'center', gap: '16px',
              padding: '16px 20px',
              borderBottom: i < filtradas.length - 1 ? '1px solid #1a1a1a' : 'none',
            }}>
              <div className="b-avatar">{l.barbero_nombre[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>{l.barbero_nombre}</div>
                <div style={{ fontSize: '12px', color: '#555', marginTop: '2px' }}>
                  {formatFecha(l.periodo_desde)} — {formatFecha(l.periodo_hasta)}
                  {' · '}{l.turnos_cobrados} turno{l.turnos_cobrados !== 1 ? 's' : ''}
                  {' · '}comisión {l.comision_pct}%
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#555', marginBottom: '2px' }}>
                  Bruto {formatPrecio(l.monto_bruto)}
                </div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: '18px', fontWeight: 700, color: '#c9a84c' }}>
                  {formatPrecio(l.monto_barbero)}
                </div>
              </div>
              {l.estado === 'pendiente' ? (
                <button
                  className="liq-btn pagar"
                  onClick={() => handlePagar(l.id)}
                  disabled={loading === l.id}
                >
                  {loading === l.id ? '...' : 'Pagar'}
                </button>
              ) : (
                <div style={{ textAlign: 'right', minWidth: '80px' }}>
                  <div className="b-badge activo">Pagada</div>
                  {l.pagado_en && (
                    <div style={{ fontSize: '10px', color: '#444', marginTop: '3px' }}>
                      {formatFecha(l.pagado_en.split('T')[0])}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

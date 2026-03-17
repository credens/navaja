'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Barbero {
  id: string
  nombre: string
  email: string
  telefono: string
  comision_pct: number
  activo: boolean
  acepta_turnos: boolean
  fecha_baja: string | null
}

interface Props {
  barberos:   Barbero[]
  servicios:  { id: string; nombre: string }[]
  barberia_id: string
}

const DIAS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']

export default function BarberosClient({ barberos, servicios, barberia_id }: Props) {
  const router = useRouter()
  const [modal, setModal]   = useState<'alta' | 'baja' | null>(null)
  const [selected, setSelected] = useState<Barbero | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  // Form alta
  const [nombre, setNombre]     = useState('')
  const [email, setEmail]       = useState('')
  const [telefono, setTel]      = useState('')
  const [comision, setComision] = useState('50')
  const [diasSel, setDiasSel]   = useState<number[]>([1,2,3,4,5,6])
  const [hInicio, setHInicio]   = useState('09:00')
  const [hFin, setHFin]         = useState('19:00')
  const [svcs, setSvcs]         = useState<string[]>(servicios.map(s => s.id))

  function toggleDia(d: number) {
    setDiasSel(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }
  function toggleSvc(id: string) {
    setSvcs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handleAlta() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/dashboard/barberos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberia_id,
          nombre, email, telefono,
          comision_pct: parseFloat(comision),
          servicio_ids: svcs,
          disponibilidad: diasSel.map(d => ({
            dia_semana: d, hora_inicio: hInicio, hora_fin: hFin
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setModal(null)
      router.refresh()
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }

  async function handleBaja() {
    if (!selected) return
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/dashboard/barberos/${selected.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barberia_id }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setModal(null)
      router.refresh()
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: '24px', fontWeight: 700 }}>Barberos</h1>
          <p style={{ fontSize: '13px', color: '#555', marginTop: '4px' }}>
            {barberos.filter(b => b.activo).length} activos
          </p>
        </div>
        <button className="f-btn-primary" onClick={() => setModal('alta')}>
          + Agregar barbero
        </button>
      </div>

      <div className="dcard">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Barbero</th>
              <th>Contacto</th>
              <th>Comisión</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {barberos.length === 0 ? (
              <tr><td colSpan={5}>
                <div className="empty-state">
                  <span className="empty-state-icon">💈</span>
                  No hay barberos. Agregá el primero.
                </div>
              </td></tr>
            ) : barberos.map(b => (
              <tr key={b.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="br-av">{b.nombre[0]}</div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{b.nombre}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: '12px', color: '#555' }}>{b.email}</div>
                  <div style={{ fontSize: '12px', color: '#555' }}>{b.telefono}</div>
                </td>
                <td>{b.comision_pct}%</td>
                <td>
                  {b.activo
                    ? <span className="badge green">Activo</span>
                    : <span className="badge gray">Inactivo</span>
                  }
                </td>
                <td>
                  {b.activo && (
                    <button
                      className="f-btn-secondary"
                      style={{ padding: '5px 12px', fontSize: '11px' }}
                      onClick={() => { setSelected(b); setModal('baja') }}
                    >
                      Dar de baja
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL ALTA */}
      {modal === 'alta' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">Agregar barbero</div>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="f-row">
                <div className="f-group">
                  <label className="f-label">Nombre</label>
                  <input className="f-input" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Martín López" />
                </div>
                <div className="f-group">
                  <label className="f-label">Comisión %</label>
                  <input className="f-input" type="number" min="0" max="100" value={comision} onChange={e => setComision(e.target.value)} />
                </div>
              </div>
              <div className="f-row">
                <div className="f-group">
                  <label className="f-label">Email</label>
                  <input className="f-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="martin@barberia.com" />
                </div>
                <div className="f-group">
                  <label className="f-label">WhatsApp</label>
                  <input className="f-input" type="tel" value={telefono} onChange={e => setTel(e.target.value)} placeholder="1155667788" />
                </div>
              </div>

              <div className="f-group">
                <label className="f-label">Días que trabaja</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {DIAS.map((d, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDia(i + 1)}
                      style={{
                        padding: '5px 10px', fontSize: '12px',
                        background: diasSel.includes(i + 1) ? 'var(--gold)' : '#1a1a1a',
                        color: diasSel.includes(i + 1) ? '#0a0a0a' : '#666',
                        border: `1px solid ${diasSel.includes(i + 1) ? 'var(--gold)' : '#222'}`,
                        cursor: 'pointer', transition: 'all .15s',
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="f-row">
                <div className="f-group">
                  <label className="f-label">Entrada</label>
                  <input className="f-input" type="time" value={hInicio} onChange={e => setHInicio(e.target.value)} />
                </div>
                <div className="f-group">
                  <label className="f-label">Salida</label>
                  <input className="f-input" type="time" value={hFin} onChange={e => setHFin(e.target.value)} />
                </div>
              </div>

              <div className="f-group">
                <label className="f-label">Servicios que realiza</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {servicios.map(s => (
                    <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                      <input
                        type="checkbox"
                        checked={svcs.includes(s.id)}
                        onChange={() => toggleSvc(s.id)}
                        style={{ accentColor: 'var(--gold)' }}
                      />
                      {s.nombre}
                    </label>
                  ))}
                </div>
              </div>

              {error && <p style={{ color: '#e05555', fontSize: '13px' }}>{error}</p>}
            </div>
            <div className="modal-footer">
              <button className="f-btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="f-btn-primary" onClick={handleAlta} disabled={loading || !nombre || !email}>
                {loading ? 'Guardando...' : 'Agregar barbero'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BAJA */}
      {modal === 'baja' && selected && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">Dar de baja a {selected.nombre}</div>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.6 }}>
                Al dar de baja a <strong style={{ color: 'var(--white)' }}>{selected.nombre}</strong>:
              </p>
              <ul style={{ marginTop: '12px', marginLeft: '16px', fontSize: '13px', color: '#666', lineHeight: 2 }}>
                <li>Se cancelarán todos sus turnos futuros (con reembolso al cliente)</li>
                <li>Se generará una liquidación de cierre automáticamente</li>
                <li>No podrá recibir nuevos turnos</li>
              </ul>
              {error && <p style={{ color: '#e05555', fontSize: '13px', marginTop: '12px' }}>{error}</p>}
            </div>
            <div className="modal-footer">
              <button className="f-btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button
                className="f-btn-primary"
                style={{ background: '#e05555' }}
                onClick={handleBaja}
                disabled={loading}
              >
                {loading ? 'Procesando...' : 'Confirmar baja'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

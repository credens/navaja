'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Servicio {
  id: string
  nombre: string
  descripcion: string | null
  precio: number
  duracion_min: number
  activo: boolean
  orden: number
}

interface Props {
  servicios:   Servicio[]
  barberia_id: string
}

function formatPrecio(n: number) {
  return '$' + Math.round(n).toLocaleString('es-AR')
}

export default function ServiciosClient({ servicios, barberia_id }: Props) {
  const router = useRouter()
  const [modal, setModal]     = useState<'nuevo' | 'editar' | null>(null)
  const [selected, setSelected] = useState<Servicio | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const [nombre, setNombre]   = useState('')
  const [desc, setDesc]       = useState('')
  const [precio, setPrecio]   = useState('')
  const [duracion, setDuracion] = useState('30')

  function abrirNuevo() {
    setNombre(''); setDesc(''); setPrecio(''); setDuracion('30')
    setSelected(null); setModal('nuevo')
  }

  function abrirEditar(s: Servicio) {
    setNombre(s.nombre); setDesc(s.descripcion ?? '')
    setPrecio(String(s.precio)); setDuracion(String(s.duracion_min))
    setSelected(s); setModal('editar')
  }

  async function guardar() {
    setLoading(true); setError(null)
    try {
      const url    = modal === 'editar' ? `/api/dashboard/servicios/${selected?.id}` : '/api/dashboard/servicios'
      const method = modal === 'editar' ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberia_id,
          nombre, descripcion: desc,
          precio: parseFloat(precio),
          duracion_min: parseInt(duracion),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setModal(null); router.refresh()
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }

  async function toggleActivo(s: Servicio) {
    await fetch(`/api/dashboard/servicios/${s.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barberia_id, activo: !s.activo }),
    })
    router.refresh()
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: '24px', fontWeight: 700 }}>Servicios</h1>
          <p style={{ fontSize: '13px', color: '#555', marginTop: '4px' }}>
            {servicios.filter(s => s.activo).length} activos
          </p>
        </div>
        <button className="f-btn-primary" onClick={abrirNuevo}>+ Nuevo servicio</button>
      </div>

      <div className="dcard">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Servicio</th>
              <th>Duración</th>
              <th>Precio</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {servicios.length === 0 ? (
              <tr><td colSpan={5}>
                <div className="empty-state">
                  <span className="empty-state-icon">✂️</span>
                  No hay servicios. Agregá el primero.
                </div>
              </td></tr>
            ) : servicios.map(s => (
              <tr key={s.id} style={{ opacity: s.activo ? 1 : .5 }}>
                <td>
                  <div style={{ fontWeight: 500 }}>{s.nombre}</div>
                  {s.descripcion && <div style={{ fontSize: '11px', color: '#555' }}>{s.descripcion}</div>}
                </td>
                <td>{s.duracion_min} min</td>
                <td style={{ fontFamily: 'var(--serif)', color: 'var(--gold)' }}>{formatPrecio(s.precio)}</td>
                <td>
                  {s.activo
                    ? <span className="badge green">Activo</span>
                    : <span className="badge gray">Inactivo</span>
                  }
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="f-btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => abrirEditar(s)}>
                      Editar
                    </button>
                    <button className="f-btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => toggleActivo(s)}>
                      {s.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">{modal === 'nuevo' ? 'Nuevo servicio' : 'Editar servicio'}</div>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="f-group">
                <label className="f-label">Nombre</label>
                <input className="f-input" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Corte + Barba" />
              </div>
              <div className="f-group">
                <label className="f-label">Descripción (opcional)</label>
                <input className="f-input" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Incluye lavado..." />
              </div>
              <div className="f-row">
                <div className="f-group">
                  <label className="f-label">Precio ($)</label>
                  <input className="f-input" type="number" value={precio} onChange={e => setPrecio(e.target.value)} placeholder="12000" />
                </div>
                <div className="f-group">
                  <label className="f-label">Duración (min)</label>
                  <input className="f-input" type="number" value={duracion} onChange={e => setDuracion(e.target.value)} min="5" step="5" />
                </div>
              </div>
              {error && <p style={{ color: '#e05555', fontSize: '13px' }}>{error}</p>}
            </div>
            <div className="modal-footer">
              <button className="f-btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="f-btn-primary" onClick={guardar} disabled={loading || !nombre || !precio}>
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

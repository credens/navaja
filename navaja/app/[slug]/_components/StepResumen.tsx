'use client'

import { useState } from 'react'
import type { ReservaState } from './ReservaFlow'

interface Props {
  state:     ReservaState
  barberia:  { id: string; nombre: string }
  onEdit:    () => void
  onConfirm: (turno_id: string) => void
}

function formatPrecio(n: number) {
  return '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 0 })
}

function formatFechaHora(fecha: string | null, hora: string | null) {
  if (!fecha || !hora) return '—'
  const [y, m, d] = fecha.split('-')
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${d} de ${meses[parseInt(m)-1]} a las ${hora}`
}

export default function StepResumen({ state, barberia, onEdit, onConfirm }: Props) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handlePagar() {
    if (!state.servicio || !state.barbero || !state.fechaHoraInicio) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/turnos', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberia_id:       barberia.id,
          barbero_id:        state.barbero.id === 'cualquiera' ? null : state.barbero.id,
          servicio_id:       state.servicio.id,
          fecha_hora_inicio: state.fechaHoraInicio,
          cliente: {
            nombre:   state.nombre,
            telefono: state.telefono,
          },
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Ocurrió un error. Intentá de nuevo.')
        return
      }

      // En producción redirigimos a MP: window.location.href = data.init_point
      // En desarrollo simulamos la confirmación
      onConfirm(data.turno_id)

    } catch {
      setError('Error de conexión. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="r-title">Revisá tu turno</h2>
      <p className="r-sub">Todo bien? Pagás ahora y listo.</p>

      <div className="resumen-card">
        <div className="resumen-row">
          <span className="resumen-key">Servicio</span>
          <span className="resumen-val">{state.servicio?.nombre ?? '—'}</span>
        </div>
        <div className="resumen-row">
          <span className="resumen-key">Duración</span>
          <span className="resumen-val">{state.servicio?.duracion_min} min</span>
        </div>
        <div className="resumen-row">
          <span className="resumen-key">Barbero</span>
          <span className="resumen-val">{state.barbero?.nombre ?? '—'}</span>
        </div>
        <div className="resumen-row">
          <span className="resumen-key">Cuándo</span>
          <span className="resumen-val">{formatFechaHora(state.fecha, state.hora)}</span>
        </div>
        <div className="resumen-row">
          <span className="resumen-key">Cliente</span>
          <span className="resumen-val">{state.nombre}</span>
        </div>
      </div>

      <div className="resumen-total">
        <span className="resumen-total-label">Total</span>
        <span className="resumen-total-val">
          {state.servicio ? formatPrecio(state.servicio.precio) : '—'}
        </span>
      </div>

      {error && (
        <p style={{ color: '#e05555', fontSize: '13px', marginTop: '12px', textAlign: 'center' }}>
          {error}
        </p>
      )}

      <div className="r-bottom">
        <button className="mp-btn" onClick={handlePagar} disabled={loading}>
          {loading
            ? 'Procesando...'
            : <><span style={{ fontWeight: 700, letterSpacing: '-.5px' }}>mercadopago</span><span>Pagar ahora</span></>
          }
        </button>
        <div className="cancel-link" onClick={onEdit}>← Editar datos</div>
      </div>
    </div>
  )
}

'use client'

import type { ReservaState } from './ReservaFlow'

interface Props {
  state:    ReservaState
  barberia: { nombre: string; direccion: string | null }
  onNuevo:  () => void
}

function formatFechaHora(fecha: string | null, hora: string | null) {
  if (!fecha || !hora) return '—'
  const [y, m, d] = fecha.split('-')
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  return `${d} de ${meses[parseInt(m)-1]} a las ${hora}`
}

function formatPrecio(n: number) {
  return '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 0 })
}

export default function StepConfirmacion({ state, barberia, onNuevo }: Props) {
  return (
    <div className="confirm-wrap">
      <span className="confirm-emoji">🎉</span>
      <h2 className="confirm-title">¡Todo listo!</h2>
      <p className="confirm-sub">
        Tu turno está confirmado. Te mandamos los detalles por WhatsApp.
      </p>

      <div className="confirm-card">
        <div className="confirm-card-head">Detalles del turno</div>
        <div className="confirm-row">
          <div className="confirm-icon">✂️</div>
          <div>
            <div className="confirm-label">Servicio</div>
            <div className="confirm-val">{state.servicio?.nombre ?? '—'}</div>
          </div>
        </div>
        <div className="confirm-row">
          <div className="confirm-icon">👤</div>
          <div>
            <div className="confirm-label">Barbero</div>
            <div className="confirm-val">{state.barbero?.nombre ?? '—'}</div>
          </div>
        </div>
        <div className="confirm-row">
          <div className="confirm-icon">📅</div>
          <div>
            <div className="confirm-label">Cuándo</div>
            <div className="confirm-val">{formatFechaHora(state.fecha, state.hora)}</div>
          </div>
        </div>
        {barberia.direccion && (
          <div className="confirm-row">
            <div className="confirm-icon">📍</div>
            <div>
              <div className="confirm-label">Dónde</div>
              <div className="confirm-val">{barberia.direccion}</div>
            </div>
          </div>
        )}
        <div className="confirm-row">
          <div className="confirm-icon">💰</div>
          <div>
            <div className="confirm-label">Pagado</div>
            <div className="confirm-val" style={{ color: 'var(--gold)' }}>
              {state.servicio ? formatPrecio(state.servicio.precio) : '—'}
            </div>
          </div>
        </div>
      </div>

      <div className="wsp-chip">
        <div className="wsp-chip-icon">💬</div>
        <div>
          Te enviamos un WhatsApp a <strong>{state.telefono}</strong> con la confirmación.
          Respondé <strong>CANCELAR</strong> para cancelar hasta 3hs antes del turno.
        </div>
      </div>

      <button className="nuevo-btn" onClick={onNuevo}>
        Reservar otro turno
      </button>
    </div>
  )
}

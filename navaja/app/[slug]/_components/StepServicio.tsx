'use client'

import type { Servicio } from '@/types'

const EMOJIS: Record<string, string> = {
  'corte':   '✂️',
  'barba':   '🪒',
  'lavado':  '🛁',
  'arreglo': '🪒',
}

function getEmoji(nombre: string): string {
  const lower = nombre.toLowerCase()
  if (lower.includes('lavado')) return '🛁'
  if (lower.includes('barba') && lower.includes('corte')) return '💈'
  if (lower.includes('barba')) return '🪒'
  if (lower.includes('corte')) return '✂️'
  return '💈'
}

function formatPrecio(n: number) {
  return '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 0 })
}

interface Props {
  servicios: Servicio[]
  selected:  Servicio | null
  onSelect:  (s: Servicio) => void
  onNext:    () => void
}

export default function StepServicio({ servicios, selected, onSelect, onNext }: Props) {
  return (
    <div>
      <h2 className="r-title">¿Qué te hacemos hoy?</h2>
      <p className="r-sub">Elegí el servicio y te mostramos los horarios disponibles.</p>
      <div className="svc-list">
        {servicios.map(svc => (
          <div
            key={svc.id}
            className={`svc-card ${selected?.id === svc.id ? 'selected' : ''}`}
            onClick={() => onSelect(svc)}
          >
            <div className="svc-emoji">{getEmoji(svc.nombre)}</div>
            <div className="svc-body">
              <div className="svc-name">{svc.nombre}</div>
              <div className="svc-meta">{svc.duracion_min} minutos{svc.descripcion ? ` · ${svc.descripcion}` : ''}</div>
            </div>
            <div className="svc-price">{formatPrecio(svc.precio)}</div>
            <div className="svc-check">✓</div>
          </div>
        ))}
      </div>
      <div className="r-bottom">
        <button className="r-cta" disabled={!selected} onClick={onNext}>
          Continuar →
        </button>
      </div>
    </div>
  )
}

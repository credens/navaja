'use client'

interface Barbero {
  id: string
  nombre: string
  foto_url: string | null
  descripcion: string | null
}

interface Props {
  barberos:  Barbero[]
  selected:  { id: string; nombre: string } | null
  onSelect:  (b: { id: string; nombre: string } | null) => void
  onNext:    () => void
}

export default function StepBarbero({ barberos, selected, onSelect, onNext }: Props) {
  return (
    <div>
      <h2 className="r-title">¿Con quién?</h2>
      <p className="r-sub">Todos trabajan con el servicio que elegiste.</p>
      <div className="barbero-list">

        {/* Opción cualquiera */}
        <div
          className={`barbero-card cualquiera ${selected?.id === 'cualquiera' ? 'selected' : ''}`}
          onClick={() => onSelect({ id: 'cualquiera', nombre: 'Cualquier barbero' })}
        >
          <div className="b-av" style={{ fontSize: '14px', borderStyle: 'dashed' }}>?</div>
          <div className="b-body">
            <div className="b-name">Cualquiera</div>
            <div className="b-meta">El primero disponible en tu horario</div>
            <div className="b-slots">Más opciones de horario</div>
          </div>
          <div className="b-check">✓</div>
        </div>

        {barberos.map(b => (
          <div
            key={b.id}
            className={`barbero-card ${selected?.id === b.id ? 'selected' : ''}`}
            onClick={() => onSelect({ id: b.id, nombre: b.nombre })}
          >
            <div className="b-av">{b.nombre[0]?.toUpperCase()}</div>
            <div className="b-body">
              <div className="b-name">{b.nombre}</div>
              {b.descripcion && <div className="b-meta">{b.descripcion}</div>}
            </div>
            <div className="b-check">✓</div>
          </div>
        ))}

      </div>
      <div className="r-bottom">
        <button className="r-cta" disabled={!selected} onClick={onNext}>
          Elegir fecha →
        </button>
      </div>
    </div>
  )
}

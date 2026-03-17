'use client'

interface Props {
  nombre:         string
  telefono:       string
  hs_cancelacion: number
  onChange:       (nombre: string, telefono: string) => void
  onNext:         () => void
}

export default function StepDatos({ nombre, telefono, hs_cancelacion, onChange, onNext }: Props) {
  const valid = nombre.trim().length >= 2 && telefono.replace(/\D/g,'').length >= 8

  return (
    <div>
      <h2 className="r-title">Tus datos</h2>
      <p className="r-sub">Te mandamos la confirmación por WhatsApp.</p>

      <div className="r-input-group">
        <label className="r-label">Nombre</label>
        <input
          className="r-input"
          type="text"
          placeholder="¿Cómo te llamás?"
          value={nombre}
          onChange={e => onChange(e.target.value, telefono)}
          autoComplete="given-name"
        />
      </div>

      <div className="r-input-group">
        <label className="r-label">WhatsApp</label>
        <input
          className="r-input"
          type="tel"
          placeholder="11 XXXX-XXXX"
          value={telefono}
          onChange={e => onChange(nombre, e.target.value)}
          autoComplete="tel"
          inputMode="tel"
        />
      </div>

      <div className="r-politica">
        <div className="r-politica-icon">⏰</div>
        <div className="r-politica-text">
          Podés cancelar gratis hasta <strong>{hs_cancelacion} horas antes</strong>. Si cancelás más tarde o no te presentás, el turno <strong>se cobra igual</strong>.
        </div>
      </div>

      <div className="r-bottom">
        <button className="r-cta" disabled={!valid} onClick={onNext}>
          Revisar y pagar →
        </button>
      </div>
    </div>
  )
}

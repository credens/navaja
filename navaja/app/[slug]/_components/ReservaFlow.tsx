'use client'

import { useState, useCallback } from 'react'
import type { Servicio, Barbero } from '@/types'
import './reserva.css'
import StepServicio from './StepServicio'
import StepBarbero from './StepBarbero'
import StepFecha from './StepFecha'
import StepDatos from './StepDatos'
import StepResumen from './StepResumen'
import StepConfirmacion from './StepConfirmacion'

interface Barberia {
  id: string
  nombre: string
  slug: string
  direccion: string | null
  hs_cancelacion: number | null
}

interface Props {
  barberia: Barberia
  servicios: Servicio[]
  barberos: { id: string; nombre: string; foto_url: string | null; descripcion: string | null }[]
}

export interface ReservaState {
  servicio:    Servicio | null
  barbero:     { id: string; nombre: string } | null
  fecha:       string | null   // 'YYYY-MM-DD'
  hora:        string | null   // 'HH:mm'
  fechaHoraInicio: string | null  // ISO
  nombre:      string
  telefono:    string
  turno_id:    string | null
}

const STEPS = ['Servicio','Barbero','Fecha y hora','Tus datos','Revisá','¡Listo!']

export default function ReservaFlow({ barberia, servicios, barberos }: Props) {
  const [step, setStep]   = useState(1)
  const [state, setState] = useState<ReservaState>({
    servicio: null, barbero: null,
    fecha: null, hora: null, fechaHoraInicio: null,
    nombre: '', telefono: '', turno_id: null,
  })

  const goTo = useCallback((n: number) => {
    setStep(n)
    document.getElementById('r-screen')?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const goBack = () => { if (step > 1 && step < 6) goTo(step - 1) }

  const progress = ((step - 1) / 5) * 100

  const initials = barberia.nombre.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()

  return (
    <div className="reserva-wrap">
      <div className="phone">

        {/* HEADER */}
        <div className="r-header">
          <div className="r-header-top">
            <button
              className={`r-back ${step === 1 || step === 6 ? 'hidden' : ''}`}
              onClick={goBack}
            >‹</button>
            <div className="r-barberia">
              <div className="r-barberia-name">{barberia.nombre}</div>
              {barberia.direccion && <div className="r-barberia-addr">{barberia.direccion}</div>}
            </div>
            <div className="r-avatar">{initials}</div>
          </div>
          <div className="r-progress">
            <div className="r-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="r-step-hint">
            <span className="r-step-hint-text">{STEPS[step - 1]}</span>
            {step <= 5 && <span className="r-step-hint-count">{step} / 5</span>}
          </div>
        </div>

        {/* SCREEN */}
        <div className="r-screen" id="r-screen">

          <div className={`r-section ${step === 1 ? 'active' : ''}`}>
            <StepServicio
              servicios={servicios}
              selected={state.servicio}
              onSelect={svc => setState(s => ({ ...s, servicio: svc }))}
              onNext={() => goTo(2)}
            />
          </div>

          <div className={`r-section ${step === 2 ? 'active' : ''}`}>
            <StepBarbero
              barberos={barberos}
              selected={state.barbero}
              onSelect={b => setState(s => ({ ...s, barbero: b }))}
              onNext={() => goTo(3)}
            />
          </div>

          <div className={`r-section ${step === 3 ? 'active' : ''}`}>
            <StepFecha
              barberia_id={barberia.id}
              servicio={state.servicio}
              barbero={state.barbero}
              selectedFecha={state.fecha}
              selectedHora={state.hora}
              onSelect={(fecha, hora, isoInicio) =>
                setState(s => ({ ...s, fecha, hora, fechaHoraInicio: isoInicio }))
              }
              onNext={() => goTo(4)}
            />
          </div>

          <div className={`r-section ${step === 4 ? 'active' : ''}`}>
            <StepDatos
              nombre={state.nombre}
              telefono={state.telefono}
              hs_cancelacion={barberia.hs_cancelacion ?? 3}
              onChange={(nombre, telefono) => setState(s => ({ ...s, nombre, telefono }))}
              onNext={() => goTo(5)}
            />
          </div>

          <div className={`r-section ${step === 5 ? 'active' : ''}`}>
            <StepResumen
              state={state}
              barberia={barberia}
              onEdit={() => goTo(4)}
              onConfirm={(turno_id) => {
                setState(s => ({ ...s, turno_id }))
                goTo(6)
              }}
            />
          </div>

          <div className={`r-section ${step === 6 ? 'active' : ''}`}>
            <StepConfirmacion
              state={state}
              barberia={barberia}
              onNuevo={() => {
                setState({
                  servicio: null, barbero: null,
                  fecha: null, hora: null, fechaHoraInicio: null,
                  nombre: '', telefono: '', turno_id: null,
                })
                goTo(1)
              }}
            />
          </div>

        </div>
      </div>
    </div>
  )
}

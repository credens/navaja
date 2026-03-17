'use client'

import { useState, useEffect } from 'react'
import type { Servicio, Slot } from '@/types'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DOWS   = ['Lu','Ma','Mi','Ju','Vi','Sá','Do']

interface Props {
  barberia_id:    string
  servicio:       Servicio | null
  barbero:        { id: string; nombre: string } | null
  selectedFecha:  string | null
  selectedHora:   string | null
  onSelect:       (fecha: string, hora: string, isoInicio: string) => void
  onNext:         () => void
}

export default function StepFecha({ barberia_id, servicio, barbero, selectedFecha, selectedHora, onSelect, onNext }: Props) {
  const now   = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  function prevMes() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMes() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  async function selDay(day: number) {
    if (!servicio) return
    setSelectedDay(day)
    setSlots([])

    const fecha = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    const params = new URLSearchParams({ servicio_id: servicio.id, fecha })

    if (barbero && barbero.id !== 'cualquiera') {
      params.set('barbero_id', barbero.id)
    } else {
      params.set('barberia_id', barberia_id)
    }

    setLoading(true)
    try {
      const res  = await fetch(`/api/turnos/slots?${params}`)
      const data = await res.json()
      const lista: Slot[] = data.slots ?? data.barberos?.flatMap((b: any) => b.slots) ?? []
      setSlots(lista)
    } catch {
      setSlots([])
    } finally {
      setLoading(false)
    }
  }

  // Generar días del calendario
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7 // lunes = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayDay = now.getDate()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()

  return (
    <div>
      <h2 className="r-title">¿Cuándo venís?</h2>
      <p className="r-sub">Los días con punto verde tienen horarios libres.</p>

      <div className="cal-nav">
        <button className="cal-btn" onClick={prevMes}>‹</button>
        <div className="cal-month">{MONTHS[month]} {year}</div>
        <button className="cal-btn" onClick={nextMes}>›</button>
      </div>

      <div className="cal-dows">
        {DOWS.map(d => <div key={d} className="cal-dow">{d}</div>)}
      </div>

      <div className="cal-days">
        {/* Espacios vacíos */}
        {Array.from({ length: firstDow }).map((_, i) => (
          <div key={`e${i}`} className="cal-day empty" />
        ))}
        {/* Días */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const d = i + 1
          const isPast = isCurrentMonth && d < todayDay
          const isToday = isCurrentMonth && d === todayDay
          const isSel = d === selectedDay

          let cls = 'cal-day'
          if (isPast) cls += ' disabled'
          if (isToday) cls += ' today'
          if (isSel) cls += ' selected'
          // Marcamos todos los días no pasados como potencialmente disponibles
          // En producción consultarías qué días tienen slots
          if (!isPast) cls += ' has-slots'

          return (
            <button key={d} className={cls} onClick={() => !isPast && selDay(d)}>
              <span>{d}</span>
              <span className="dot" />
            </button>
          )
        })}
      </div>

      {selectedDay !== null && (
        <>
          <div className="slots-label">
            {loading
              ? 'Cargando horarios...'
              : slots.length
                ? `Horarios — ${selectedDay} de ${MONTHS[month]}`
                : 'No hay horarios disponibles para este día.'
            }
          </div>
          {!loading && slots.length > 0 && (
            <div className="slots-wrap">
              {slots.map(slot => (
                <div
                  key={slot.fecha_hora_inicio}
                  className={`slot-btn ${!slot.disponible ? 'taken' : ''} ${selectedHora === slot.hora_inicio ? 'selected' : ''}`}
                  onClick={() => {
                    if (!slot.disponible) return
                    const fecha = `${year}-${String(month+1).padStart(2,'0')}-${String(selectedDay).padStart(2,'0')}`
                    onSelect(fecha, slot.hora_inicio, slot.fecha_hora_inicio)
                  }}
                >
                  <span className="slot-time">{slot.hora_inicio}</span>
                  <span className="slot-dur">{slot.duracion_min} min</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="r-bottom">
        <button className="r-cta" disabled={!selectedHora} onClick={onNext}>
          Continuar →
        </button>
      </div>
    </div>
  )
}

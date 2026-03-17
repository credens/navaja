'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const TZ = 'America/Argentina/Buenos_Aires'

interface Turno {
  id: string
  barbero_id: string
  barbero_nombre: string
  servicio_nombre: string
  cliente_nombre: string
  cliente_telefono: string | null
  fecha_hora_inicio: string
  fecha_hora_fin: string
  monto_total: number
  estado: string
  duracion_min: number
}

interface Props {
  turnos: Turno[]
}

function formatHora(iso: string) {
  return format(toZonedTime(parseISO(iso), TZ), 'HH:mm')
}

function formatPrecio(n: number) {
  return '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 0 })
}

export default function AgendaHoy({ turnos }: Props) {
  const [tabActivo, setTabActivo] = useState('todos')

  // Obtener barberos únicos
  const barberos = Array.from(
    new Map(turnos.map(t => [t.barbero_id, t.barbero_nombre])).entries()
  )

  const turnosFiltrados = tabActivo === 'todos'
    ? turnos
    : turnos.filter(t => t.barbero_id === tabActivo)

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Agenda de hoy</div>
        <a href="/dashboard/agenda" className="card-action">Ver completa</a>
      </div>
      <div className="card-body">
        <div className="tabs">
          <button
            className={`tab ${tabActivo === 'todos' ? 'active' : ''}`}
            onClick={() => setTabActivo('todos')}
          >
            Todos
          </button>
          {barberos.map(([id, nombre]) => (
            <button
              key={id}
              className={`tab ${tabActivo === id ? 'active' : ''}`}
              onClick={() => setTabActivo(id)}
            >
              {nombre.split(' ')[0]}
            </button>
          ))}
        </div>

        {turnosFiltrados.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📅</div>
            <div className="empty-text">No hay turnos para hoy</div>
          </div>
        ) : (
          <div className="turno-list">
            {turnosFiltrados.map(t => (
              <div
                key={t.id}
                className={`turno-item ${t.estado === 'en_curso' ? 'en-curso' : ''} ${['cancelado','cancelado_sin_reembolso','cancelado_por_local'].includes(t.estado) ? 'opacity-50' : ''}`}
                style={['cancelado','cancelado_sin_reembolso','cancelado_por_local'].includes(t.estado) ? { opacity: .45 } : {}}
              >
                <div className="turno-hora">{formatHora(t.fecha_hora_inicio)}</div>
                <div className={`turno-dot ${t.estado === 'en_curso' ? 'en-curso' : t.estado === 'confirmado' ? 'confirmado' : t.estado === 'completado' ? 'completado' : 'cancelado'}`} />
                <div className="turno-info">
                  <div className="turno-cliente">{t.cliente_nombre}</div>
                  <div className="turno-svc">{t.servicio_nombre} · {t.duracion_min}min</div>
                </div>
                <div className="turno-tag">{t.barbero_nombre.split(' ')[0]}</div>
                <div className="turno-monto">{formatPrecio(t.monto_total)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

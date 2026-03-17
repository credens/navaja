'use client'

import { useEffect, useRef } from 'react'

interface Props {
  data: { dia: string; valor: number; today: boolean }[]
}

export default function MiniChart({ data }: Props) {
  const barsRef = useRef<HTMLDivElement[]>([])
  const max = Math.max(...data.map(d => d.valor))

  useEffect(() => {
    barsRef.current.forEach((bar, i) => {
      if (!bar) return
      setTimeout(() => {
        bar.style.height = ((data[i].valor / max) * 72) + 'px'
      }, 50 + i * 60)
    })
  }, [data, max])

  return (
    <div className="chart-wrap">
      <div className="chart-bars">
        {data.map((d, i) => (
          <div className="bar-col" key={i}>
            <div
              className={`bar ${d.today ? 'today' : ''}`}
              style={{ height: '0px', transition: 'height .5s cubic-bezier(.4,0,.2,1)' }}
              ref={el => { if (el) barsRef.current[i] = el }}
            />
            <div className="bar-label">{d.dia}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

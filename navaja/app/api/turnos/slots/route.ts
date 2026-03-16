import { NextRequest, NextResponse } from 'next/server'
import { obtenerSlots, obtenerSlotsMultiBarbero } from '@/lib/services/agenda'
import { z } from 'zod'

const schema = z.object({
  barbero_id:  z.string().uuid().optional(),
  servicio_id: z.string().uuid(),
  fecha:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  barberia_id: z.string().uuid().optional(),
})

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const parsed = schema.safeParse({
    barbero_id:  searchParams.get('barbero_id') ?? undefined,
    servicio_id: searchParams.get('servicio_id'),
    fecha:       searchParams.get('fecha'),
    barberia_id: searchParams.get('barberia_id') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { barbero_id, servicio_id, fecha, barberia_id } = parsed.data

  try {
    if (barbero_id) {
      // Slots para un barbero específico
      const slots = await obtenerSlots(barbero_id, servicio_id, fecha)
      return NextResponse.json({ slots })
    }

    if (barberia_id) {
      // Slots para todos los barberos de la barbería
      const resultado = await obtenerSlotsMultiBarbero(barberia_id, servicio_id, fecha)
      return NextResponse.json({ barberos: resultado })
    }

    return NextResponse.json({ error: 'Se requiere barbero_id o barberia_id' }, { status: 400 })

  } catch (err) {
    console.error('[slots] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

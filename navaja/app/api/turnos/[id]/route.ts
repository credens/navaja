import { NextRequest, NextResponse } from 'next/server'
import { cancelarTurno } from '@/lib/services/cancelaciones'
import { z } from 'zod'

const schema = z.object({
  cancelado_por: z.enum(['cliente', 'barbero', 'dueno', 'sistema']),
  motivo:        z.string().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body   = await req.json()
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const resultado = await cancelarTurno(
    params.id,
    parsed.data.cancelado_por,
    parsed.data.motivo
  )

  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error }, { status: 400 })
  }

  return NextResponse.json(resultado.data)
}

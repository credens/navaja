// ============================================================
// NAVAJA — Tipos del dominio
// ============================================================

export type EstadoTurno =
  | 'pendiente_pago'
  | 'confirmado'
  | 'en_curso'
  | 'completado'
  | 'cancelado'
  | 'cancelado_sin_reembolso'
  | 'cancelado_por_local'
  | 'no_show'

export type EstadoSuscripcion =
  | 'sin_plan'
  | 'trial'
  | 'activa'
  | 'suspendida'
  | 'cancelada'

export type EstadoLiquidacion = 'pendiente' | 'pagada' | 'en_disputa'

export type RolUsuario = 'dueno' | 'barbero'

export type CanalNotificacion = 'whatsapp' | 'email'

export type WspModo = 'plataforma' | 'propio'

// ── Barbería ────────────────────────────────────────────────
export interface Barberia {
  id: string
  nombre: string
  slug: string
  email: string
  telefono: string | null
  direccion: string | null
  logo_url: string | null
  mp_access_token: string | null
  mp_user_id: string | null
  mp_token_vence: string | null
  mp_subscription_id: string | null
  wsp_modo: WspModo
  wsp_phone_number_id: string | null
  plan_id: string | null
  suscripcion_estado: EstadoSuscripcion
  suscripcion_vence_en: string | null
  comision_plataforma_pct: number | null
  hs_cancelacion: number | null
  politica_no_show: 'cobra' | 'no_cobra'
  estado: 'pendiente_mp' | 'activa' | 'suspendida' | 'inactiva'
  onboarding_completado: boolean
  onboarding_paso_actual: number
  creado_en: string
  actualizado_en: string
}

// ── Barbero ─────────────────────────────────────────────────
export interface Barbero {
  id: string
  usuario_id: string
  barberia_id: string
  comision_pct: number
  foto_url: string | null
  descripcion: string | null
  acepta_turnos: boolean
  activo: boolean
  fecha_baja: string | null
  motivo_baja: string | null
  creado_en: string
  // Joins
  nombre?: string
  email?: string
  telefono?: string | null
}

// ── Servicio ─────────────────────────────────────────────────
export interface Servicio {
  id: string
  barberia_id: string
  nombre: string
  descripcion: string | null
  precio: number
  duracion_min: number
  activo: boolean
  orden: number
  creado_en: string
}

// ── Cliente ──────────────────────────────────────────────────
export interface Cliente {
  id: string
  barberia_id: string
  nombre: string
  telefono: string | null
  email: string | null
  creado_en: string
}

// ── Turno ────────────────────────────────────────────────────
export interface Turno {
  id: string
  barberia_id: string
  barbero_id: string
  servicio_id: string
  cliente_id: string
  fecha_hora_inicio: string
  fecha_hora_fin: string
  monto_total: number
  monto_mp_comision: number | null
  monto_neto: number | null
  monto_plataforma: number | null
  monto_barberia: number | null
  monto_barbero: number | null
  monto_dueno: number | null
  comision_plataforma_pct: number
  comision_barbero_pct: number
  estado: EstadoTurno
  mp_preference_id: string | null
  mp_payment_id: string | null
  mp_reembolso_id: string | null
  mp_preference_expira_en: string | null
  cancelado_en: string | null
  cancelado_por: 'cliente' | 'barbero' | 'dueno' | 'sistema' | null
  cancelacion_motivo: string | null
  recordatorio_24hs_enviado: boolean
  recordatorio_2hs_enviado: boolean
  notas: string | null
  creado_en: string
  actualizado_en: string
}

// ── Turno completo (view) ────────────────────────────────────
export interface TurnoCompleto extends Turno {
  barberia: string
  barberia_slug: string
  barbero_nombre: string
  servicio_nombre: string
  duracion_min: number
  cliente_nombre: string
  cliente_telefono: string | null
  cliente_email: string | null
}

// ── Liquidación ──────────────────────────────────────────────
export interface Liquidacion {
  id: string
  barberia_id: string
  barbero_id: string
  periodo_desde: string
  periodo_hasta: string
  turnos_completados: number
  turnos_cobrados: number
  monto_bruto: number
  monto_barbero: number
  estado: EstadoLiquidacion
  pagado_en: string | null
  pagado_por: string | null
  notas: string | null
  creado_en: string
  // Joins
  barbero_nombre?: string
  comision_pct?: number
}

// ── Slot de agenda ────────────────────────────────────────────
export interface Slot {
  hora_inicio: string       // "10:30"
  hora_fin: string          // "11:15"
  fecha_hora_inicio: string // ISO 8601
  fecha_hora_fin: string
  duracion_min: number
  disponible: boolean
}

// ── Comisiones calculadas ────────────────────────────────────
export interface ComisionesCalculadas {
  monto_total: number
  monto_mp_comision: number
  monto_neto: number
  monto_plataforma: number
  monto_barberia: number
  monto_barbero: number
  monto_dueno: number
  comision_plataforma_pct: number
  comision_barbero_pct: number
}

// ── Plan ─────────────────────────────────────────────────────
export interface Plan {
  id: string
  nombre: string
  tipo: 'fijo' | 'volumen'
  precio_base: number
  turnos_incluidos: number | null
  precio_por_turno_extra: number | null
  max_barberos: number | null
  activo: boolean
}

// ── Resultado genérico ───────────────────────────────────────
export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

-- ============================================================
-- NAVAJA — Migraciones SQL completas
-- Base de datos: PostgreSQL (Supabase)
-- Versión: 1.0.0
-- ============================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 0. PLATAFORMA CONFIG
-- Configuración global del SaaS (una sola fila)
-- ============================================================

CREATE TABLE plataforma_config (
    id                      SERIAL PRIMARY KEY,
    comision_pct            DECIMAL(5,2)    NOT NULL DEFAULT 5.00,
    hs_cancelacion_default  INT             NOT NULL DEFAULT 3,
    mp_app_id               TEXT,
    mp_client_secret        TEXT,
    wsp_phone_number_id     TEXT,
    wsp_access_token        TEXT,
    wsp_webhook_secret      TEXT,
    creado_en               TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Seed: fila única de config
INSERT INTO plataforma_config (comision_pct, hs_cancelacion_default)
VALUES (5.00, 3);

-- ============================================================
-- 1. PLANES
-- ============================================================

CREATE TABLE planes (
    id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre                      TEXT        NOT NULL,
    tipo                        TEXT        NOT NULL CHECK (tipo IN ('fijo', 'volumen')),
    precio_base                 DECIMAL(10,2) NOT NULL,
    turnos_incluidos            INT,                        -- solo para volumen
    precio_por_turno_extra      DECIMAL(10,2),              -- solo para volumen
    max_barberos                INT,                        -- NULL = ilimitado
    activo                      BOOLEAN     NOT NULL DEFAULT TRUE,
    creado_en                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO planes (nombre, tipo, precio_base, turnos_incluidos, max_barberos) VALUES
    ('Base', 'fijo',    0, NULL, 3),      -- precio a definir
    ('Pro',  'volumen', 0, 150,  NULL);   -- precio a definir

-- ============================================================
-- 2. BARBERIAS (tenants)
-- ============================================================

CREATE TABLE barberias (
    id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre                      TEXT        NOT NULL,
    slug                        TEXT        NOT NULL UNIQUE,
    email                       TEXT        NOT NULL UNIQUE,
    telefono                    TEXT,
    direccion                   TEXT,
    logo_url                    TEXT,

    -- MercadoPago
    mp_access_token             TEXT,
    mp_refresh_token            TEXT,
    mp_user_id                  TEXT,
    mp_token_vence              TIMESTAMPTZ,
    mp_subscription_id          TEXT,

    -- WhatsApp
    wsp_modo                    TEXT        NOT NULL DEFAULT 'plataforma'
                                                CHECK (wsp_modo IN ('plataforma', 'propio')),
    wsp_phone_number_id         TEXT,
    wsp_access_token            TEXT,
    wsp_business_account_id     TEXT,

    -- Plan y suscripción
    plan_id                     UUID        REFERENCES planes(id),
    suscripcion_estado          TEXT        NOT NULL DEFAULT 'sin_plan'
                                                CHECK (suscripcion_estado IN (
                                                    'sin_plan','trial','activa','suspendida','cancelada'
                                                )),
    suscripcion_vence_en        DATE,

    -- Config propia (override de defaults globales)
    comision_plataforma_pct     DECIMAL(5,2),   -- NULL = usa plataforma_config
    hs_cancelacion              INT,            -- NULL = usa plataforma_config (3hs)
    politica_no_show            TEXT        NOT NULL DEFAULT 'cobra'
                                                CHECK (politica_no_show IN ('cobra','no_cobra')),

    -- Estado general
    estado                      TEXT        NOT NULL DEFAULT 'pendiente_mp'
                                                CHECK (estado IN (
                                                    'pendiente_mp','activa','suspendida','inactiva'
                                                )),

    -- Onboarding
    onboarding_completado       BOOLEAN     NOT NULL DEFAULT FALSE,
    onboarding_paso_actual      INT         NOT NULL DEFAULT 1,

    creado_en                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_barberias_slug    ON barberias (slug);
CREATE INDEX idx_barberias_estado  ON barberias (estado);

-- ============================================================
-- 3. HORARIOS DE LA BARBERÍA
-- ============================================================

CREATE TABLE barberias_horarios (
    id              SERIAL      PRIMARY KEY,
    barberia_id     UUID        NOT NULL REFERENCES barberias(id) ON DELETE CASCADE,
    dia_semana      INT         NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0=dom
    hora_apertura   TIME        NOT NULL,
    hora_cierre     TIME        NOT NULL,
    activo          BOOLEAN     NOT NULL DEFAULT TRUE,

    UNIQUE (barberia_id, dia_semana)
);

-- ============================================================
-- 4. USUARIOS (dueños y barberos)
-- ============================================================

CREATE TABLE usuarios (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id         UUID        UNIQUE,     -- Supabase Auth UID
    barberia_id     UUID        NOT NULL REFERENCES barberias(id) ON DELETE CASCADE,
    nombre          TEXT        NOT NULL,
    email           TEXT        NOT NULL,
    telefono        TEXT,
    rol             TEXT        NOT NULL CHECK (rol IN ('dueno', 'barbero')),
    activo          BOOLEAN     NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (barberia_id, email)
);

CREATE INDEX idx_usuarios_barberia ON usuarios (barberia_id);
CREATE INDEX idx_usuarios_auth_id  ON usuarios (auth_id);

-- ============================================================
-- 5. BARBEROS
-- ============================================================

CREATE TABLE barberos (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id      UUID        NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    barberia_id     UUID        NOT NULL REFERENCES barberias(id) ON DELETE CASCADE,
    comision_pct    DECIMAL(5,2) NOT NULL CHECK (comision_pct BETWEEN 0 AND 100),
    foto_url        TEXT,
    descripcion     TEXT,
    acepta_turnos   BOOLEAN     NOT NULL DEFAULT TRUE,
    activo          BOOLEAN     NOT NULL DEFAULT TRUE,
    fecha_baja      TIMESTAMPTZ,
    motivo_baja     TEXT,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_barberos_barberia ON barberos (barberia_id);

-- ============================================================
-- 6. DISPONIBILIDAD DE BARBEROS
-- ============================================================

CREATE TABLE barberos_disponibilidad (
    id              SERIAL      PRIMARY KEY,
    barbero_id      UUID        NOT NULL REFERENCES barberos(id) ON DELETE CASCADE,
    dia_semana      INT         NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
    hora_inicio     TIME        NOT NULL,
    hora_fin        TIME        NOT NULL,
    activo          BOOLEAN     NOT NULL DEFAULT TRUE,

    UNIQUE (barbero_id, dia_semana)
);

-- ============================================================
-- 7. BLOQUEOS PUNTUALES DE BARBEROS
-- ============================================================

CREATE TABLE barberos_bloqueos (
    id              SERIAL      PRIMARY KEY,
    barbero_id      UUID        NOT NULL REFERENCES barberos(id) ON DELETE CASCADE,
    fecha_desde     TIMESTAMPTZ NOT NULL,
    fecha_hasta     TIMESTAMPTZ NOT NULL,
    motivo          TEXT,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (fecha_hasta > fecha_desde)
);

CREATE INDEX idx_bloqueos_barbero_fecha ON barberos_bloqueos (barbero_id, fecha_desde, fecha_hasta);

-- ============================================================
-- 8. SERVICIOS
-- ============================================================

CREATE TABLE servicios (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    barberia_id     UUID        NOT NULL REFERENCES barberias(id) ON DELETE CASCADE,
    nombre          TEXT        NOT NULL,
    descripcion     TEXT,
    precio          DECIMAL(10,2) NOT NULL CHECK (precio > 0),
    duracion_min    INT         NOT NULL CHECK (duracion_min > 0),
    activo          BOOLEAN     NOT NULL DEFAULT TRUE,
    orden           INT         NOT NULL DEFAULT 0,   -- para ordenar en la UI
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_servicios_barberia ON servicios (barberia_id);

-- ============================================================
-- 9. QUÉ SERVICIOS HACE CADA BARBERO
-- ============================================================

CREATE TABLE barberos_servicios (
    barbero_id      UUID        NOT NULL REFERENCES barberos(id) ON DELETE CASCADE,
    servicio_id     UUID        NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
    PRIMARY KEY (barbero_id, servicio_id)
);

-- ============================================================
-- 10. CLIENTES
-- ============================================================

CREATE TABLE clientes (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    barberia_id     UUID        NOT NULL REFERENCES barberias(id) ON DELETE CASCADE,
    nombre          TEXT        NOT NULL,
    telefono        TEXT,
    email           TEXT,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (barberia_id, telefono)
);

CREATE INDEX idx_clientes_barberia  ON clientes (barberia_id);
CREATE INDEX idx_clientes_telefono  ON clientes (telefono);

-- ============================================================
-- 11. TURNOS (corazón del sistema)
-- ============================================================

CREATE TABLE turnos (
    id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    barberia_id                 UUID        NOT NULL REFERENCES barberias(id),
    barbero_id                  UUID        NOT NULL REFERENCES barberos(id),
    servicio_id                 UUID        NOT NULL REFERENCES servicios(id),
    cliente_id                  UUID        NOT NULL REFERENCES clientes(id),

    -- Tiempo
    fecha_hora_inicio           TIMESTAMPTZ NOT NULL,
    fecha_hora_fin              TIMESTAMPTZ NOT NULL,

    -- Montos (snapshot al momento de la reserva)
    monto_total                 DECIMAL(10,2) NOT NULL,
    monto_mp_comision           DECIMAL(10,2),
    monto_neto                  DECIMAL(10,2),
    monto_plataforma            DECIMAL(10,2),
    monto_barberia              DECIMAL(10,2),
    monto_barbero               DECIMAL(10,2),
    monto_dueno                 DECIMAL(10,2),

    -- Snapshot de porcentajes usados
    comision_plataforma_pct     DECIMAL(5,2) NOT NULL,
    comision_barbero_pct        DECIMAL(5,2) NOT NULL,

    -- Estado
    estado                      TEXT        NOT NULL DEFAULT 'pendiente_pago'
                                                CHECK (estado IN (
                                                    'pendiente_pago',
                                                    'confirmado',
                                                    'en_curso',
                                                    'completado',
                                                    'cancelado',
                                                    'cancelado_sin_reembolso',
                                                    'cancelado_por_local',
                                                    'no_show'
                                                )),

    -- MercadoPago
    mp_preference_id            TEXT,
    mp_payment_id               TEXT,
    mp_reembolso_id             TEXT,
    mp_preference_expira_en     TIMESTAMPTZ,    -- 30 min tras crear la preferencia

    -- Cancelación
    cancelado_en                TIMESTAMPTZ,
    cancelado_por               TEXT        CHECK (cancelado_por IN (
                                                'cliente','barbero','dueno','sistema'
                                            )),
    cancelacion_motivo          TEXT,

    -- Recordatorios enviados
    recordatorio_24hs_enviado   BOOLEAN     NOT NULL DEFAULT FALSE,
    recordatorio_2hs_enviado    BOOLEAN     NOT NULL DEFAULT FALSE,

    -- Notas
    notas                       TEXT,

    creado_en                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (fecha_hora_fin > fecha_hora_inicio)
);

CREATE INDEX idx_turnos_barbero_fecha   ON turnos (barbero_id, fecha_hora_inicio);
CREATE INDEX idx_turnos_barberia_fecha  ON turnos (barberia_id, fecha_hora_inicio);
CREATE INDEX idx_turnos_estado          ON turnos (estado);
CREATE INDEX idx_turnos_mp_payment      ON turnos (mp_payment_id);
CREATE INDEX idx_turnos_mp_preference   ON turnos (mp_preference_id);
CREATE INDEX idx_turnos_recordatorios   ON turnos (estado, fecha_hora_inicio)
    WHERE recordatorio_24hs_enviado = FALSE OR recordatorio_2hs_enviado = FALSE;

-- ============================================================
-- 12. LIQUIDACIONES
-- ============================================================

CREATE TABLE liquidaciones (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    barberia_id         UUID        NOT NULL REFERENCES barberias(id),
    barbero_id          UUID        NOT NULL REFERENCES barberos(id),
    periodo_desde       DATE        NOT NULL,
    periodo_hasta       DATE        NOT NULL,
    turnos_completados  INT         NOT NULL DEFAULT 0,
    turnos_cobrados     INT         NOT NULL DEFAULT 0,
    monto_bruto         DECIMAL(10,2) NOT NULL DEFAULT 0,
    monto_barbero       DECIMAL(10,2) NOT NULL DEFAULT 0,
    estado              TEXT        NOT NULL DEFAULT 'pendiente'
                                        CHECK (estado IN ('pendiente','pagada','en_disputa')),
    pagado_en           TIMESTAMPTZ,
    pagado_por          UUID        REFERENCES usuarios(id),
    notas               TEXT,
    creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (barbero_id, periodo_desde, periodo_hasta)
);

CREATE INDEX idx_liquidaciones_barberia ON liquidaciones (barberia_id);
CREATE INDEX idx_liquidaciones_estado   ON liquidaciones (estado);

-- ============================================================
-- 13. DETALLE DE LIQUIDACIÓN
-- ============================================================

CREATE TABLE liquidaciones_detalle (
    id              SERIAL      PRIMARY KEY,
    liquidacion_id  UUID        NOT NULL REFERENCES liquidaciones(id) ON DELETE CASCADE,
    turno_id        UUID        NOT NULL REFERENCES turnos(id),
    monto_barbero   DECIMAL(10,2) NOT NULL
);

CREATE INDEX idx_liq_detalle_liquidacion ON liquidaciones_detalle (liquidacion_id);

-- ============================================================
-- 14. BAJAS PENDIENTES DE BARBEROS
-- (cuando hay un turno en curso al momento de dar de baja)
-- ============================================================

CREATE TABLE bajas_pendientes (
    id              SERIAL      PRIMARY KEY,
    barbero_id      UUID        NOT NULL REFERENCES barberos(id),
    turno_id        UUID        NOT NULL REFERENCES turnos(id),
    motivo          TEXT,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ejecutado_en    TIMESTAMPTZ             -- NULL hasta que se procese
);

-- ============================================================
-- 15. NOTIFICACIONES LOG
-- ============================================================

CREATE TABLE notificaciones_log (
    id              SERIAL      PRIMARY KEY,
    turno_id        UUID        REFERENCES turnos(id),
    barberia_id     UUID        REFERENCES barberias(id),
    destinatario    TEXT        NOT NULL,
    canal           TEXT        NOT NULL CHECK (canal IN ('whatsapp', 'email')),
    tipo            TEXT        NOT NULL,
    estado          TEXT        NOT NULL DEFAULT 'enviado'
                                    CHECK (estado IN ('enviado','fallido','reintentando')),
    proveedor_id    TEXT,
    error           TEXT,
    intentos        INT         NOT NULL DEFAULT 1,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_turno     ON notificaciones_log (turno_id);
CREATE INDEX idx_notif_barberia  ON notificaciones_log (barberia_id);
CREATE INDEX idx_notif_estado    ON notificaciones_log (estado);

-- ============================================================
-- 16. REEMBOLSOS PENDIENTES
-- (reintentar cuando MP falla)
-- ============================================================

CREATE TABLE reembolsos_pendientes (
    id              SERIAL      PRIMARY KEY,
    turno_id        UUID        NOT NULL REFERENCES turnos(id),
    monto           DECIMAL(10,2) NOT NULL,
    intentos        INT         NOT NULL DEFAULT 0,
    ultimo_error    TEXT,
    resuelto        BOOLEAN     NOT NULL DEFAULT FALSE,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    proximo_intento TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '5 minutes'
);

CREATE INDEX idx_reembolsos_pendientes ON reembolsos_pendientes (resuelto, proximo_intento)
    WHERE resuelto = FALSE;

-- ============================================================
-- 17. HISTORIAL DE PLANES
-- ============================================================

CREATE TABLE barberias_planes_historial (
    id              SERIAL      PRIMARY KEY,
    barberia_id     UUID        NOT NULL REFERENCES barberias(id),
    plan_id         UUID        NOT NULL REFERENCES planes(id),
    desde           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hasta           TIMESTAMPTZ,
    motivo_cambio   TEXT
);

-- ============================================================
-- 18. USUARIOS PENDIENTES
-- (registro en curso, todavía sin barberia_id)
-- ============================================================

CREATE TABLE usuarios_pendientes (
    id              SERIAL      PRIMARY KEY,
    auth_id         UUID        NOT NULL UNIQUE,
    nombre          TEXT        NOT NULL,
    email           TEXT        NOT NULL,
    telefono        TEXT,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS: actualizado_en automático
-- ============================================================

CREATE OR REPLACE FUNCTION set_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_barberias_actualizado_en
    BEFORE UPDATE ON barberias
    FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

CREATE TRIGGER trg_turnos_actualizado_en
    BEFORE UPDATE ON turnos
    FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

-- ============================================================
-- TRIGGER: fecha_hora_fin automática al insertar turno
-- ============================================================

CREATE OR REPLACE FUNCTION calcular_fecha_hora_fin()
RETURNS TRIGGER AS $$
DECLARE
    dur INT;
BEGIN
    SELECT duracion_min INTO dur
    FROM servicios WHERE id = NEW.servicio_id;

    NEW.fecha_hora_fin = NEW.fecha_hora_inicio + (dur * INTERVAL '1 minute');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_turnos_fecha_fin
    BEFORE INSERT ON turnos
    FOR EACH ROW
    WHEN (NEW.fecha_hora_fin IS NULL OR NEW.fecha_hora_fin = NEW.fecha_hora_inicio)
    EXECUTE FUNCTION calcular_fecha_hora_fin();

-- ============================================================
-- TRIGGER: snapshot de comisiones al insertar turno
-- ============================================================

CREATE OR REPLACE FUNCTION snapshot_comisiones()
RETURNS TRIGGER AS $$
DECLARE
    pct_plataforma  DECIMAL(5,2);
    pct_barbero     DECIMAL(5,2);
    monto_mp        DECIMAL(10,2);
    monto_neto      DECIMAL(10,2);
    monto_plat      DECIMAL(10,2);
    monto_barc      DECIMAL(10,2);
    monto_barb      DECIMAL(10,2);
    monto_due       DECIMAL(10,2);
    precio          DECIMAL(10,2);
BEGIN
    -- Obtener porcentajes
    SELECT COALESCE(b.comision_plataforma_pct, pc.comision_pct)
    INTO pct_plataforma
    FROM barberias b, plataforma_config pc
    WHERE b.id = NEW.barberia_id
    LIMIT 1;

    SELECT br.comision_pct INTO pct_barbero
    FROM barberos br WHERE br.id = NEW.barbero_id;

    precio := NEW.monto_total;

    -- Cálculo del split
    monto_mp   := ROUND(precio * 5.99 / 100, 2);
    monto_neto := precio - monto_mp;
    monto_plat := ROUND(monto_neto * pct_plataforma / 100, 2);
    monto_barc := monto_neto - monto_plat;
    monto_barb := ROUND(monto_barc * pct_barbero / 100, 2);
    monto_due  := monto_barc - monto_barb;   -- absorbe centavos de redondeo

    NEW.monto_mp_comision        := monto_mp;
    NEW.monto_neto               := monto_neto;
    NEW.monto_plataforma         := monto_plat;
    NEW.monto_barberia           := monto_barc;
    NEW.monto_barbero            := monto_barb;
    NEW.monto_dueno              := monto_due;
    NEW.comision_plataforma_pct  := pct_plataforma;
    NEW.comision_barbero_pct     := pct_barbero;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_turnos_comisiones
    BEFORE INSERT ON turnos
    FOR EACH ROW EXECUTE FUNCTION snapshot_comisiones();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Supabase: aislar datos por barbería
-- ============================================================

ALTER TABLE barberias            ENABLE ROW LEVEL SECURITY;
ALTER TABLE barberias_horarios   ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios             ENABLE ROW LEVEL SECURITY;
ALTER TABLE barberos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE barberos_disponibilidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE barberos_bloqueos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios            ENABLE ROW LEVEL SECURITY;
ALTER TABLE barberos_servicios   ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE liquidaciones        ENABLE ROW LEVEL SECURITY;
ALTER TABLE liquidaciones_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones_log   ENABLE ROW LEVEL SECURITY;

-- Función helper: obtener barberia_id del usuario autenticado
CREATE OR REPLACE FUNCTION auth_barberia_id()
RETURNS UUID AS $$
    SELECT barberia_id FROM usuarios
    WHERE auth_id = auth.uid()
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Función helper: es admin de la plataforma
CREATE OR REPLACE FUNCTION es_admin_plataforma()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM usuarios
        WHERE auth_id = auth.uid()
          AND rol = 'dueno'
          AND barberia_id IS NULL  -- admins no tienen barbería asignada
    );
$$ LANGUAGE sql SECURITY DEFINER;

-- Políticas RLS: cada usuario ve solo su barbería

CREATE POLICY "barberia_propia" ON barberias
    USING (id = auth_barberia_id() OR es_admin_plataforma());

CREATE POLICY "barberia_propia" ON barberias_horarios
    USING (barberia_id = auth_barberia_id());

CREATE POLICY "barberia_propia" ON usuarios
    USING (barberia_id = auth_barberia_id() OR auth_id = auth.uid());

CREATE POLICY "barberia_propia" ON barberos
    USING (barberia_id = auth_barberia_id());

CREATE POLICY "barberia_propia" ON barberos_disponibilidad
    USING (barbero_id IN (
        SELECT id FROM barberos WHERE barberia_id = auth_barberia_id()
    ));

CREATE POLICY "barberia_propia" ON barberos_bloqueos
    USING (barbero_id IN (
        SELECT id FROM barberos WHERE barberia_id = auth_barberia_id()
    ));

CREATE POLICY "barberia_propia" ON servicios
    USING (barberia_id = auth_barberia_id());

CREATE POLICY "barberia_propia" ON barberos_servicios
    USING (barbero_id IN (
        SELECT id FROM barberos WHERE barberia_id = auth_barberia_id()
    ));

CREATE POLICY "barberia_propia" ON clientes
    USING (barberia_id = auth_barberia_id());

CREATE POLICY "barberia_propia" ON turnos
    USING (barberia_id = auth_barberia_id());

CREATE POLICY "barberia_propia" ON liquidaciones
    USING (barberia_id = auth_barberia_id());

CREATE POLICY "barberia_propia" ON liquidaciones_detalle
    USING (liquidacion_id IN (
        SELECT id FROM liquidaciones WHERE barberia_id = auth_barberia_id()
    ));

CREATE POLICY "barberia_propia" ON notificaciones_log
    USING (barberia_id = auth_barberia_id());

-- Política pública para el flujo de reserva del cliente
-- (sin autenticación, solo lectura de datos necesarios)
CREATE POLICY "lectura_publica_barberia" ON barberias
    FOR SELECT USING (estado = 'activa');

CREATE POLICY "lectura_publica_servicios" ON servicios
    FOR SELECT USING (activo = TRUE AND barberia_id IN (
        SELECT id FROM barberias WHERE estado = 'activa'
    ));

CREATE POLICY "lectura_publica_barberos" ON barberos
    FOR SELECT USING (activo = TRUE AND acepta_turnos = TRUE);

CREATE POLICY "insercion_publica_clientes" ON clientes
    FOR INSERT WITH CHECK (TRUE);   -- el cliente se crea en el flujo de reserva

CREATE POLICY "insercion_publica_turnos" ON turnos
    FOR INSERT WITH CHECK (estado = 'pendiente_pago');

-- ============================================================
-- VISTAS ÚTILES
-- ============================================================

CREATE VIEW v_turnos_completo AS
SELECT
    t.id,
    t.fecha_hora_inicio,
    t.fecha_hora_fin,
    t.estado,
    t.monto_total,
    t.monto_mp_comision,
    t.monto_plataforma,
    t.monto_barbero,
    t.monto_dueno,
    t.mp_payment_id,
    t.cancelado_por,
    t.creado_en,
    b.nombre            AS barberia,
    b.slug              AS barberia_slug,
    u.nombre            AS barbero_nombre,
    s.nombre            AS servicio_nombre,
    s.duracion_min,
    c.nombre            AS cliente_nombre,
    c.telefono          AS cliente_telefono,
    c.email             AS cliente_email
FROM turnos t
JOIN barberias  b  ON b.id = t.barberia_id
JOIN barberos   br ON br.id = t.barbero_id
JOIN usuarios   u  ON u.id = br.usuario_id
JOIN servicios  s  ON s.id = t.servicio_id
JOIN clientes   c  ON c.id = t.cliente_id;

CREATE VIEW v_agenda_dia AS
SELECT
    t.id,
    t.barberia_id,
    t.barbero_id,
    t.fecha_hora_inicio,
    t.fecha_hora_fin,
    t.estado,
    t.monto_total,
    u.nombre            AS barbero_nombre,
    s.nombre            AS servicio_nombre,
    s.duracion_min,
    c.nombre            AS cliente_nombre,
    c.telefono          AS cliente_telefono
FROM turnos t
JOIN barberos   br ON br.id = t.barbero_id
JOIN usuarios   u  ON u.id = br.usuario_id
JOIN servicios  s  ON s.id = t.servicio_id
JOIN clientes   c  ON c.id = t.cliente_id
WHERE t.estado NOT IN ('cancelado', 'cancelado_por_local');

CREATE VIEW v_liquidaciones_pendientes AS
SELECT
    l.id,
    l.barberia_id,
    l.periodo_desde,
    l.periodo_hasta,
    l.turnos_cobrados,
    l.monto_barbero,
    l.estado,
    u.nombre            AS barbero_nombre,
    br.comision_pct     AS comision_pct
FROM liquidaciones l
JOIN barberos   br ON br.id = l.barbero_id
JOIN usuarios   u  ON u.id = br.usuario_id
WHERE l.estado = 'pendiente';

CREATE VIEW v_metricas_barberia AS
SELECT
    barberia_id,
    COUNT(*) FILTER (WHERE estado = 'completado')           AS turnos_completados,
    COUNT(*) FILTER (WHERE estado = 'no_show')              AS no_shows,
    COUNT(*) FILTER (WHERE estado LIKE 'cancelado%')        AS cancelaciones,
    SUM(monto_total) FILTER (WHERE estado IN (
        'completado','cancelado_sin_reembolso','no_show'
    ))                                                       AS recaudacion_total,
    SUM(monto_plataforma) FILTER (WHERE estado IN (
        'completado','cancelado_sin_reembolso','no_show'
    ))                                                       AS comision_plataforma_total,
    DATE_TRUNC('month', fecha_hora_inicio)                  AS mes
FROM turnos
GROUP BY barberia_id, DATE_TRUNC('month', fecha_hora_inicio);

-- ============================================================
-- SEED: datos de prueba para desarrollo
-- ============================================================

-- Barbería demo
INSERT INTO barberias (
    id, nombre, slug, email, telefono, direccion,
    estado, suscripcion_estado, suscripcion_vence_en,
    wsp_modo, hs_cancelacion, politica_no_show
) VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Barber Kings',
    'barber-kings',
    'rodrigo@barberkings.com',
    '1155667788',
    'Av. Corrientes 1234, CABA',
    'activa',
    'trial',
    CURRENT_DATE + INTERVAL '7 days',
    'plataforma',
    3,
    'cobra'
);

-- Horarios (lun-sáb 9:00-20:00)
INSERT INTO barberias_horarios (barberia_id, dia_semana, hora_apertura, hora_cierre) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, '09:00', '20:00'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 2, '09:00', '20:00'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 3, '09:00', '20:00'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 4, '09:00', '20:00'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 5, '09:00', '20:00'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 6, '09:00', '18:00');

-- Dueño
INSERT INTO usuarios (id, barberia_id, nombre, email, telefono, rol) VALUES
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
     'Rodrigo Martínez', 'rodrigo@barberkings.com', '1155667788', 'dueno');

-- Barberos
INSERT INTO usuarios (id, barberia_id, nombre, email, telefono, rol) VALUES
    ('cccccccc-cccc-cccc-cccc-cccccccccccc',
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
     'Martín López', 'martin@barberkings.com', '1144556677', 'barbero'),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd',
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
     'Lucas Herrera', 'lucas@barberkings.com', '1133445566', 'barbero'),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
     'Sebastián Ruiz', 'seba@barberkings.com', '1122334455', 'barbero');

INSERT INTO barberos (id, usuario_id, barberia_id, comision_pct) VALUES
    ('ff000000-0000-0000-0000-000000000001',
     'cccccccc-cccc-cccc-cccc-cccccccccccc',
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 50.00),
    ('ff000000-0000-0000-0000-000000000002',
     'dddddddd-dddd-dddd-dddd-dddddddddddd',
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 45.00),
    ('ff000000-0000-0000-0000-000000000003',
     'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 40.00);

-- Disponibilidad (lun-sáb 9:00-19:00)
INSERT INTO barberos_disponibilidad (barbero_id, dia_semana, hora_inicio, hora_fin)
SELECT id, d, '09:00', '19:00'
FROM barberos, generate_series(1,6) AS d
WHERE barberia_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- Servicios
INSERT INTO servicios (id, barberia_id, nombre, precio, duracion_min, orden) VALUES
    ('a0000001-0000-0000-0000-000000000001',
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
     'Corte', 8000, 30, 1),
    ('a0000001-0000-0000-0000-000000000002',
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
     'Corte + Barba', 12000, 45, 2),
    ('a0000001-0000-0000-0000-000000000003',
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
     'Corte + Barba + Lavado', 15000, 60, 3),
    ('a0000001-0000-0000-0000-000000000004',
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
     'Arreglo de barba', 6000, 20, 4);

-- Todos los barberos hacen todos los servicios
INSERT INTO barberos_servicios (barbero_id, servicio_id)
SELECT b.id, s.id
FROM barberos b, servicios s
WHERE b.barberia_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  AND s.barberia_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

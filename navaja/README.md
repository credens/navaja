# Navaja 💈

Sistema de turnos para barberías. SaaS multi-tenant con agenda online, pagos con MercadoPago y notificaciones por WhatsApp.

---

## Stack

- **Frontend + API**: Next.js 14 (App Router)
- **Base de datos**: Supabase (PostgreSQL)
- **Pagos**: MercadoPago Marketplace
- **Notificaciones**: Meta Cloud API (WhatsApp)
- **Deploy**: Vercel

---

## Setup local

### 1. Prerequisitos

```bash
# Verificar Node.js (necesitás v18+)
node --version

# Instalar Docker Desktop
# https://www.docker.com/products/docker-desktop/
# Abrilo y dejalo corriendo

# Instalar Supabase CLI
npm install -g supabase
supabase --version
```

### 2. Clonar el repo

```bash
git clone https://github.com/credens/navaja.git
cd navaja
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Editá `.env.local`. Por ahora solo necesitás las variables de Supabase
(las de MP y WhatsApp las completás cuando llegues a esa integración).

### 4. Iniciar Supabase local

```bash
# Arranca Postgres + Auth + Studio en Docker
npm run db:start
```

Al terminar te muestra algo como:

```
API URL:      http://127.0.0.1:54321
DB URL:       postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL:   http://127.0.0.1:54323
anon key:     eyJhbGci...
service_role: eyJhbGci...
```

Copiá el `anon key` y `service_role key` en tu `.env.local`.

### 5. Correr las migraciones

```bash
# Aplica supabase/migrations/20260315000000_initial.sql
npm run db:reset
```

Esto crea todas las tablas, triggers, políticas RLS y el seed de Barber Kings.

### 6. Abrir Supabase Studio

```bash
npm run db:studio
# Abre http://localhost:54323
```

Desde Studio podés ver las tablas, hacer queries y verificar que todo esté bien.

### 7. Iniciar Next.js

```bash
npm run dev
# Abre http://localhost:3000
```

---

## Estructura del proyecto

```
navaja/
├── app/
│   ├── (public)/
│   │   └── [slug]/              ← turnera pública de cada barbería
│   ├── (dashboard)/
│   │   └── dashboard/           ← panel del dueño
│   ├── (auth)/
│   │   └── registro/            ← onboarding de nueva barbería
│   └── api/
│       ├── turnos/              ← GET slots / POST crear turno
│       │   └── [id]/            ← PATCH cancelar
│       ├── mp/
│       │   └── callback/        ← OAuth de MercadoPago
│       ├── webhooks/
│       │   ├── mp/              ← pagos y suscripciones
│       │   └── whatsapp/        ← mensajes entrantes
│       └── cron/
│           ├── turnos/          ← no-shows, recordatorios (cada 15 min)
│           └── suscripciones/   ← trials y canon (diario)
│
├── lib/
│   ├── supabase/
│   │   ├── server.ts            ← cliente SSR
│   │   └── client.ts            ← cliente browser
│   ├── services/
│   │   ├── agenda.ts            ← cálculo de slots
│   │   ├── comisiones.ts        ← split de pagos
│   │   ├── cancelaciones.ts     ← regla de 3hs
│   │   ├── barberos.ts          ← alta y baja
│   │   └── liquidaciones.ts     ← generación de períodos
│   ├── mp/
│   │   ├── client.ts            ← preferencias y OAuth
│   │   └── refunds.ts           ← reembolsos
│   └── whatsapp/
│       ├── client.ts            ← templates y mensajes
│       └── onboarding.ts        ← notificaciones de registro
│
├── types/
│   └── index.ts                 ← tipos TypeScript del dominio
│
└── supabase/
    ├── config.toml              ← configuración local
    └── migrations/
        └── 20260315000000_initial.sql
```

---

## Comandos útiles

```bash
npm run dev          # Next.js en localhost:3000
npm run db:start     # Arrancar Supabase (Docker)
npm run db:stop      # Detener Supabase
npm run db:reset     # Resetear DB y correr migraciones desde cero
npm run db:studio    # Abrir Supabase Studio en el browser
npm run db:migrate   # Aplicar nuevas migraciones
```

---

## MercadoPago (sandbox)

Para testear pagos sin dinero real:

1. Crear cuenta en https://www.mercadopago.com.ar/developers
2. Ir a "Tus integraciones" → crear app
3. Usar las credenciales de **prueba** (no producción)
4. Los pagos de prueba se hacen con tarjetas de test:
   - Visa aprobada: `4509 9535 6623 3704`
   - CVV: `123` · Vencimiento: cualquiera futura

---

## WhatsApp (Meta)

Para desarrollo sin aprobar templates:

1. Crear app en https://developers.facebook.com
2. Agregar producto "WhatsApp"
3. Usar el número de prueba que provee Meta
4. Los primeros 5 números de teléfono son gratuitos para testear
5. Tunnel para el webhook local:
   ```bash
   npx localtunnel --port 3000
   # Usar la URL generada en Meta → Webhooks
   ```

---

## Variables de entorno

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL local de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (solo servidor) |
| `MP_APP_ID` | App ID de MercadoPago |
| `MP_CLIENT_SECRET` | Client Secret de MercadoPago |
| `MP_WEBHOOK_SECRET` | Secret para validar webhooks de MP |
| `WSP_PLATFORM_PHONE_NUMBER_ID` | Phone Number ID de Meta |
| `WSP_PLATFORM_ACCESS_TOKEN` | Token de acceso de Meta |
| `WSP_WEBHOOK_VERIFY_TOKEN` | Token de verificación del webhook WSP |
| `CRON_SECRET` | Secret para proteger los endpoints de cron |
| `NEXT_PUBLIC_APP_URL` | URL de la app (localhost:3000 en dev) |

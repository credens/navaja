import type { Metadata } from 'next'
import LandingScripts from './_components/LandingScripts'

export const metadata: Metadata = {
  title: 'Navaja — La turnera con filo',
  description: 'Sistema de turnos para barberías. Agenda online, pagos con MercadoPago y notificaciones por WhatsApp.',
}

const features = [
  { n: '01', t: 'Agenda inteligente', d: 'Turnos online 24/7. Tus clientes reservan, eligen servicio, barbero y horario. Vos te enfocás en cortar.' },
  { n: '02', t: 'Pagos con MercadoPago', d: 'El cliente paga al reservar. El split entre vos y tus barberos es automático. Sin plata que se pierde.' },
  { n: '03', t: 'Comisiones automáticas', d: 'Configurás el porcentaje de cada barbero y Navaja calcula todo. Liquidaciones claras, sin discusiones.' },
  { n: '04', t: 'WhatsApp integrado', d: 'Confirmaciones, recordatorios y alertas automáticas. Tu cliente siempre sabe cuándo es su turno.' },
  { n: '05', t: 'Política de cancelación', d: 'Cancelaciones con menos de 3 horas se cobran igual. Protegé el tiempo de tus barberos.' },
  { n: '06', t: 'Tu página propia', d: 'navaja.app/tu-barberia — una URL limpia y profesional para compartir con tus clientes.' },
]

const steps = [
  { n: '01', t: 'Registrás tu barbería', d: 'Cargás tus servicios, horarios y barberos. En 15 minutos estás operativo.' },
  { n: '02', t: 'Conectás MercadoPago', d: 'Vinculás tu cuenta de MP con un clic. Los pagos se acreditan directo en tu cuenta.' },
  { n: '03', t: 'Compartís tu link', d: 'Tu cliente entra, elige el servicio y paga. Vos recibís un WhatsApp con el turno confirmado.' },
  { n: '04', t: 'Cerrás el mes sin sorpresas', d: 'Navaja calcula las comisiones de cada barbero. Ves exactamente qué le corresponde a cada uno.' },
]

export default function LandingPage() {
  return (
    <>
      <LandingScripts />

      <nav id="nav">
        <div className="nav-logo">Navaja</div>
        <div className="nav-links">
          <a href="#features">Funciones</a>
          <a href="#how">Cómo funciona</a>
          <a href="#pricing">Precios</a>
          <a href="/registro" className="nav-cta">7 días gratis</a>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-lines" />
        <div className="hero-content">
          <div className="trial-badge">7 días gratis · Sin tarjeta</div>
          <h1 className="hero-title">La turnera<br />con <em>filo.</em></h1>
          <p className="hero-subtitle">Gestión profesional para barberías que trabajan en serio.</p>
          <p className="hero-desc">Agenda online, pagos con MercadoPago, comisiones automáticas y notificaciones por WhatsApp. Todo en un solo lugar.</p>
          <div className="hero-actions">
            <a href="/registro" className="btn-primary">Probá 7 días gratis</a>
            <a href="#how" className="btn-secondary">Ver cómo funciona</a>
          </div>
        </div>
        <div className="hero-stat">
          <div className="hero-stat-num">7</div>
          <div className="hero-stat-label">días de prueba gratis</div>
        </div>
      </section>

      <div className="blade" />

      <section className="features" id="features">
        <div className="reveal">
          <p className="section-label">Por qué Navaja</p>
          <h2 className="section-title">Todo lo que tu barbería necesita.</h2>
        </div>
        <div className="features-grid reveal">
          {features.map(f => (
            <div className="feature-card" key={f.n}>
              <p className="feature-num">{f.n}</p>
              <div className="feature-icon" />
              <h3 className="feature-title">{f.t}</h3>
              <p className="feature-desc">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="blade" />

      <section className="how" id="how">
        <div className="how-inner">
          <div>
            <div className="reveal">
              <p className="section-label">Cómo funciona</p>
              <h2 className="section-title" style={{ marginBottom: '48px' }}>
                Simple para vos.<br />Simple para tu cliente.
              </h2>
            </div>
            <div className="how-steps reveal">
              {steps.map(s => (
                <div className="step" key={s.n}>
                  <span className="step-num">{s.n}</span>
                  <div>
                    <h3 className="step-title">{s.t}</h3>
                    <p className="step-desc">{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="how-visual reveal">
            <div className="phone-mockup">
              <div className="mockup-bar">
                <div className="mockup-dot" /><div className="mockup-dot" /><div className="mockup-dot" />
                <div className="mockup-url">navaja.app/barber-kings</div>
              </div>
              <div className="mockup-barberia">Barber Kings</div>
              <div className="mockup-address">Av. Corrientes 1234, CABA</div>
              <div className="mockup-service">
                <div><div className="mockup-service-name">Corte</div><div className="mockup-service-info">30 min · Martín</div></div>
                <div className="mockup-service-price">$8.000</div>
              </div>
              <div className="mockup-service" style={{ borderColor: 'var(--gold)' }}>
                <div><div className="mockup-service-name">Corte + Barba</div><div className="mockup-service-info">45 min · Martín</div></div>
                <div className="mockup-service-price">$12.000</div>
              </div>
              <div className="mockup-service">
                <div><div className="mockup-service-name">Corte + Barba + Lavado</div><div className="mockup-service-info">60 min · Martín</div></div>
                <div className="mockup-service-price">$15.000</div>
              </div>
              <div style={{ marginTop: '20px', fontSize: '11px', color: 'var(--muted)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>
                Martes 18 de marzo
              </div>
              <div className="mockup-slots">
                <div className="slot taken">9:00</div>
                <div className="slot taken">9:30</div>
                <div className="slot taken">10:00</div>
                <div className="slot active">10:30</div>
                <div className="slot">11:00</div>
                <div className="slot">11:30</div>
                <div className="slot">12:00</div>
                <div className="slot taken">14:00</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="blade" />

      <section className="pricing" id="pricing">
        <div className="reveal">
          <p className="section-label">Precios</p>
          <h2 className="section-title">Sin letra chica.</h2>
        </div>
        <div className="pricing-grid reveal">
          <div className="price-card">
            <p className="price-badge">Para empezar</p>
            <h3 className="price-name">Base</h3>
            <div className="price-amount">$X <span>/ mes</span></div>
            <p className="price-period">Hasta 150 turnos · Hasta 3 barberos</p>
            <ul className="price-features">
              {['Agenda online 24/7','Pagos con MercadoPago','Notificaciones WhatsApp','Comisiones automáticas','Tu página personalizada'].map(f => <li key={f}>{f}</li>)}
            </ul>
            <a href="/registro" className="price-cta">Probá 7 días gratis</a>
          </div>
          <div className="price-card featured">
            <p className="price-badge">Para barberías que crecen</p>
            <h3 className="price-name">Pro</h3>
            <div className="price-amount">$X <span>+ por turno</span></div>
            <p className="price-period">Turnos ilimitados · Barberos ilimitados</p>
            <ul className="price-features">
              {['Todo lo del plan Base','WhatsApp con tu número propio','Barberos ilimitados','Reportes avanzados','Soporte prioritario'].map(f => <li key={f}>{f}</li>)}
            </ul>
            <a href="/registro" className="price-cta">Probá 7 días gratis</a>
          </div>
        </div>
        <p className="reveal" style={{ marginTop: '24px', fontSize: '13px', color: 'var(--muted)' }}>
          7 días gratis. Sin tarjeta. Sin compromisos. Solo conectás tu MercadoPago.
        </p>
      </section>

      <div className="blade" />

      <section className="testimony">
        <div className="testimony-bg" />
        <div className="testimony-inner reveal">
          <p className="testimony-quote">
            &ldquo;Antes perdía turnos porque los clientes se olvidaban o cancelaban a último momento.
            Con Navaja <em>el que cancela tarde, paga igual.</em> Mis barberos están mucho más tranquilos.&rdquo;
          </p>
          <div className="testimony-author">
            <div className="testimony-avatar">R</div>
            <div>
              <div className="testimony-name">Rodrigo M.</div>
              <div className="testimony-role">Dueño · Barber Kings, CABA</div>
            </div>
          </div>
        </div>
      </section>

      <section className="final-cta" id="registro">
        <div className="final-cta-bg" />
        <h2 className="reveal">Empezá a cortar<br /><em>sin fricción.</em></h2>
        <p className="reveal">7 días gratis. Después elegís el plan que más te convenga.</p>
        <a href="/registro" className="btn-primary reveal">Registrar mi barbería</a>
      </section>

      <footer>
        <div className="footer-logo">Navaja</div>
        <div className="footer-text">© 2026 Navaja · Hecho en Argentina</div>
      </footer>
    </>
  )
}

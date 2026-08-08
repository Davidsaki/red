# RED — Backlog de Ideas y Pendientes

Archivo de notas vivas. Se actualiza en cada sesión de trabajo.
Última actualización: agosto 2026

---

## MVP Core — Completar antes de agregar AI u otras features

Flujo base que debe funcionar sin fricción antes de cualquier otra cosa:

- [ ] Freelancers pueden ver proyectos y aplicar sin fricción end-to-end
- [ ] Flujo completo: empleador publica → recibe propuestas → acepta una
- [ ] Notificaciones cuando alguien aplica a un proyecto
- [ ] Notificación cuando una propuesta es aceptada/rechazada

---

## Pendiente para activar auth mejorado en producción

> Código ya implementado y listo. Solo faltan estos pasos externos para que funcione en Vercel.

- [ ] **Resend** — ya tienes cuenta. Regenerar API key (la anterior fue compartida en chat).
      Luego verificar dominio `reddecontratistas.com` en resend.com → Domains.
      Requiere agregar registros DNS en el panel de tu registrador (cPanel / GoDaddy / etc).
      Variables a agregar en Vercel: `RESEND_API_KEY` y `EMAIL_FROM=RED <noreply@reddecontratistas.com>`

- [ ] **Cloudflare Turnstile** — crear sitio en dash.cloudflare.com/turnstile con dominio `reddecontratistas.com`.
      Variables a agregar en Vercel: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` y `TURNSTILE_SECRET_KEY`

- [ ] **Inicializar BD** — una vez hecho el deploy con las nuevas variables, correr:
      `curl -H "x-init-secret: TU_INIT_DB_SECRET" https://reddecontratistas.com/api/init-db`
      Esto crea las tablas `email_verification_tokens`, `magic_link_tokens` y la columna `email_verified`.

---

## Historias de Usuario

### Historia: Verificación de email en registro
**Depende de:** Resend (servicio de email, gratis hasta 3.000/mes)
**Prioridad:** Alta — sin esto cualquier bot puede crear cuentas masivamente

- **Qué hace:** Al registrarse con email/contraseña, el usuario recibe un email
  de confirmación. Hasta que no haga clic en el link, la cuenta queda pendiente
  y no puede iniciar sesión.
- **No hace:** No aplica a Google OAuth (Google ya garantiza el email).
- **Cómo verificar:** Registrarse con email → intentar login → bloqueado con
  mensaje "confirma tu email" → clic en link del correo → login exitoso.

### Historia: Cloudflare Turnstile (anti-bots en registro y login)
**Depende de:** nada (cuenta gratuita en Cloudflare)
**Prioridad:** Alta — capa de protección gratuita e invisible para el usuario

- **Qué hace:** Agrega verificación invisible de Cloudflare en los formularios
  de registro y login. Bloquea bots automáticos antes de que lleguen al servidor.
  El usuario no ve nada — si Cloudflare detecta comportamiento sospechoso,
  aparece un simple checkbox.
- **No hace:** No reemplaza la verificación de email ni el rate limiting.
- **Cómo verificar:** Registro normal funciona sin fricción → intentos
  automatizados son bloqueados por Cloudflare.

### Historia: Magic Links (login sin contraseña)
**Depende de:** Resend (mismo servicio que verificación de email)
**Prioridad:** Media — mejora UX especialmente para contratistas poco tech

- **Qué hace:** El usuario escribe su email y recibe un link de un solo uso
  (expira en 15 min). Al hacer clic queda con sesión iniciada sin necesidad
  de contraseña.
- **No hace:** No reemplaza email/contraseña ni Google — es una opción adicional.
  Un mismo email puede usarse con cualquier método.
- **Cómo verificar:** En login, elegir "Entrar con link" → escribir email →
  recibir correo → clic → sesión activa en dashboard.

### Historia: Ciclo de vida del proyecto
**Depende de:** nada
**Prioridad:** Alta — necesaria antes de calificaciones

- **Qué hace:** Cuando el empleador acepta una propuesta, el proyecto cambia a
  `en progreso` y se cierran las postulaciones. El empleador puede luego
  marcarlo como `completado` desde su dashboard.
- **No hace:** No notifica por email (historia separada). No permite reabrir
  el proyecto una vez cerrado en este MVP.
- **Cómo verificar:** Aceptar propuesta → otras aplicaciones quedan bloqueadas
  → botón "marcar como completado" aparece → estado cambia en dashboard.

### Historia: Calificación del contratista
**Depende de:** Ciclo de vida del proyecto
**Prioridad:** Alta — clave para generar confianza en la plataforma

- **Qué hace:** Al completar un proyecto, el empleador califica al contratista
  con estrellas (1-5) y comentario opcional. Las calificaciones se acumulan
  en el perfil del contratista y son visibles para otros empleadores.
- **No hace:** El contratista no califica al empleador en este MVP (v2).
  No hay calificación anónima — siempre está ligada al proyecto.
- **Incentivo:** Para crear un nuevo proyecto, el empleador debe haber
  calificado sus proyectos completados anteriores. Si tiene uno pendiente,
  se le muestra aviso y se redirige a calificar primero.
- **Cómo verificar:** Completar proyecto → aparece formulario de calificación
  → si se omite, al intentar crear proyecto nuevo aparece bloqueo con link
  al pendiente.

---

## Features de AI / Agentic (post-MVP)

Ideas para diferenciar la plataforma. Ordenadas por impacto vs. esfuerzo.

### 1. Asistente de publicación de proyectos
**Impacto:** Alto | **Esfuerzo:** Bajo
El empleador escribe una descripción corta y un agente la expande en un
proyecto bien estructurado: título, descripción clara, skills sugeridos,
presupuesto estimado.
**Por qué:** Los proyectos mal redactados no reciben buenas postulaciones.
**Stack:** Vercel AI SDK + Claude API

### 2. Asistente de propuesta para freelancers
**Impacto:** Medio | **Esfuerzo:** Bajo
Ayuda al freelancer a escribir una propuesta competitiva basada en el
proyecto. Útil para contratistas sin experiencia redactando propuestas formales.
**Stack:** Vercel AI SDK + Claude API

### 3. Smart matching (proyectos ↔ freelancers)
**Impacto:** Alto | **Esfuerzo:** Medio
Sugiere proyectos relevantes a freelancers según su historial y skills.
No requiere modelo pesado — embeddings con pgvector (extensión de Postgres).
**Stack:** pgvector en Vercel Postgres + embeddings de Claude/OpenAI

---

## Pendientes Técnicos

### Actualizaciones de librerías (pospuestas — majors con breaking changes)
- [ ] `lucide-react` 0.555 → 1.x (revisar iconos renombrados antes de actualizar)
- [ ] `typescript` 5.9 → 6.x (breaking changes en module resolution)
- [ ] `eslint` 9 → 10
- [ ] `@vitejs/plugin-react` 5 → 6

### Vulnerabilidades bloqueadas por upstream (moderate, sin fix sin breaking)
- `postcss` — interna de Next.js, esperar que Next.js lo resuelva
- `uuid` — interna de next-auth v4, el fix bajaría a v3 (inaceptable)

### Infraestructura
- [ ] Configurar rama `staging` con dominio `staging.reddecontratistas.com`
- [ ] Base de datos separada para staging vs producción en Vercel
- [ ] Agregar `ADMIN_EMAILS` en Vercel env vars (producción y staging)
- [ ] Agregar `INIT_DB_SECRET` en Vercel y correr `/api/init-db` en staging

---

## Features Futuras (sin prioridad aún)

- [ ] Notificaciones en tiempo real (WebSockets o Server-Sent Events)
- [ ] Magic links — login sin contraseña vía Resend o SendGrid
- [ ] Subida de archivos — avatares de usuario e imágenes de proyectos
- [ ] Búsqueda full-text avanzada (PostgreSQL FTS)
- [ ] Panel de admin completo
- [ ] Rate limiting en API routes
- [ ] Integración de pagos Stripe — suscripción premium
- [ ] Analytics para empleadores (vistas, postulaciones, conversión)

---

## Modelo de Negocio

- **Free:** Límite 3 proyectos publicados, 10 postulaciones
- **Premium (futuro):** 15 proyectos, 100 postulaciones, features de AI,
  analytics, listados destacados
- Meta: MVP gratis → tracción → monetizar con suscripción

---

## Notas de Contexto

- Stack: Next.js 16 + React 19 + Tailwind 4 + Vercel Postgres + NextAuth v4
- Mercado objetivo: contratistas colombianos (COP first, toggle USD)
- Deploy: Vercel en reddecontratistas.com
- Auth: Google OAuth + Email/Password (bcrypt salt=12)

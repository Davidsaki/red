# RED — Backlog de Ideas y Pendientes

Archivo de notas vivas. Se actualiza en cada sesión de trabajo.
Última actualización: noviembre 2026

---

## Camino al lanzamiento del MVP (prioridades acordadas — nov 2026)

### 1. Bloqueantes — antes de abrir a usuarios reales
- [ ] **Bloquear aplicar al proyecto propio** y borrar/excluir las
      autocalificaciones hechas durante las pruebas (ver Historia de selección).
- [ ] **Rotar la credencial de producción filtrada** (`red-db`). No es
      autoservicio: ni Vercel ni la consola de Prisma permiten rotar la
      connection string por defecto. Requiere contactar soporte de
      Prisma/Vercel (o recrear la base, con pérdida de datos).
- [ ] **Robustez del pool de conexiones** (`src/lib/db.ts`): manejador
      `pool.on('error')`, `idleTimeoutMillis` y `keepAlive`. Hoy un corte de
      red deja conexiones muertas y un error en una conexión inactiva puede
      tumbar el servidor.
- [ ] **Términos y política de privacidad** (Ley 1581 de 2012, habeas data):
      páginas legales + checkbox de aceptación en el registro. Revisar el
      texto con alguien que sepa del tema.

### 2. Lo que más falta para que la gente lo use
- [ ] **Contacto por WhatsApp tras seleccionar:** botón que aparece solo
      después de la selección, con el número que cada parte acepte compartir.
      Más barato y más natural en Colombia que un chat propio.
- [ ] **Aviso al empleador cuando alguien aplica** (correo vía Resend).
- [ ] **Perfil del contratista:** foto, habilidades, zona, calificaciones y
      trabajos realizados — sin perfil las estrellas pierden fuerza.
- [ ] **Pasada mobile-first:** revisar todos los flujos en pantalla de celular.

### 3. Negociación de precio
- [ ] **"Precio acordado" al seleccionar:** el empleador lo escribe al
      seleccionar (prellenado con la oferta del contratista) y queda
      registrado en la contratación. La negociación en sí pasa por WhatsApp.
- [ ] (Más adelante, si los usuarios lo piden) contraofertas de ida y vuelta
      dentro de la app.

### 4. Feedback de usuarios
- [ ] **Botón "Danos tu opinión"** siempre visible: guarda el mensaje en la
      base y avisa por correo.
- [ ] **Pregunta tipo NPS** después de calificar: "¿Qué tan probable es que
      recomiendes RED?" (0–10) + comentario opcional.
- [ ] **Analítica de embudo:** dónde abandona la gente (empieza a publicar y
      no termina; ve un proyecto y no aplica). Vercel Analytics como base;
      si se suma una herramienta con grabación de sesiones, declararlo en la
      política de privacidad.
- [ ] **Hablar con los primeros 10–20 usuarios** (p. ej. grupo de WhatsApp) —
      ninguna herramienta reemplaza eso al principio.

---

## MVP Core — Completar antes de agregar AI u otras features

Flujo base que debe funcionar sin fricción antes de cualquier otra cosa:

- [x] Freelancers pueden ver proyectos y aplicar sin fricción end-to-end
- [x] Flujo completo: empleador publica → recibe propuestas → selecciona una (Fase 2, nov 2026)
- [ ] Notificaciones cuando alguien aplica a un proyecto (ver "Camino al lanzamiento" §2)
- [x] Notificación cuando una propuesta es seleccionada (los demás aplicantes
      quedan en espera, no se rechazan — decisión de la Fase 2)

---

## Auth mejorado en producción — completado (sep 2026)

- [x] **Resend** — dominio `reddecontratistas.com` verificado, `RESEND_API_KEY` y `EMAIL_FROM` en Vercel.
- [x] **Cloudflare Turnstile** — activo y obligatorio en registro, login y magic link.
- [x] **Esquema de BD** — ahora se maneja con migraciones (`npm run migrate:prod`), ya no con `/api/init-db`.

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

### Historia: Ubicación y modalidad del proyecto (Fase 1 — oct 2026)
**Depende de:** nada
**Prioridad:** Alta

- **Qué hace:** Cada proyecto tiene modalidad (Remoto / Híbrido / Presencial)
  y ubicación departamento + municipio, elegida de la lista oficial DANE
  (DIVIPOLA) con un buscador que filtra en tiempo real, sin importar tildes.
  Los mismos campos están en los filtros de `/projects`.
- **Reglas:** Híbrido y Presencial exigen municipio. Remoto lo deja opcional.
- **Cómo verificar:** Crear proyecto presencial → escribir "mede" → elegir
  "Medellín, Antioquia" → aparece en el detalle → filtrar por Antioquia en
  `/projects` lo muestra.

### Historia: Selección del contratista y ciclo de vida (Fase 2 — oct 2026)
**Depende de:** Resend (ya activo)
**Prioridad:** Alta — reemplaza la historia anterior "Ciclo de vida del proyecto"

- **Qué hace:** El empleador elige a un aplicante con "Seleccionar" → la
  aplicación queda *Seleccionada*, el proyecto pasa a *En ejecución* y el
  contratista recibe un email. Desde *En ejecución* el empleador puede
  "Marcar como completado" o "Reabrir para buscar otro contratista" (vuelve
  a *Abierto*; la contratación anterior queda como *trabajo finalizado*).
- **Decisiones:** Los demás aplicantes **quedan en espera** (no se rechazan
  ni se notifican), para poder elegir a otro si se reabre. No se aceptan
  aplicaciones nuevas mientras está en ejecución.
- **Cómo verificar:** Seleccionar aplicante → llega email → proyecto en
  ejecución → reabrir → elegir a otro aplicante sin que vuelva a aplicar.
- **Pendiente antes de abrir a usuarios reales:** bloquear aplicar al proyecto
  propio (hoy se permite a propósito para probar con una sola cuenta). Al
  bloquearlo, borrar o excluir del promedio las calificaciones donde el
  empleador se calificó a sí mismo durante las pruebas.

### Historia: Calificación del contratista (Fase 3 — oct 2026)
**Depende de:** Selección del contratista
**Prioridad:** Alta — clave para generar confianza en la plataforma

- **Qué hace:** Al terminar cada contratación (completada o reabierta), el
  empleador califica al contratista con 1-5 estrellas y comentario opcional.
  La calificación va ligada a la contratación, no al proyecto (un proyecto
  reabierto puede tener varios contratistas calificados). El promedio y la
  cantidad de reseñas se muestran junto al nombre del contratista cuando
  aplica a otros proyectos.
- **Decisiones:** Calificar es **opcional** — se muestra un recordatorio de
  "calificación pendiente" en el dashboard, pero nunca bloquea nada. Solo el
  empleador califica al contratista (calificar al empleador queda para v2).
  Una mala calificación no bloquea al contratista, solo baja su promedio.
- **Cómo verificar:** Completar contratación → aparece formulario de estrellas
  → el promedio se ve en la próxima aplicación de ese contratista.
- **Mejora futura:** mostrar junto a cada calificación si la contratación
  terminó con el proyecto *completado* o *reabierto* ("trabajo parcial"),
  para dar contexto a otros empleadores. Hoy no se distingue (ambos casos
  quedan como `finished`); se podría derivar del estado del proyecto al
  finalizar o guardar el motivo en `applications`.

---

## Features de AI / Agentic (post-MVP)

Ideas para diferenciar la plataforma. Ordenadas por impacto vs. esfuerzo.

### 1. Asistente de publicación de proyectos
**Impacto:** Alto | **Esfuerzo:** Bajo
El empleador escribe una descripción corta y un agente la expande en un
proyecto bien estructurado: título, descripción clara, skills sugeridos,
presupuesto estimado.
**Por qué:** Los proyectos mal redactados no reciben buenas postulaciones.
**Forma acordada (nov 2026):** botón "Mejorar redacción" en crear/editar
proyecto que propone una versión corregida y estructurada de la descripción
(y sugiere habilidades). El usuario acepta o descarta; nunca bloquea publicar.
Prioridad: después de la Fase 3 (calificaciones). Mientras tanto, título y
descripción ya tienen el corrector del navegador en español (`lang="es"`).
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
- [x] Magic links — login sin contraseña vía Resend (sep 2026)
- [ ] Subida de archivos — avatares de usuario e imágenes de proyectos
- [ ] Búsqueda full-text avanzada (PostgreSQL FTS)
- [ ] Panel de admin completo
- [x] Rate limiting en API routes (Upstash, sep 2026 — register/login/magic-link)
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

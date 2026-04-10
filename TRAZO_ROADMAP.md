# 🗺️ strok.io — Roadmap completo de producto

> Canvas colaborativo con memoria — El único canvas que documenta el *proceso*, no solo el resultado  
> Stack: **tldraw + Liveblocks + Next.js 14 + Capacitor + Claude API**  
> Modelo de desarrollo: **sprints de fin de semana**

---

## 📋 Vista general del roadmap

```
FDS 1 ████████████ MVP: Canvas + Colaboración + Auth + Mobile
FDS 2 ████████████ Diferenciador 1: Canvas Playback (memoria)
FDS 3 ████████████ Diferenciador 2: Modo Foco (canvas privado)
FDS 4 ████████████ Diferenciador 3: Votación viva en canvas
FDS 5 ████████████ Diferenciador 4: Templates vivos con comportamiento
FDS 6 ████████████ AI: Generar mapas mentales, flujos y dibujos desde texto
FDS 7 ████████████ Freemium: Modelo de negocio + Planes + Pagos
```

---

## 🏁 FDS 1 — MVP Base

> Ver `CANVAS_APP_GUIDE.md` para el detalle completo de este sprint.

**Entregables:**
- Canvas infinito con tldraw (zoom, pen, texto, imágenes, stickers, colores)
- Colaboración en tiempo real con Liveblocks (cursores, sincronización)
- Auth con Clerk
- Deploy en Vercel
- App móvil con Capacitor (iOS + Android)
- PWA

**Checklist:**
- [ ] tldraw funcionando con todas las herramientas
- [ ] Liveblocks sincronizando en < 100ms
- [ ] Clerk auth completo
- [ ] Capacitor build en simulador iOS y Android
- [ ] Deploy en Vercel

---

## 🎬 FDS 2 — Canvas Playback (la memoria del canvas)

### Qué es
Cada sesión de canvas guarda automáticamente su historia. Puedes ver un **playback animado** de cómo evolucionó la pizarra: quién dibujó qué, en qué orden llegaron las ideas, cómo colaboró el equipo. Como un video del pensamiento colectivo.

### Por qué nadie lo tiene bien
tldraw tiene historial de undo/redo pero es debug interno. Miro tiene versiones pero son snapshots estáticos, no un playback fluido con autoría visible. **Nadie documenta el proceso creativo de forma visual.**

### Casos de uso
- Agencias mostrando su proceso creativo al cliente
- Profesores revisando cómo resolvió un problema un alumno
- Equipos haciendo retrospectiva de cómo tomaron una decisión
- Coaches documentando sesiones de workshop

### Arquitectura técnica

```
tldraw Store (operaciones) 
    → cada N segundos → snapshot JSON
    → Liveblocks Storage (array de snapshots con timestamp + userId)
    → Supabase (persistencia long-term, Liveblocks solo persiste 30 días en free)

Playback:
    → cargar array de snapshots
    → usar requestAnimationFrame para interpolar entre snapshots
    → tldraw store.loadSnapshot() en cada frame
    → overlay con nombre/avatar del autor del cambio
```

### Librerías adicionales necesarias

| Necesidad | Librería | Costo |
|---|---|---|
| Persistencia long-term | **Supabase** (PostgreSQL + Storage) | Free tier |
| Animación playback | requestAnimationFrame nativo | Gratis |
| Timeline UI | **@radix-ui/react-slider** | Gratis MIT |

### Prompts para Claude Code — FDS 2

**Prompt FDS2-1: Sistema de snapshots**
```
Implementa un sistema de snapshots para el canvas en Trazo.io:

Contexto: Usamos tldraw v3 + Liveblocks para colaboración en tiempo real.

1. Crea src/lib/snapshot-manager.ts:
   - Función startSnapshotRecording(editor: Editor, roomId: string)
     * Cada 3 segundos, captura editor.store.getSnapshot()
     * Agrega metadata: { timestamp, userId, userName, userColor }
     * Guarda en Liveblocks Storage como array "snapshots"
     * Máximo 500 snapshots por sesión (elimina los más viejos si supera)
   - Función stopSnapshotRecording()
     * Limpia el interval

2. Crea src/lib/supabase.ts:
   - Configura cliente de Supabase con NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
   - Función saveSessionToSupabase(roomId, snapshots, metadata)
     * Guarda en tabla "sessions": { roomId, snapshots (jsonb), createdAt, userId }
   - Función loadSessionFromSupabase(roomId): devuelve el array de snapshots

3. Crea la tabla SQL para Supabase (incluye el SQL listo para ejecutar en el dashboard):
   CREATE TABLE sessions (
     id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
     room_id text NOT NULL,
     user_id text NOT NULL,
     snapshots jsonb NOT NULL,
     created_at timestamptz DEFAULT now()
   );

4. En Canvas.tsx:
   - Llama startSnapshotRecording al montar el componente
   - Llama stopSnapshotRecording al desmontar
   - Cuando el usuario cierra/sale, llama saveSessionToSupabase
```

**Prompt FDS2-2: UI de Playback**
```
Crea el componente src/components/PlaybackPanel.tsx para Trazo.io:

Props:
- roomId: string
- editor: Editor (instancia de tldraw)
- onClose: () => void

Funcionalidad:
1. Al abrir, carga los snapshots desde Supabase con loadSessionFromSupabase(roomId)
2. Muestra un panel lateral derecho (ancho 320px) con:
   - Botón Play/Pause
   - Slider de progreso (usa @radix-ui/react-slider)
   - Velocidad: 1x, 2x, 4x, 8x
   - Timeline con puntos de color por usuario (uno por snapshot)
   - Nombre del usuario activo en ese momento del playback

3. Al hacer Play:
   - Pausa la sincronización de Liveblocks (modo solo lectura temporal)
   - Itera sobre snapshots con setInterval según la velocidad seleccionada
   - Llama editor.store.loadSnapshot(snapshot.store) en cada step
   - Muestra overlay con avatar + nombre del usuario activo en ese momento

4. Al cerrar/pausar: restaura sincronización normal de Liveblocks

5. Estilos: panel glassmorphism (backdrop-blur, bg-white/10), bordes redondeados
   Coloca el botón de acceso al playback en el header de la sala, ícono de "play con reloj"

IMPORTANTE: Durante el playback, deshabilita todos los controles de edición del canvas.
```

---

## 🔒 FDS 3 — Modo Foco (canvas privado dentro del colaborativo)

### Qué es
Un "espacio de borrador" personal dentro de la sesión colaborativa. Solo tú lo ves mientras piensas. Cuando estás listo, haces **"Publicar al canvas"** y tus ideas aparecen en el canvas compartido con una animación. Como pensar en voz alta vs hablar al grupo.

### Por qué es valioso
En sesiones colaborativas el problema más común es: alguien dibuja encima de tu trabajo antes de que termines, o te inhibe el juicio ajeno mientras piensas. El Modo Foco resuelve exactamente eso.

### Arquitectura técnica

```
Dos stores de tldraw en paralelo:
  - store PÚBLICO: sincronizado con Liveblocks (el canvas compartido)
  - store PRIVADO: solo en localStorage/memoria local (tu borrador)

Canvas renderiza uno u otro según el modo activo.
"Publicar": toma los shapes del store privado y los inserta en el store público.
```

### Prompts para Claude Code — FDS 3

**Prompt FDS3-1: Dual store**
```
Implementa el Modo Foco en Trazo.io con dos stores de tldraw:

1. En src/lib/focus-mode.ts:
   - Función createPrivateStore(): crea un TLStore desconectado de Liveblocks
     * Persiste en localStorage con key "trazo-private-[userId]"
     * Carga el store desde localStorage al inicializar
   - Función publishToSharedCanvas(privateStore, publicEditor):
     * Obtiene todos los shapes del privateStore
     * Los inserta en publicEditor con publicEditor.createShapes()
     * Desplaza los shapes al centro del viewport actual
     * Limpia el privateStore después de publicar

2. En src/components/Canvas.tsx:
   - Agrega estado: isFocusMode: boolean
   - Cuando isFocusMode = false: usa el editor conectado a Liveblocks (comportamiento actual)
   - Cuando isFocusMode = true:
     * Renderiza un segundo <Tldraw> absolutamente posicionado encima
     * Este segundo Tldraw usa el privateStore (sin Liveblocks)
     * Fondo con un tinte sutil (rgba(0,0,0,0.3)) para indicar que estás en modo privado
     * Badge "Modo Foco — Solo tú puedes ver esto" en la parte superior

3. En src/components/FocusModeButton.tsx:
   - Botón flotante en la toolbar
   - Estado OFF: ícono de ojo, tooltip "Entrar a Modo Foco"
   - Estado ON: ícono de ojo tachado + badge pulsante en naranja
   - Botón secundario "Publicar al canvas" (solo visible en modo ON)
     * Al click: llama publishToSharedCanvas con animación de "explosión" de los shapes
     * Animación: los shapes aparecen en el canvas público con scale 0→1 + fade in
```

---

## 🗳️ FDS 4 — Votación viva en el canvas

### Qué es
Seleccionas cualquier elemento del canvas (o un área) y lanzas una **votación instantánea**. Todos los participantes votan con un click. Los resultados se **dibujan directamente en el canvas** como objetos permanentes: barras de progreso, contadores, emojis reactivos. La votación se convierte en parte del documento.

### Por qué nadie lo tiene bien
Miro tiene voting pero es una feature separada con UI propia. Los resultados no quedan integrados en el canvas como objetos. En Trazo, los resultados **son** el canvas.

### Tipos de votación
- 👍 / 👎 Aprobación simple
- 1-5 estrellas (priorización)
- Selección múltiple (elegir entre opciones)
- Dot voting (distribuyes N puntos entre opciones)

### Arquitectura técnica

```
Liveblocks Presence: votos en tiempo real (no persisten)
Liveblocks Storage: resultado final de la votación
tldraw: renderiza el resultado como shapes permanentes

Flujo:
1. Usuario A selecciona elementos + activa votación
2. Liveblocks broadcast → todos reciben notificación
3. Panel de votación aparece a todos (componente flotante)
4. Votos se sincronizan via Liveblocks Presence en tiempo real
5. Al cerrar la votación: resultado se convierte en shapes de tldraw
```

### Prompts para Claude Code — FDS 4

**Prompt FDS4-1: Sistema de votación**
```
Implementa el sistema de votación viva en canvas para Trazo.io:

1. Extiende liveblocks.config.ts:
   - Agrega a Storage: { votes: LiveObject<VotingSession | null> }
   - Tipo VotingSession: {
       id: string,
       type: 'approval' | 'stars' | 'dot',
       question: string,
       options: string[],
       votes: Record<userId, voteValue>,
       createdBy: string,
       createdAt: number,
       closedAt: number | null,
       linkedShapeIds: string[]  // shapes del canvas relacionados
     }
   - Agrega a Presence: { currentVote: string | null }

2. Crea src/components/VotingPanel.tsx:
   - Se muestra a TODOS los usuarios cuando hay una VotingSession activa
   - Posición: centro del viewport, modal flotante no bloqueante
   - Muestra la pregunta + tipo de votación
   - Muestra en tiempo real los avatares de quién ya votó
   - El creador puede ver los votos en tiempo real y tiene botón "Cerrar votación"
   - Animación de resultados al cerrar: barras animadas con porcentajes

3. Crea src/components/VotingButton.tsx:
   - Botón en la toolbar, ícono de gráfico de barras
   - Al hacer click: modal para configurar la votación
     * Campo de pregunta
     * Tipo de votación
     * Los shapes seleccionados actualmente se linkean automáticamente

4. Crea src/lib/voting-to-canvas.ts:
   - Función resultsToShapes(session: VotingSession, editor: Editor):
     * Crea shapes de tldraw que representan los resultados visualmente
     * Para approval: crea un grupo con barras proporcionales usando geo shapes
     * Cada barra tiene el color del voto y el porcentaje
     * El grupo aparece cerca de los shapes vinculados
     * Los shapes tienen una etiqueta "📊 Resultado votación — [fecha]"
```

---

## 🧩 FDS 5 — Templates vivos con comportamiento

### Qué es
Templates que **reaccionan** al contenido que pones en ellos. Un mapa mental que se autoorganiza cuando agregas nodos. Una retrospectiva que agrupa stickers por zona cuando los sueltas. Un brainstorm que conecta ideas con líneas automáticamente cuando las acercas. Los templates son **inteligentes**, no decoraciones estáticas.

### Templates incluidos (v1)
1. **Retrospectiva inteligente** — 4 zonas (Bien / Mejorar / Hacer / Dejar). Los stickers se agrupan automáticamente al soltarlos en cada zona.
2. **Brainstorm conectado** — Cuando acercas dos ideas a menos de 100px, se conectan con una línea automáticamente.
3. **Voting board** — Grilla de ideas donde puedes hacer dot voting directamente.
4. **Kanban visual** — Columnas que reordenan las tarjetas por drag dentro de cada columna.
5. **Mapa de empatía** — Template de UX con zonas para Piensa/Siente/Ve/Escucha.

### Arquitectura técnica

```
tldraw tiene un sistema de eventos en el store:
  editor.store.listen(({ changes }) => { ... })

Los templates son "zonas inteligentes" definidas como shapes especiales.
Al detectar que un shape entra en una zona, se ejecuta la lógica del template.

Librerías:
  - Sin librerías extra (todo es lógica sobre tldraw)
  - Los templates se guardan como JSON de shapes en Supabase
```

### Prompts para Claude Code — FDS 5

**Prompt FDS5-1: Motor de templates**
```
Implementa el motor de templates vivos en Trazo.io:

1. Crea src/lib/template-engine.ts:
   - Tipo TemplateZone: {
       shapeId: string,       // el shape que define la zona
       zoneType: 'group-on-drop' | 'auto-connect' | 'sort-order',
       config: Record<string, any>
     }
   - Función registerTemplateZones(editor: Editor, zones: TemplateZone[])
     * Escucha editor.store.listen para cambios de posición de shapes
     * Para cada shape movido, verifica si entró en alguna zona registrada
     * Ejecuta la acción correspondiente según zoneType:
       - group-on-drop: mueve el shape al grupo y actualiza su color según la zona
       - auto-connect: si dos shapes están a < 120px, crea un arrow shape entre ellos
       - sort-order: reordena shapes dentro de la zona por posición Y

2. Crea src/lib/templates/retro.ts:
   - Función createRetroTemplate(editor: Editor):
     * Crea 4 zonas rectangulares grandes con colores: verde, naranja, rojo, azul
     * Títulos: "✅ Qué salió bien", "🔧 Qué mejorar", "🚀 Qué hacer", "🛑 Qué dejar"
     * Registra cada zona como 'group-on-drop'
     * Los stickers soltados en cada zona toman el color de esa zona

3. Crea src/lib/templates/brainstorm.ts:
   - Función createBrainstormTemplate(editor: Editor):
     * Crea un nodo central con "Idea principal" editable
     * Registra zona global como 'auto-connect'
     * Cuando un shape se crea a < 300px del centro, se conecta automáticamente

4. Crea src/components/TemplateGallery.tsx:
   - Modal con grid de templates disponibles (miniaturas preview como SVG)
   - Al seleccionar un template, lo instancia en el canvas en el centro del viewport
   - Cada template tiene: nombre, descripción corta, ícono, etiqueta de caso de uso
   - Sección "Mis templates" (vacía en v1, para FDS futuro)

5. Agrega botón de Templates en la toolbar principal
```

---

## 🤖 FDS 6 — Crear con AI desde texto

### Qué es
Escribes en lenguaje natural lo que necesitas y la AI lo **dibuja en el canvas**: mapas mentales, flowcharts, diagramas de arquitectura, wireframes básicos, tablas, timelines, brainstorms estructurados. Los resultados son **shapes editables de tldraw**, no imágenes estáticas.

### Capacidades v1
- **Mapa mental** → "Crea un mapa mental sobre estrategias de marketing digital"
- **Flowchart** → "Flujo de onboarding para una app de fitness"
- **Arquitectura** → "Diagrama de arquitectura de una app con Next.js, Supabase y Vercel"
- **Timeline** → "Timeline del proyecto para lanzar un SaaS en 3 meses"
- **Tabla comparativa** → "Compara React vs Vue vs Svelte en una tabla"
- **Wireframe básico** → "Wireframe de pantalla de login mobile"

### Por qué Claude API y no OpenAI
- Ya está disponible en tu stack (Anthropic API)
- Claude es superior en generar JSON estructurado consistente
- Modelo: `claude-sonnet-4-20250514` — calidad/costo óptimo

### Arquitectura técnica

```
Usuario escribe prompt
    → Claude API (con system prompt específico)
    → JSON estructurado de shapes (posiciones, textos, conexiones)
    → Función de transformación JSON → tldraw shapes
    → editor.createShapes() en el canvas

Para flowcharts/diagramas:
    → Claude genera Mermaid syntax
    → mermaid.js renderiza como SVG
    → SVG se inserta como image shape en tldraw (editable como grupo)

Para mapas mentales:
    → Claude genera JSON de árbol de nodos
    → Algoritmo de layout automático (radial para mapa mental, top-down para flowchart)
    → Convertir a tldraw geo + arrow shapes
```

### Librerías adicionales

| Necesidad | Librería | Costo |
|---|---|---|
| Diagramas Mermaid | **mermaid** (npm) | MIT gratis |
| Layout automático nodos | **dagre** (npm) | MIT gratis |
| AI API | **Anthropic SDK** (@anthropic-ai/sdk) | Pay-per-use ~$0.003/llamada |

### Prompts para Claude Code — FDS 6

**Prompt FDS6-1: API Route de generación AI**
```
Crea el endpoint de generación AI para Trazo.io en src/app/api/ai-generate/route.ts:

Usa el SDK oficial de Anthropic: @anthropic-ai/sdk
Modelo: claude-sonnet-4-20250514

El endpoint recibe POST con body:
{
  type: 'mindmap' | 'flowchart' | 'architecture' | 'timeline' | 'table' | 'wireframe',
  prompt: string,
  language: 'es' | 'en'
}

Para cada tipo, llama a Claude con un system prompt específico que SIEMPRE retorna JSON puro (sin markdown):

SYSTEM PROMPT para mindmap:
"Eres un generador de mapas mentales. Responde SOLO con JSON válido, sin texto adicional.
Formato requerido:
{
  type: 'mindmap',
  central: { text: string, color: string },
  branches: [
    {
      text: string,
      color: string,
      children: [{ text: string }]
    }
  ]
}"

SYSTEM PROMPT para flowchart:
"Eres un generador de diagramas de flujo. Responde SOLO con Mermaid flowchart syntax.
Usa solo: flowchart TD, -->, nodes con [], <>, {}.
Máximo 15 nodos. Sin comentarios. Solo el código Mermaid."

SYSTEM PROMPT para timeline:
"Eres un generador de timelines. Responde SOLO con JSON:
{
  type: 'timeline',
  title: string,
  items: [{ date: string, title: string, description: string, color: string }]
}"

SYSTEM PROMPT para table:
"Eres un generador de tablas comparativas. Responde SOLO con JSON:
{
  type: 'table',
  headers: string[],
  rows: string[][]
}"

El endpoint:
1. Valida que el usuario esté autenticado con Clerk
2. Llama a Claude según el tipo
3. Parsea la respuesta y la retorna como JSON
4. En caso de error de parseo, reintenta una vez con instrucción más estricta
5. Rate limit: máximo 10 llamadas por usuario por hora (usa un Map en memoria para el rate limit, suficiente para MVP)
```

**Prompt FDS6-2: Transformadores JSON → tldraw shapes**
```
Crea src/lib/ai-to-shapes.ts con funciones que transforman JSON de AI en shapes de tldraw:

Importa los tipos de tldraw: TLShapeId, createShapeId, Editor

1. Función mindmapToShapes(data: MindmapJSON, editor: Editor):
   Layout radial automático:
   - Nodo central en el viewport center
   - Branches distribuidas en círculo a 280px del centro (ángulos equidistantes)
   - Children de cada branch en línea recta a 180px de su parent
   
   Shapes a crear:
   - Cada nodo: geo shape tipo "ellipse" (central) o "rectangle" (branches/children)
   - Texto del nodo: label del geo shape
   - Conexiones: arrow shapes de parent a child (tipo "straight", sin cabeza en el origen)
   - Colores: usa el color del JSON para fill del shape
   
   Al final: editor.createShapes([...todos los shapes]) en una sola llamada

2. Función flowchartToShapes(mermaidCode: string, editor: Editor):
   - Instancia mermaid con mermaid.initialize({ startOnLoad: false })
   - Usa mermaid.render() para generar el SVG
   - Inserta el SVG como un image shape en el canvas
   - Posiciona en el centro del viewport actual
   - NOTA: el SVG de mermaid es editable por el usuario como imagen

3. Función timelineToShapes(data: TimelineJSON, editor: Editor):
   - Línea horizontal: un geo shape largo de tipo "rectangle" como línea base
   - Por cada item: un geo shape circular arriba de la línea + texto debajo
   - Distribuir horizontalmente con 200px entre items
   - Título del timeline como text shape encima

4. Función tableToShapes(data: TableJSON, editor: Editor):
   - Headers: geo shapes rectangulares con fondo oscuro + texto blanco
   - Filas: geo shapes alternando fondo gris claro / blanco
   - Ancho de columna uniforme: 180px, altura de fila: 50px
   - Agrupa todos los shapes con editor.groupShapes()

5. Función insertAIResult(type, data, editor):
   - Switch según type que llama a la función correcta
   - Antes de insertar: editor.setCurrentPageState para centrar el viewport en los nuevos shapes
```

**Prompt FDS6-3: UI del generador AI**
```
Crea src/components/AIGeneratorPanel.tsx para Trazo.io:

Panel lateral izquierdo que se desliza (ancho 360px, height 100vh):

1. Header con: ícono ✨, título "Crear con AI", botón X para cerrar

2. Selector de tipo (grid 2x3 con iconos):
   🧠 Mapa mental    📊 Flowchart
   🏗️ Arquitectura   📅 Timeline  
   📋 Tabla          🖥️ Wireframe

3. Textarea para el prompt (placeholder según el tipo seleccionado):
   - mindmap: "Ej: Estrategias para lanzar un producto SaaS"
   - flowchart: "Ej: Proceso de compra en un e-commerce"
   - etc.

4. Botón "Generar en canvas" con:
   - Estado loading: spinner + "Generando..."
   - Estado error: mensaje en rojo + botón reintentar
   - Estado éxito: check verde + "¡Listo! Puedes editar en el canvas"

5. Sección "Últimas generaciones" (últimas 5, guardadas en localStorage):
   - Cada una muestra: tipo (ícono) + primeras palabras del prompt + fecha
   - Click para reinsertar el resultado en el canvas

6. Footer con: "Powered by Claude • ~0.003 USD por generación"

Estados del componente:
- selectedType: string
- prompt: string  
- isLoading: boolean
- error: string | null
- lastResults: Array<{type, prompt, result, createdAt}>

Al recibir el resultado de la API: llama insertAIResult(type, result, editor)

Agrega el botón de acceso al panel en la toolbar: ícono de varita mágica ✨
```

---

## 💰 FDS 7 — Modelo Freemium y Planes

### Que es
Un modelo de negocio que permite a cualquier persona crear su primera pizarra **sin registrarse**, invitar hasta 2 colaboradores por link, y escalar a planes de pago cuando necesite mas. Los usuarios invitados a pizarras ajenas **nunca necesitan pagar** — solo el creador/owner de la pizarra asume el costo.

### Reglas del modelo

| Concepto | Gratis (sin login) | Gratis (con Google) | Pro | Team |
|---|---|---|---|---|
| Pizarras propias | 1 | 1 | Ilimitadas | Ilimitadas |
| Invitados por pizarra | 2 | 2 | 10 | 50 |
| Pizarras como invitado | Ilimitadas | Ilimitadas | Ilimitadas | Ilimitadas |
| Playback | Ultimos 30 min | Ultimos 30 min | Completo | Completo |
| AI (generacion) | 3/dia | 5/dia | 50/dia | 200/dia |
| Templates | Basicos (3) | Basicos (3) | Todos | Todos + custom |
| Precio | $0 | $0 | $9/mes | $29/mes |

### Flujo del usuario

```
1. Usuario abre la app por primera vez
   → Se genera un deviceId (localStorage/Capacitor)
   → Puede crear 1 pizarra sin registrarse
   → Puede invitar hasta 2 personas por link

2. Usuario intenta crear segunda pizarra
   → Modal: "Inicia sesion para crear mas pizarras"
   → Login con Google (Clerk)
   → Pantalla de seleccion de plan
   → Puede seguir gratis (1 pizarra) o upgrade

3. Usuario invitado recibe un link
   → Abre el link → entra directo a la pizarra
   → No necesita cuenta ni pago
   → Se le asigna un deviceId como guest
   → Puede participar en todas las features de la pizarra

4. Usuario con plan Pro/Team
   → Crea pizarras ilimitadas
   → Invita mas colaboradores
   → Accede a todas las features
```

### Arquitectura tecnica

```
Identificacion de usuarios:
  - Sin login: deviceId (crypto.randomUUID guardado en localStorage)
  - Con login: Clerk userId + Google OAuth
  - Liveblocks recibe el deviceId o userId segun el caso

Tabla Supabase "users":
  id uuid PRIMARY KEY
  clerk_id text UNIQUE          -- null si es guest
  device_id text UNIQUE         -- siempre presente
  email text                    -- null si es guest
  plan text DEFAULT 'free'      -- 'free' | 'pro' | 'team'
  stripe_customer_id text       -- null si es free
  boards_created int DEFAULT 0  -- contador de pizarras propias
  created_at timestamptz DEFAULT now()

Tabla Supabase "board_members":
  board_id text NOT NULL        -- room_id de Liveblocks
  user_device_id text NOT NULL  -- deviceId del miembro
  role text DEFAULT 'viewer'    -- 'owner' | 'editor' | 'viewer'
  invited_at timestamptz DEFAULT now()
  PRIMARY KEY (board_id, user_device_id)

Limites (enforcement):
  - API middleware verifica plan del owner antes de permitir acciones
  - Al crear pizarra: check boards_created vs limite del plan
  - Al invitar: check miembros actuales vs limite del plan
  - AI: rate limit por userId/deviceId segun plan
  - Playback: limitar duracion de snapshots segun plan
```

### Integracion con Stripe

```
Stripe Checkout:
  - Al elegir plan → redirect a Stripe Checkout
  - Success URL: /api/stripe/success?session_id={CHECKOUT_SESSION_ID}
  - Cancel URL: / (vuelve a la app)

Stripe Webhook:
  - checkout.session.completed → actualiza plan en Supabase
  - customer.subscription.updated → actualiza plan
  - customer.subscription.deleted → downgrade a free

Precio:
  - Pro: $9/mes (price_id en Stripe)
  - Team: $29/mes (price_id en Stripe)
```

### Librerias adicionales

| Necesidad | Libreria | Costo |
|---|---|---|
| Pagos | **stripe** + **@stripe/stripe-js** | 2.9% + 30c por transaccion |
| Webhook verification | **stripe** (mismo SDK) | Incluido |

### Prompts para Claude Code — FDS 7

**Prompt FDS7-1: Sistema de identidad guest + auth**
```
Implementa el sistema de identidad dual para Strok.io:

1. Crea src/lib/device-id.ts:
   - Funcion getOrCreateDeviceId(): string
     * Busca en localStorage key "strok-device-id"
     * Si no existe, genera uno con crypto.getRandomValues (compatible con WebView)
     * Lo guarda en localStorage y lo retorna
   - Funcion getDeviceId(): string | null
     * Retorna el deviceId actual o null

2. Modifica src/components/AuthProvider.tsx:
   - En modo guest (sin Clerk), inicializa el deviceId
   - Provee un contexto con { deviceId, isAuthenticated, user, plan }
   - Exporta hook useIdentity() que retorna ese contexto

3. Modifica src/app/api/liveblocks-auth/route.ts:
   - Si hay Clerk session: usa userId de Clerk
   - Si no hay session: usa deviceId del header X-Device-Id
   - Nombre: Clerk user name o "Invitado"

4. Crea src/lib/plan-limits.ts:
   - Constantes: PLAN_LIMITS = { free: { boards: 1, guests: 2, ai: 5 }, pro: {...}, team: {...} }
   - Funcion checkBoardLimit(userId): { allowed: boolean, reason?: string }
   - Funcion checkInviteLimit(boardId): { allowed: boolean, reason?: string }
```

**Prompt FDS7-2: Paywall y seleccion de plan**
```
Implementa la pantalla de planes y el paywall:

1. Crea src/app/pricing/page.tsx:
   - Pagina con 3 columnas: Gratis / Pro ($9) / Team ($29)
   - Cada plan muestra sus limites en una lista
   - Boton "Comenzar gratis" / "Upgrade" / "Contactar"
   - Al hacer click en Pro/Team: redirect a Stripe Checkout

2. Crea src/components/UpgradeModal.tsx:
   - Modal que aparece cuando el usuario alcanza un limite
   - Props: { reason: 'board_limit' | 'invite_limit' | 'ai_limit' }
   - Muestra mensaje personalizado segun el motivo
   - Boton "Ver planes" → navega a /pricing
   - Si el usuario no esta logueado, primero muestra login con Google

3. Modifica src/app/page.tsx (home):
   - Al hacer click en "Nueva pizarra":
     * Si es guest y boards_created >= 1: muestra UpgradeModal
     * Si esta logueado y boards_created >= limite del plan: muestra UpgradeModal
     * Si no: crea la pizarra normal

4. Crea src/app/api/stripe/checkout/route.ts:
   - Recibe { plan: 'pro' | 'team' }
   - Crea Stripe Checkout Session con el price_id correspondiente
   - Retorna la URL de checkout

5. Crea src/app/api/stripe/webhook/route.ts:
   - Verifica firma del webhook con Stripe
   - En checkout.session.completed: actualiza plan en Supabase
   - En customer.subscription.deleted: downgrade a free
```

---

## 🏗️ Arquitectura de archivos completa (post FDS 7)

```
src/
├── app/
│   ├── api/
│   │   ├── liveblocks-auth/route.ts
│   │   ├── ai-generate/route.ts          ← FDS 6
│   │   ├── stripe/
│   │   │   ├── checkout/route.ts         ← FDS 7
│   │   │   └── webhook/route.ts          ← FDS 7
│   │   └── save-snapshots/route.ts
│   ├── room/[roomId]/page.tsx
│   ├── sign-in / sign-up
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── Canvas.tsx
│   ├── CollaborativeCursors.tsx
│   ├── PresenceAvatars.tsx
│   ├── RoomProvider.tsx
│   ├── Toast.tsx
│   ├── Toolbar.tsx
│   ├── PlaybackPanel.tsx                 ← FDS 2
│   ├── FocusModeButton.tsx               ← FDS 3
│   ├── VotingPanel.tsx                   ← FDS 4
│   ├── VotingButton.tsx                  ← FDS 4
│   ├── TemplateGallery.tsx               ← FDS 5
│   ├── AIGeneratorPanel.tsx              ← FDS 6
│   └── UpgradeModal.tsx                  ← FDS 7
├── lib/
│   ├── liveblocks.config.ts
│   ├── supabase.ts                       ← FDS 2
│   ├── api-config.ts
│   ├── utils.ts
│   ├── snapshot-manager.ts               ← FDS 2
│   ├── focus-mode.ts                     ← FDS 3
│   ├── voting-to-canvas.ts               ← FDS 4
│   ├── template-engine.ts                ← FDS 5
│   ├── templates/
│   │   ├── retro.ts                      ← FDS 5
│   │   └── brainstorm.ts                 ← FDS 5
│   ├── ai-to-shapes.ts                   ← FDS 6
│   ├── device-id.ts                      ← FDS 7
│   └── plan-limits.ts                    ← FDS 7
└── middleware.ts
```

---

## 🔑 Variables de entorno (acumuladas)

```env
# FDS 1 — Base
LIVEBLOCKS_SECRET_KEY=sk_dev_
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=pk_dev_
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_
CLERK_SECRET_KEY=sk_test_
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
NEXT_PUBLIC_API_URL=http://localhost:3000

# FDS 2 — Playback
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# FDS 6 — AI
ANTHROPIC_API_KEY=sk-ant-...

# FDS 7 — Pagos
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_TEAM=price_...
```

---

## 💰 Costos de infraestructura estimados (tier gratuito)

| Servicio | Free tier | Límite antes de pagar |
|---|---|---|
| Liveblocks | 50 MAU, 5GB | 50 usuarios activos/mes |
| Clerk | 10,000 MAU | 10k usuarios |
| Supabase | 500MB DB, 1GB storage | ~1M snapshots |
| Vercel | 100GB bandwidth | Suficiente para MVP |
| Claude API | Pay-per-use | ~$0.003 por generación AI |
| Cloudflare (.io) | N/A | ~$35/año el dominio |
| Stripe | 2.9% + $0.30 por txn | Solo cobra cuando cobras |

**Costo total hasta primeros 50 usuarios activos: ~$35/año (solo el dominio)**
**Revenue potencial con 50 usuarios Pro: ~$450/mes - comisiones Stripe**

---

## 📦 Dependencias adicionales por FDS

```bash
# FDS 2 — Playback
npm install @supabase/supabase-js @radix-ui/react-slider

# FDS 3 — Modo Foco
# Sin dependencias nuevas

# FDS 4 — Votación
# Sin dependencias nuevas

# FDS 5 — Templates
# Sin dependencias nuevas

# FDS 6 — AI
npm install @anthropic-ai/sdk mermaid dagre @types/dagre

# FDS 7 — Freemium
npm install stripe @stripe/stripe-js
```

---

## 🎯 Visión del producto (elevator pitch)

> **Trazo.io** es el canvas colaborativo para equipos creativos que documentan su proceso, no solo su resultado. Mientras tus ideas toman forma, Trazo guarda la historia: quién propuso qué, cómo evolucionó el pensamiento del equipo, cada decisión con su contexto. Y cuando necesitas estructura, la AI convierte cualquier idea en texto a un mapa mental, flujo o diagrama editable en segundos — directo en tu canvas.

---

## 🗓️ Checklist por FDS

### FDS 1 — MVP
- [ ] Canvas + herramientas tldraw
- [ ] Colaboración Liveblocks
- [ ] Auth Clerk
- [ ] Mobile Capacitor
- [ ] Deploy Vercel

### FDS 2 — Playback
- [ ] Snapshots guardándose cada 3s en Liveblocks
- [ ] Persistencia en Supabase al salir
- [ ] PlaybackPanel con slider y controles
- [ ] Overlay de autoría durante playback

### FDS 3 — Modo Foco
- [ ] Dual store funcionando (público/privado)
- [ ] Canvas privado visible solo para el usuario
- [ ] Animación de "Publicar al canvas"
- [ ] Persistencia del borrador privado en localStorage

### FDS 4 — Votación
- [ ] Votación sincronizada en tiempo real via Liveblocks
- [ ] Panel visible para todos los participantes
- [ ] Resultados convertidos a shapes permanentes en el canvas

### FDS 5 — Templates
- [ ] Motor de zonas inteligentes funcionando
- [ ] Template Retrospectiva con auto-agrupación
- [ ] Template Brainstorm con auto-conexión
- [ ] Galería de templates con previews

### FDS 6 — AI
- [ ] API Route con Claude generando JSON consistente
- [ ] Mapa mental → shapes radiales en el canvas
- [ ] Flowchart → SVG de Mermaid insertado
- [ ] Timeline → shapes horizontales
- [ ] Tabla → grid de geo shapes agrupados
- [ ] Panel de AI con historial de generaciones

### FDS 7 — Freemium
- [ ] Primera pizarra gratis sin login (guest mode con device ID)
- [ ] Invitacion por link de hasta 2 usuarios por pizarra gratuita
- [ ] Limite de 1 pizarra para usuarios no autenticados
- [ ] Login con Google (Clerk) al intentar crear segunda pizarra
- [ ] Pantalla de seleccion de plan post-login
- [ ] Integracion con Stripe para pagos
- [ ] Usuarios invitados acceden sin suscripcion (el owner paga)
- [ ] Middleware de limites por plan en API routes

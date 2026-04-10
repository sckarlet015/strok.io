# 🎨 Collaborative Infinite Canvas App — Guía completa para Claude Code + Cursor

> Stack: **tldraw + Liveblocks + Next.js 14 + Capacitor**  
> Meta: App funcional en un fin de semana  
> Plataformas: Web, iOS, Android

---

## 📋 Índice

1. [Prerequisitos](#prerequisitos)
2. [Fase 1 — Setup del proyecto](#fase-1--setup-del-proyecto)
3. [Fase 2 — Canvas con tldraw](#fase-2--canvas-con-tldraw)
4. [Fase 3 — Colaboración en tiempo real con Liveblocks](#fase-3--colaboración-en-tiempo-real-con-liveblocks)
5. [Fase 4 — Auth con Clerk](#fase-4--auth-con-clerk)
6. [Fase 5 — Capacitor para iOS y Android](#fase-5--capacitor-para-ios-y-android)
7. [Fase 6 — Funcionalidades extra](#fase-6--funcionalidades-extra)
8. [Fase 7 — Deploy](#fase-7--deploy)
9. [Arquitectura de archivos](#arquitectura-de-archivos)
10. [Variables de entorno](#variables-de-entorno)
11. [Prompts para Claude Code](#prompts-para-claude-code)
12. [Troubleshooting común](#troubleshooting-común)

---

## Prerequisitos

Antes de abrir Cursor, asegúrate de tener:

```bash
node --version   # v18 o superior
npm --version    # v9 o superior
git --version

# Cuentas gratuitas necesarias:
# - liveblocks.io (plan free, sin tarjeta)
# - clerk.com (plan free)
# - vercel.com (deploy gratuito)
# - Para iOS: Mac con Xcode 15+
# - Para Android: Android Studio
```

---

## Fase 1 — Setup del proyecto

### Prompt 1 para Claude Code

```
Crea un proyecto Next.js 14 con App Router llamado "strok-io" con las siguientes características:
- TypeScript estricto
- Tailwind CSS
- Instala estas dependencias: tldraw, @liveblocks/client, @liveblocks/react, @liveblocks/node, @clerk/nextjs
- Configura el tsconfig.json para que sea compatible con tldraw
- Crea la estructura de carpetas según este árbol:

src/
  app/
    api/
      liveblocks-auth/
        route.ts
    room/
      [roomId]/
        page.tsx
    page.tsx
    layout.tsx
  components/
    Canvas.tsx
    Toolbar.tsx
    RoomProvider.tsx
  lib/
    liveblocks.config.ts
    utils.ts

Deja todos los archivos con estructura básica exportando el componente o función correctamente.
```

---

### Comandos manuales después del Prompt 1

```bash
cd strok-io
npm install
npm run dev
# Verificar que corre en http://localhost:3000
```

---

## Fase 2 — Canvas con tldraw

### Prompt 2 para Claude Code

```
En el archivo src/components/Canvas.tsx implementa un canvas completo usando tldraw con:

1. El componente Tldraw de la librería "tldraw" ocupando 100% del viewport (width: 100vw, height: 100vh)
2. Prop "roomId" de tipo string
3. Configuración de componentes personalizados para ocultar el botón de menú superior izquierdo
4. Exporta el componente como default

El componente debe verse así funcionalmente:
- Canvas infinito con zoom infinito
- Herramientas: select, draw (pen), text, shapes, image, eraser
- Sin el header de marca de tldraw (usa prop hideUi={false} y components personalizados)

En src/app/room/[roomId]/page.tsx:
- Importa el Canvas dinámicamente con next/dynamic y ssr: false (tldraw no funciona en SSR)
- Pasa el roomId desde params
- Agrega un loading skeleton mientras carga

En src/app/page.tsx:
- Crea una landing page simple con un botón "Nueva pizarra" que genere un roomId con crypto.randomUUID() y redirija a /room/[roomId]
- También muestra un input para "Unirse a pizarra existente" con un roomId
- Diseño minimalista con Tailwind, fondo oscuro (#1a1a2e), texto blanco
```

---

### Verificación Fase 2

```bash
npm run dev
# Ir a http://localhost:3000
# Click en "Nueva pizarra"
# Debe cargar el canvas de tldraw con todas las herramientas
# Probar: dibujar, escribir texto, hacer zoom con scroll
```

---

## Fase 3 — Colaboración en tiempo real con Liveblocks

### Setup en liveblocks.io

1. Crear cuenta en https://liveblocks.io
2. Crear nuevo proyecto → copiar **Secret Key** y **Public Key**
3. Agregar al `.env.local`:

```env
LIVEBLOCKS_SECRET_KEY=sk_dev_xxxxxx
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=pk_dev_xxxxxx
```

### Prompt 3 para Claude Code

```
Integra Liveblocks con tldraw para colaboración en tiempo real:

1. En src/lib/liveblocks.config.ts:
   - Configura el cliente de Liveblocks usando createClient con authEndpoint: "/api/liveblocks-auth"
   - Define los tipos de Presence: { cursor: { x: number, y: number } | null, name: string, color: string }
   - Define Storage como: { document: LiveObject<{ snapshot: any }> }
   - Exporta los hooks tipados: useMyPresence, useOthers, useStorage, useMutation

2. En src/app/api/liveblocks-auth/route.ts:
   - Crea un POST handler
   - Usa Liveblocks de "@liveblocks/node"
   - Por ahora genera un userId aleatorio con crypto.randomUUID() y un nombre aleatorio de una lista de 10 colores ("Azul", "Rojo", etc.)
   - Autoriza la sala con liveblocks.identifyUser()
   - Retorna la respuesta de Liveblocks

3. En src/components/Canvas.tsx actualiza el componente para:
   - Importar useSyncDemo de "tldraw" NO, en su lugar usa useStorage y useMutation de liveblocks.config.ts
   - Usa el store de tldraw con useSync de "@tldraw/sync" o la integración manual:
     * Crea un store con createTLStore()
     * Usa useEffect para suscribir los cambios del store a Liveblocks Storage
     * Usa useEffect para suscribir los cambios de Liveblocks al store local
   - Muestra los cursores de otros usuarios sobre el canvas como divs absolutos posicionados

4. En src/components/RoomProvider.tsx:
   - Envuelve children con RoomProvider de @liveblocks/react
   - Recibe roomId como prop
   - initialPresence: { cursor: null, name: nombre aleatorio, color: color aleatorio }

5. Actualiza src/app/room/[roomId]/page.tsx para envolver Canvas con RoomProvider

IMPORTANTE: tldraw v3 tiene integración nativa con Liveblocks. Usa este patrón exacto de su documentación oficial:
- import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/with-selector'
- El store de tldraw se puede serializar con store.getSnapshot() y restaurar con store.loadSnapshot()
```

---

### Prompt 4 para Claude Code (cursores colaborativos)

```
Crea el componente src/components/CollaborativeCursors.tsx:

- Usa el hook useOthers de liveblocks.config.ts
- Por cada "other" con cursor no nulo, renderiza un div posicionado absolutamente
- El div tiene: un SVG de cursor (triángulo apuntando arriba), y el nombre del usuario debajo
- El color del cursor viene de other.presence.color
- Usa pointer-events: none para que no bloquee interacción
- Posición: fixed, con left y top del cursor en porcentaje del viewport
- Agrega transición suave: transition: all 0.1s linear

Luego en Canvas.tsx:
- Importa CollaborativeCursors y ponlo sobre el canvas de tldraw
- Escucha el evento pointermove del document y actualiza updateMyPresence({ cursor: { x: e.clientX, y: e.clientY } })
- Al salir del documento (pointerleave) setea updateMyPresence({ cursor: null })
```

---

### Verificación Fase 3

```bash
# Abrir dos ventanas del browser en la misma URL room/[mismo-roomId]
# Deben verse los cursores del otro usuario
# Dibujar en una ventana → debe aparecer en la otra en < 100ms
```

---

## Fase 4 — Auth con Clerk

### Setup en clerk.com

1. Crear cuenta en https://clerk.com
2. Crear nueva aplicación
3. Habilitar: Email, Google OAuth
4. Copiar keys al `.env.local`:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

### Prompt 5 para Claude Code

```
Integra Clerk para autenticación:

1. En src/app/layout.tsx:
   - Envuelve todo con ClerkProvider de @clerk/nextjs
   - Importa los estilos globales

2. Crea src/middleware.ts:
   - Usa authMiddleware de @clerk/nextjs
   - Rutas públicas: ["/", "/sign-in", "/sign-up", "/api/liveblocks-auth"]
   - Rutas protegidas: ["/room/:roomId*"]

3. Crea src/app/sign-in/[[...sign-in]]/page.tsx y sign-up:
   - Usa los componentes <SignIn /> y <SignUp /> de Clerk centrados en pantalla
   - Fondo oscuro consistente con el resto de la app

4. Actualiza src/app/api/liveblocks-auth/route.ts:
   - Importa auth de @clerk/nextjs/server
   - Usa el userId y sessionClaims reales del usuario autenticado
   - Si no hay usuario autenticado, retorna 401
   - El nombre del usuario viene de sessionClaims?.name o sessionClaims?.email

5. Actualiza src/app/page.tsx:
   - Agrega un UserButton de Clerk en la esquina superior derecha
   - Si el usuario no está autenticado, muestra botón Sign In

6. En src/app/room/[roomId]/page.tsx:
   - Importa currentUser de @clerk/nextjs/server
   - Si no hay usuario, redirect("/sign-in")
```

---

## Fase 5 — Capacitor para iOS y Android

### Prompt 6 para Claude Code

```
Configura Capacitor para convertir la Next.js app en móvil:

1. Instala las dependencias:
   npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
   npx cap init

2. Crea capacitor.config.ts en la raíz:
   - appId: "com.tuapp.canvas" (cambia tuapp por tu nombre)
   - appName: "Canvas App"
   - webDir: "out"
   - server.url para desarrollo apuntando a tu IP local:3000 (para hot reload)
   - plugins: SplashScreen con launchAutoHide: false

3. Actualiza next.config.js para exportación estática:
   - output: 'export'
   - images.unoptimized: true
   - trailingSlash: true
   NOTA: Next.js API Routes NO funcionan en export estático, necesitaremos moverlas.
   Agrega un comentario TODO explicando esto.

4. Crea src/lib/api-config.ts:
   - Exporta API_URL que en desarrollo apunta a localhost:3000 y en producción a la URL de Vercel
   - Usa NEXT_PUBLIC_API_URL env var con fallback

5. Actualiza package.json con estos scripts:
   "build:mobile": "next build && npx cap sync",
   "ios": "npx cap open ios",
   "android": "npx cap open android",
   "sync": "npx cap sync"

6. Crea un archivo MOBILE_SETUP.md con instrucciones paso a paso para:
   - Generar el build: npm run build:mobile
   - Abrir en Xcode: npm run ios
   - Abrir en Android Studio: npm run android
   - Configurar signing en Xcode para iOS
   - Habilitar el permiso de internet en AndroidManifest.xml
```

---

### Comandos para móvil

```bash
# Primer build mobile
npm run build:mobile

# iOS (requiere Mac + Xcode)
npm run ios
# En Xcode: seleccionar simulador → Run

# Android
npm run android
# En Android Studio: Run → seleccionar emulador
```

---

## Fase 6 — Funcionalidades extra

### Prompt 7 — Color del lienzo y UI personalizada

```
Personaliza la interfaz del canvas:

1. Crea src/components/Toolbar.tsx con un toolbar personalizado que flote sobre el canvas:
   - Posición: bottom center, fixed
   - Botones para cambiar el COLOR DEL FONDO del canvas (usa la API de tldraw: editor.updateInstanceState)
   - Colores predefinidos: blanco (#ffffff), negro (#1a1a2e), gris (#f0f0f0), azul (#e8f4fd), amarillo (#fefce8)
   - El toolbar tiene bordes redondeados, sombra suave, blur de fondo (backdrop-filter: blur)
   - Animación de entrada con framer-motion si está disponible, si no con CSS transition

2. En Canvas.tsx:
   - Recibe el componente Toolbar inyectado como children o componentes personalizados de tldraw
   - Usa la prop "components" de tldraw para inyectar el toolbar personalizado en el área correcta

3. Agrega un panel de "Salas recientes" en src/app/page.tsx:
   - Guarda en localStorage los últimos 5 roomIds visitados con fecha
   - Muéstralos como cards clickeables
   - Cada card muestra: roomId truncado, fecha de última visita, botón de copiar link
```

---

### Prompt 8 — Compartir y colaboración

```
Agrega funcionalidad de compartir:

1. En src/app/room/[roomId]/page.tsx agrega un header con:
   - Nombre editable de la pizarra (guardado en Liveblocks Storage)
   - Botón "Compartir" que copia la URL al clipboard y muestra un toast de confirmación
   - Muestra avatares de los usuarios presentes (máximo 4, +N para el resto)
   - Usa las iniciales del nombre del usuario como avatar con color de fondo único por usuario

2. Crea src/components/PresenceAvatars.tsx:
   - Usa useOthers y useSelf de liveblocks
   - Renderiza avatares superpuestos (overlap) con z-index decreciente
   - Tooltip con el nombre al hacer hover

3. Crea un componente Toast simple en src/components/Toast.tsx:
   - Aparece en bottom-right
   - Auto-dismiss en 2 segundos
   - Variantes: success (verde), error (rojo), info (azul)
```

---

### Prompt 9 — PWA para mejor experiencia móvil web

```
Convierte la app en PWA:

1. Instala: npm install next-pwa
   
2. Actualiza next.config.js para usar withPWA:
   - dest: 'public'
   - disable en desarrollo
   - register: true
   - skipWaiting: true

3. Crea public/manifest.json:
   - name: "Canvas App"
   - short_name: "Canvas"
   - theme_color: "#1a1a2e"
   - background_color: "#1a1a2e"
   - display: "standalone"
   - orientation: "any"
   - icons en tamaños: 192x192 y 512x512 (crea SVGs simples como placeholder)

4. En src/app/layout.tsx agrega los meta tags de PWA:
   - viewport con viewport-fit=cover para el notch de iPhone
   - apple-mobile-web-app-capable
   - apple-mobile-web-app-status-bar-style: black-translucent
   - theme-color

5. Crea public/icons/ con un SVG simple de un canvas/pincel para los iconos
```

---

## Fase 7 — Deploy

### Prompt 10 — Deploy en Vercel

```
Prepara el proyecto para deploy en Vercel:

1. Crea vercel.json en la raíz:
   - Para Next.js no se necesita configuración especial, pero agrega:
   - headers CORS para la API route de liveblocks-auth
   - Límite de duración para funciones: 30s

2. Crea .env.example con todas las variables necesarias (sin valores reales):
   LIVEBLOCKS_SECRET_KEY=
   NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
   CLERK_SECRET_KEY=
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
   NEXT_PUBLIC_API_URL=

3. Actualiza el .gitignore para incluir: .env.local, .env, out/, ios/, android/

4. Crea README.md con:
   - Descripción del proyecto
   - Stack técnico
   - Instrucciones de setup local
   - Instrucciones de deploy
   - Cómo agregar las env vars en Vercel

5. Verifica que el build funcione: npm run build
   Si hay errores de tipos, corrígelos.
```

---

### Comandos de deploy

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy (la primera vez te pide login)
vercel

# Deploy a producción
vercel --prod

# En el dashboard de Vercel agregar todas las env vars de .env.local
```

---

## Arquitectura de archivos

```
canvas-app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── liveblocks-auth/
│   │   │       └── route.ts          # Auth endpoint para Liveblocks
│   │   ├── room/
│   │   │   └── [roomId]/
│   │   │       └── page.tsx          # Página del canvas colaborativo
│   │   ├── sign-in/
│   │   │   └── [[...sign-in]]/
│   │   │       └── page.tsx
│   │   ├── sign-up/
│   │   │   └── [[...sign-up]]/
│   │   │       └── page.tsx
│   │   ├── layout.tsx                # Root layout con ClerkProvider
│   │   └── page.tsx                  # Landing page
│   ├── components/
│   │   ├── Canvas.tsx                # Componente principal tldraw + Liveblocks
│   │   ├── CollaborativeCursors.tsx  # Cursores de otros usuarios
│   │   ├── PresenceAvatars.tsx       # Avatares de usuarios presentes
│   │   ├── RoomProvider.tsx          # Provider de Liveblocks
│   │   ├── Toast.tsx                 # Notificaciones
│   │   └── Toolbar.tsx               # Toolbar flotante personalizado
│   ├── lib/
│   │   ├── api-config.ts             # URLs de API
│   │   ├── liveblocks.config.ts      # Config y tipos de Liveblocks
│   │   └── utils.ts                  # Utilidades generales
│   └── middleware.ts                 # Auth middleware de Clerk
├── public/
│   ├── icons/                        # Iconos PWA
│   └── manifest.json                 # Manifest PWA
├── capacitor.config.ts               # Config Capacitor
├── next.config.js
├── vercel.json
├── .env.local                        # NO commitear
├── .env.example                      # Sí commitear
└── package.json
```

---

## Variables de entorno

Crea el archivo `.env.local` en la raíz con esto:

```env
# Liveblocks — https://liveblocks.io/dashboard
LIVEBLOCKS_SECRET_KEY=sk_dev_
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=pk_dev_

# Clerk — https://dashboard.clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_
CLERK_SECRET_KEY=sk_test_
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# API URL (para Capacitor)
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## Prompts para Claude Code

### Prompt de corrección de errores (usar cuando hay bugs)

```
Tengo este error en el archivo [ARCHIVO]:
[PEGAR ERROR]

El contexto es que estoy construyendo un canvas colaborativo con tldraw y Liveblocks.
Por favor:
1. Explica brevemente qué causa el error
2. Muestra el código corregido completo del archivo
3. Si hay cambios necesarios en otros archivos, menciónalos
```

---

### Prompt para agregar una feature nueva

```
Agrega la siguiente funcionalidad al canvas app:
[DESCRIBIR FEATURE]

Archivos actuales relevantes:
- Canvas.tsx: [pegar contenido o resumir]
- liveblocks.config.ts: [pegar contenido]

Requisitos:
- Mantener compatibilidad con tldraw v3
- Que funcione tanto en web como en móvil (Capacitor)
- Sin librerías adicionales si es posible
- TypeScript estricto, sin "any"
```

---

### Prompt de optimización

```
Optimiza el rendimiento del componente Canvas.tsx.
Problemas actuales que noto:
- [DESCRIBIR PROBLEMAS]

Enfócate en:
1. Reducir re-renders innecesarios (usar memo, useCallback, useMemo donde corresponda)
2. Optimizar la sincronización con Liveblocks para reducir operaciones de escritura
3. Lazy loading de componentes pesados
```

---

### Prompt para tests

```
Crea tests básicos para los componentes críticos:
- Canvas.tsx (test de renderizado)
- liveblocks-auth route (test del endpoint)
- utils.ts (tests unitarios)

Usa Vitest y @testing-library/react.
Mockea tldraw y Liveblocks para los tests de componentes.
```

---

## Troubleshooting común

### tldraw no renderiza / error de SSR

```
// En page.tsx, siempre importar Canvas así:
const Canvas = dynamic(() => import('@/components/Canvas'), {
  ssr: false,
  loading: () => <div className="w-screen h-screen bg-gray-900 animate-pulse" />
})
```

---

### Error "localStorage is not defined"

```
// tldraw usa localStorage internamente, proteger con:
if (typeof window === 'undefined') return null
```

---

### Liveblocks no sincroniza

Verificar en este orden:
1. Las env vars están correctas (`console.log(process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY)`)
2. El endpoint `/api/liveblocks-auth` retorna 200 (verificar en Network tab)
3. El `roomId` es el mismo en ambas ventanas
4. No hay errores de CORS (agregar headers en `vercel.json`)

---

### Capacitor: la app no carga

```typescript
// En capacitor.config.ts para desarrollo con hot reload:
server: {
  url: 'http://TU_IP_LOCAL:3000', // No usar localhost, usar IP real
  cleartext: true
}
// Obtener IP: ipconfig (Windows) / ifconfig (Mac/Linux)
```

---

### Build falla en Vercel

```bash
# Verificar localmente antes:
npm run build

# Errores comunes:
# - Tipos de TypeScript: agregar "as any" temporal o corregir tipos
# - Módulos no encontrados: verificar que estén en dependencies (no devDependencies)
# - Variables de entorno: verificar que estén en el dashboard de Vercel
```

---

## Checklist de fin de semana

### Sábado
- [ ] Setup Next.js + tldraw funcionando localmente
- [ ] Canvas con todas las herramientas de tldraw operativo
- [ ] Landing page con crear/unirse a sala
- [ ] Liveblocks integrado y sincronizando
- [ ] Cursores colaborativos en tiempo real

### Domingo
- [ ] Auth con Clerk funcionando
- [ ] Toolbar personalizado con cambio de color de lienzo
- [ ] Share button con copia de link
- [ ] Build de Capacitor funcionando en simulador
- [ ] Deploy en Vercel
- [ ] PWA configurada

---

## Recursos clave

| Recurso | URL |
|---|---|
| tldraw docs | https://tldraw.dev/docs |
| tldraw + Liveblocks example | https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-tldraw |
| Liveblocks docs | https://liveblocks.io/docs |
| Capacitor docs | https://capacitorjs.com/docs |
| Clerk docs | https://clerk.com/docs |
| Next.js App Router | https://nextjs.org/docs/app |

---

> 💡 **Tip**: Usa `Ctrl+K` en Cursor para hacer preguntas inline sobre el código mientras lo escribes.  
> 💡 **Tip**: Pega el contenido de este archivo como contexto al inicio de cada sesión con Claude Code.

# Strok.io — Guia de Deploy a Produccion y Play Store

## Parte 1: Servidor (Vercel)

### 1.1 Requisitos previos
- Cuenta en [Vercel](https://vercel.com)
- Repositorio en GitHub/GitLab con el codigo
- Variables de entorno configuradas en los servicios externos (Clerk, Liveblocks, Supabase, Anthropic)

### 1.2 Deploy en Vercel

```bash
# Instala Vercel CLI (si no lo tienes)
npm i -g vercel

# Login
vercel login

# Deploy (desde la raiz del proyecto)
vercel
```

O conecta el repo desde el dashboard de Vercel: **New Project > Import Git Repository**

### 1.3 Variables de entorno en Vercel

En **Vercel Dashboard > Settings > Environment Variables**, agrega:

```
# Liveblocks
LIVEBLOCKS_SECRET_KEY=sk_prod_...
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=pk_prod_...

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Anthropic (AI)
ANTHROPIC_API_KEY=sk-ant-...
```

> **Importante**: Usa las keys de **produccion** de Clerk (pk_live/sk_live), no las de test.

### 1.4 Dominio personalizado

1. En Vercel: **Settings > Domains > Add**
2. Agrega `strok.io` (o tu dominio)
3. Configura los DNS en tu registrador:
   - `A` record: `76.76.21.21`
   - `CNAME` para `www`: `cname.vercel-dns.com`

### 1.5 Configurar Clerk para produccion

1. En [Clerk Dashboard](https://dashboard.clerk.com):
   - Crea una instancia de **Production**
   - Agrega tu dominio (`strok.io`) en **Domains**
   - Copia las keys de produccion a Vercel
2. Activa los metodos de login que necesites (email, Google, GitHub, etc.)

### 1.6 Verificar el deploy

```bash
# Verifica que la web funcione
curl -I https://strok.io

# Verifica el API
curl -X POST https://strok.io/api/liveblocks-auth \
  -H "Content-Type: application/json" \
  -d '{"room":"test"}'
```

---

## Parte 2: App Android (Play Store)

### 2.1 Requisitos previos
- [Android Studio](https://developer.android.com/studio) instalado
- JDK 21+
- Cuenta de [Google Play Console](https://play.google.com/console) ($25 USD una sola vez)

### 2.2 Configurar la URL de produccion

Edita `capacitor.config.ts`:

```typescript
// Cambia esto:
const serverUrl = process.env.CAP_SERVER_URL || "http://10.0.2.2:3000";

// Por esto:
const serverUrl = process.env.CAP_SERVER_URL || "https://strok.io";
```

### 2.3 Desactivar cleartext HTTP

Edita `android/app/src/main/AndroidManifest.xml`:

```xml
<!-- Cambia esto: -->
android:usesCleartextTraffic="true"

<!-- Por esto (o eliminalo): -->
android:usesCleartextTraffic="false"
```

### 2.4 Sincronizar Capacitor

```bash
npx cap sync android
```

### 2.5 Generar icono y splash screen

1. Prepara un icono de 1024x1024 px (PNG, sin transparencia para Play Store)
2. En Android Studio: **File > New > Image Asset**
   - Selecciona tu icono
   - Genera automaticamente todos los tamanos (mdpi, hdpi, xhdpi, etc.)
3. Para splash screen, reemplaza `android/app/src/main/res/drawable/splash.png`

### 2.6 Configurar version

Edita `android/app/build.gradle`:

```gradle
defaultConfig {
    applicationId "io.strok.app"
    versionCode 1          // Incrementa con cada release (1, 2, 3...)
    versionName "1.0.0"    // Version visible al usuario
}
```

### 2.7 Generar keystore de firma

```bash
# Solo la primera vez — GUARDA ESTE ARCHIVO Y PASSWORD, es irrecuperable
keytool -genkey -v \
  -keystore strok-release.keystore \
  -alias strok \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Mueve el keystore fuera del repo y **nunca lo subas a git**.

### 2.8 Configurar firma en Gradle

Crea `android/keystore.properties` (no commitear):

```properties
storeFile=../strok-release.keystore
storePassword=TU_PASSWORD
keyAlias=strok
keyPassword=TU_KEY_PASSWORD
```

Agrega a `android/.gitignore`:

```
keystore.properties
*.keystore
```

Edita `android/app/build.gradle`, agrega antes de `android {}`:

```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

Dentro de `android {}`, agrega:

```gradle
signingConfigs {
    release {
        storeFile file(keystoreProperties['storeFile'] ?: 'debug.keystore')
        storePassword keystoreProperties['storePassword'] ?: ''
        keyAlias keystoreProperties['keyAlias'] ?: ''
        keyPassword keystoreProperties['keyPassword'] ?: ''
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

### 2.9 Generar AAB (Android App Bundle)

```bash
cd android
./gradlew bundleRelease
```

El archivo se genera en:
```
android/app/build/outputs/bundle/release/app-release.aab
```

### 2.10 Subir a Google Play Console

1. Entra a [Google Play Console](https://play.google.com/console)
2. **Crear aplicacion**
   - Nombre: `Strok.io`
   - Idioma: Espanol
   - Tipo: App
   - Acceso: Gratuita
3. **Ficha de Play Store** (obligatorio antes de publicar):
   - Descripcion corta (80 chars): "Pizarra colaborativa en tiempo real con AI"
   - Descripcion larga (4000 chars): describe las features
   - Capturas de pantalla: minimo 2 (telefono), recomendado 4-8
   - Icono de alta resolucion: 512x512 PNG
   - Grafico de funciones: 1024x500 PNG
4. **Clasificacion de contenido**: Completa el cuestionario (es una app de productividad, sin contenido sensible)
5. **Politica de privacidad**: Necesitas una URL con tu politica de privacidad
6. **Produccion > Crear nueva version**:
   - Sube el archivo `.aab`
   - Nombre de la version: "1.0.0"
   - Notas de la version: "Lanzamiento inicial"
7. **Revisar y publicar**

> Google tarda 1-7 dias en revisar la primera version.

---

## Parte 3: Checklist final

### Antes de publicar

- [ ] URL de produccion en `capacitor.config.ts` (`https://strok.io`)
- [ ] `usesCleartextTraffic="false"` en AndroidManifest
- [ ] Variables de entorno de produccion en Vercel
- [ ] Keys de Clerk de produccion (pk_live/sk_live)
- [ ] Dominio configurado en Clerk Dashboard
- [ ] Icono de app generado (todos los tamanos)
- [ ] Splash screen personalizado
- [ ] `versionCode` y `versionName` actualizados
- [ ] Keystore de release generado y guardado en lugar seguro
- [ ] Firma configurada en build.gradle
- [ ] AAB generado con `./gradlew bundleRelease`
- [ ] Politica de privacidad publicada en una URL
- [ ] Capturas de pantalla para Play Store
- [ ] Ficha de Play Store completa

### Para cada actualizacion

1. Haz cambios en el codigo
2. Deploya a Vercel (automatico si conectaste el repo)
3. Solo si cambiaste algo nativo (Capacitor config, plugins, AndroidManifest):
   ```bash
   npx cap sync android
   ```
4. Incrementa `versionCode` en `build.gradle`
5. Genera nuevo AAB: `cd android && ./gradlew bundleRelease`
6. Sube a Play Store

> Si solo cambiaste codigo web (React/Next.js), el deploy a Vercel es suficiente — la app nativa carga desde el servidor, no necesitas actualizar el APK.

---

## Desarrollo local (referencia)

```bash
# Web
npm run dev

# Android emulador (cambiar capacitor.config.ts a http://10.0.2.2:3000)
npx cap sync android
# Abrir android/ en Android Studio y Run

# Android dispositivo fisico (en la misma WiFi)
# Usar tu IP local: http://192.168.x.x:3000
```

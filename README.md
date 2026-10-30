# ASISTAPP

Prototipo de un sistema de asistencia de personal escolar. Tiene cuatro perfiles (Administrador, Preceptor, Profesor y Alumno), módulo de configuración (reglas de tardanza, horarios, ubicación y redes Wi-Fi, código QR), fichaje por QR con la cámara, reportes con gráficos y exportación a PDF/Excel.

## Modos
- **Demostración:** datos de ejemplo, no necesita nada más. Es la que se usa para presentar el prototipo.
- **Datos reales:** se conecta a Supabase con login de Google (opcional).

## Cómo correrlo
```bash
npm install
npm run dev      # http://localhost:3000
```

Para el modo con datos reales, copiá `.env.example` a `.env.local` y completá:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Build y publicación
```bash
npm run build    # genera la carpeta "out" (sitio estático)
```
La carpeta `out` se puede subir a Netlify. El archivo `netlify.toml` ya define el comando de build y la carpeta a publicar. Si se conecta el repositorio a Netlify, cargá las dos variables de entorno de arriba.

## Tecnología
Next.js · React · TypeScript · Supabase · jsPDF/xlsx (exportación) · jsQR (lectura de QR con la cámara)

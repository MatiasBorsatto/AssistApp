# Auditoría de ASISTAPP

Fecha: 10/11/2026 · Alcance: código del repositorio (rama `main`, commit `50c6ffa`), modo demostración en ejecución y documentación del proyecto (tesis v4, requisitos, backlog, casos de uso).

## Cómo se auditó

| Verificación | Herramienta | Resultado |
|---|---|---|
| Tipos de TypeScript | `tsc --noEmit` | Sin errores |
| Accesibilidad WCAG 2.1 A/AA en 12 pantallas | axe-core 4.10 sobre la app en ejecución | 2 tipos de falla (ver A1 y A2) |
| Zoom al 200 % (ancho efectivo 640 px) | Chrome sin interfaz | Sin desborde horizontal |
| Dependencias | `npm audit` | 13 vulnerabilidades (1 crítica, 7 altas) |
| Seguridad y datos del modo real | Lectura de `lib/repo.ts`, `components/live/*` | Ver S1 a S4 |
| Cobertura de requisitos | Comparación con RF, RNF, historias y casos de uso | Ver sección 3 |

No se pudo verificar la base de datos de Supabase (políticas RLS, esquema, respaldos) porque no está en el repositorio.

## Correcciones aplicadas (10/11/2026)

| Hallazgo | Corrección | Verificación |
|---|---|---|
| S2 (parcial) | El fichaje tiene la opción «Mi ubicación real (GPS del celular)»: lee el GPS con `navigator.geolocation`, mide la distancia al punto de la escuela y aplica el radio. El punto se carga en Configuración → Ubicación y redes con «Usar mi ubicación actual» (`lib/geo.ts`, `lib/fichaje.ts`, `components/fichar.tsx`, `components/config-demo.tsx`). Si el GPS no responde a tiempo, el fichaje queda pendiente; si se niega el permiso, se explica en texto. **El Wi-Fi sigue simulado**: los navegadores no exponen el nombre de la red. | Chrome con ubicación simulada: a 40 m se registró; a 1.990 m quedó fuera del perímetro. |
| S4 | `xlsx` pasó a la versión 0.20.3 oficial de SheetJS. Next.js pasó de 16.3.3 a 16.4.6 (tenía 11 avisos, uno crítico). `shadcn` pasó a dependencia de desarrollo. | `npm audit --omit=dev`: 0 vulnerabilidades. Exportación a Excel probada. |
| A1 | La tabla de «Pasar lista» ya no se atenúa con opacidad antes de validar el curso; se marca con un fondo gris claro. | axe: sin violaciones en «Pasar lista». |
| A2 | Calendario: se quitaron los roles de grilla incompletos. Cada día es un botón con su fecha completa y el tipo de día. | axe: sin violaciones en «Calendario». |
| A7 | Se quitaron `pdfjs-dist` y `@vercel/analytics`. | Build estático correcto. |
| A8 | Descarga de PDF confirmada: «Asistencia de hoy» y «Reportes» generan archivos PDF válidos. | Archivos de 13 KB y 32 KB con cabecera `%PDF-`. |

Siguen abiertos: S1, S3, S5, S6, A3 a A6, A9 y A10. La importación de Excel con la nueva versión de `xlsx` no se probó, porque solo existe en el modo con datos reales.

## 1. Hallazgos prioritarios

### S1 · Alta · Privacidad: el modo real descarga los datos de todo el personal a cualquier usuario
- Cualquier cuenta de Google que inicie sesión y no figure en la tabla `usuarios` recibe el rol `docente` por defecto (`lib/repo.ts`, `getRolUsuario`).
- Al iniciar sesión, `recargar()` pide **todos los docentes y todas las novedades del año**, incluidas licencias médicas y psiquiátricas (`components/live/LiveContext.tsx`). La vista «Mi perfil» filtra después en el navegador.
- Si las políticas RLS de Supabase permiten leer a cualquier usuario autenticado, cualquier persona con una cuenta de Google puede ver datos de salud del personal desde las herramientas del navegador. Las políticas no están versionadas, así que hoy no se puede afirmar que estén bien.
- **Acción:** versionar el esquema y las políticas RLS en `supabase/`; que el rol por defecto sea `invitado` sin acceso a datos; filtrar en la consulta por el usuario, no en el navegador.

### S2 · Alta · El GPS y el Wi-Fi del fichaje están simulados
- No hay ninguna llamada a `navigator.geolocation` en el código. La ubicación y la red se eligen en el bloque «Condiciones del celular» de la demostración (`lib/fichaje.ts`, `UBICACIONES`).
- La lectura del QR con la cámara sí es real (jsQR).
- La tesis y `docs/requisitos-y-matrices.md` presentan RF1 como «Implementado (QR, GPS, Wi-Fi y horario)». **Debe corregirse a «Parcial: QR real, GPS y Wi-Fi simulados».**
- **Acción:** leer la ubicación real con `navigator.geolocation` (con permiso y mensaje si se niega). Para el Wi-Fi, los navegadores no exponen el nombre de la red: dejarlo como requisito de una app nativa o reemplazarlo por la IP pública de la escuela, validada en el servidor.

### S3 · Alta · Las funciones centrales existen solo en la demostración
El modo real (Supabase) gestiona novedades del personal, pero **no tiene**:

| Función | Demo | Modo real |
|---|---|---|
| Fichaje por QR | Sí | No |
| Cola sin conexión (RNF2) | Sí | No |
| Aviso temprano del docente (CU02) | Sí | No |
| Justificaciones con foto y aprobación (CU03, alumno → preceptor) | Sí | No |
| Calendario del ciclo con licencias | Sí | Parcial (configuración de ciclo y feriados) |
| Carga masiva desde Excel (RF2) | No | Sí |
| Estados de novedad precargados (HU6) | No | Sí (licencia médica, gremial, duelo, paro, etc.) |
| Alertas de vencimiento de licencias | No | Sí |

En la demo, todo vive en memoria: al recargar la página se pierden fichajes, justificaciones y configuración. La tesis debe dejar claro que el prototipo funcional de fichaje es una demostración.

### S4 · Alta · Librería `xlsx` 0.18.5 con vulnerabilidades sin parche en npm
- Prototype Pollution (GHSA-4r6h-8v6p-xvw6) y ReDoS (GHSA-5pgg-2g8v-p4x9). La app abre Excel subidos por el usuario (`lib/importar.ts`), que es justo el caso de riesgo.
- `npm audit` informa además 12 vulnerabilidades más (por ejemplo `zod`, arrastrada por el CLI de `shadcn`).
- **Acción:** pasar a la versión oficial de SheetJS desde su CDN (0.20.x) o a `exceljs`; quitar `shadcn` de las dependencias de producción (es una herramienta de línea de comandos).

### S5 · Media · Guardar una novedad no es atómico
`guardarNovedad` (`lib/repo.ts`) primero borra los registros del día y después inserta los nuevos. Si la inserción falla (red, permiso), el registro anterior ya se perdió. **Acción:** una función RPC en Supabase que haga ambos pasos en una transacción, o insertar primero y borrar después.

### S6 · Media · «Mi perfil» identifica a la persona por coincidencia de nombre
`MiPerfil` (`components/live/LiveApp.tsx`) compara el nombre de la cuenta de Google con nombre y apellido de cada legajo. Dos personas con nombres parecidos pueden ver el legajo ajeno, y alguien con otro nombre en Google no ve el suyo. **Acción:** vincular el legajo por email o por id de usuario.

## 2. Otros hallazgos

| Código | Severidad | Hallazgo | Acción sugerida |
|---|---|---|---|
| A1 | Media | Contraste insuficiente (2,9:1, se pide 4,5:1) en el texto gris `#8c97a6` de encabezados y celdas de tabla. Detectado en «Pasar lista»; el mismo color se usa en otras tablas. | Oscurecer el gris a `#5f6b7a` o similar y repetir la prueba. |
| A2 | Baja | Calendario: filas con `role="row"` sin celdas con el rol correspondiente (6 casos). Afecta lectores de pantalla. | Dar `role="gridcell"` a los días o quitar los roles ARIA de la grilla. |
| A3 | Media | No hay pruebas automatizadas. Las reglas de `evaluarFichaje` son puras y fáciles de probar. | Agregar Vitest con casos de tardanza, ventana, administrativos y QR inválido. |
| A4 | Media | Sin `Content-Security-Policy` en `netlify.toml`. | Agregar una CSP que permita solo el propio sitio y Supabase. |
| A5 | Media | Los respaldos se arman en el navegador con la copia completa de docentes y novedades y se guardan en la tabla `backups`. Duplica datos sensibles y crece sin límite. | Respaldos del lado de Supabase (programados) y retención limitada. |
| A6 | Media | RNF1 medido solo en el cliente (0,51 s). No hay prueba de carga del pico de fichajes. | Prueba de carga con k6 o Artillery cuando exista el fichaje en modo real. |
| A7 | Baja | Dependencias instaladas sin uso: `pdfjs-dist`, `@vercel/analytics`. | Quitarlas. |
| A8 | Baja | La descarga real del PDF de reportes no se confirmó (P4). | Probar en Chrome y en un celular. |
| A9 | Baja | La demo asocia cada perfil a una persona fija (`personaDePerfil`): el administrador ficha como «Sofía López». | Aceptable para la demo; documentarlo. |
| A10 | Baja | Repositorio: `next-env.d.ts` modificado por `next dev`; cuatro versiones de la tesis sin versionar en `docs/`. | Restaurar `next-env.d.ts`; dejar solo la versión final de la tesis. |

## 3. Requisitos: estado verificado

| Requisito | Estado según la documentación | Estado verificado | Diferencia |
|---|---|---|---|
| RF1 Fichaje QR | Implementado | **Parcial**: QR y GPS reales, Wi-Fi simulado, solo en demo | Corregir la tesis |
| RF2 Carga masiva | Parcial | Parcial: Excel de docentes en modo real | — |
| RF3 Notificaciones | Parcial | Parcial: dentro de la app, solo demo | — |
| RF4 Aprobación de faltas | Implementado | Implementado en demo; en modo real se cargan novedades, sin flujo de aprobación | Aclarar |
| RF5 Excel y PDF | Implementado | Implementado; Excel y PDF descargados y verificados | — |
| RNF1 < 3 s | Parcial | Parcial | — |
| RNF2 Offline | Implementado (prototipo) | Implementado solo en demo | — |
| RNF3 Portabilidad | Parcial | Parcial; sin desborde al 200 % | — |
| RNF4 Seguridad | Parcial | **En riesgo** (S1, S4, A4) | Agregar a la tesis |
| WCAG 1 Contraste | Pendiente | Sin fallas automáticas en las 12 pantallas probadas, tras corregir A1 | Actualizar la tesis |
| WCAG 2 Texto 200 % | Pendiente | Cumple en fichaje (sin desborde a 640 px) | Actualizar la tesis |
| WCAG 3 Errores en texto | Parcial | Parcial | — |

Historias de usuario sin implementar: HU1 (tablero con ausentismo semanal, límite de faltas y cursos sin docente), HU9 (licencia con validación domiciliaria), HU10 (biometría). Reglas de negocio sin implementar: RN1 (exportación semanal para CIDI), RN3 (validación domiciliaria) y RN4 (bloquear licencias cargadas fuera del día de emisión del certificado).

## 4. Qué se podría hacer, según la documentación

Ordenado por valor para la institución y esfuerzo.

| Prioridad | Mejora | Origen | Esfuerzo |
|---|---|---|---|
| 1 | Cerrar S1: esquema y RLS versionados, rol por defecto sin acceso, consultas filtradas por usuario | RNF4, entrevista de Soporte | Medio |
| 2 | Llevar el fichaje QR, el aviso temprano y las justificaciones al modo real, con tablas en Supabase | RF1, RF3, RF4, CU01–CU03 | Alto |
| 3 | GPS real con `navigator.geolocation` y radio configurable | RF1, CU01 paso 4 | Bajo |
| 4 | Cola offline en el modo real, con envío idempotente (id único por fichaje) | RNF2, HU11 | Medio |
| 5 | Reemplazar `xlsx` y limpiar dependencias | RNF4 | Bajo |
| 6 | Corregir contraste y roles ARIA del calendario | WCAG 1 | Bajo |
| 7 | Pruebas unitarias de reglas de fichaje y novedades | Matriz de riesgos (errores de cálculo) | Bajo |
| 8 | Tablero del directivo: ausentismo semanal, docentes cerca del límite de faltas, cursos sin docente hoy | HU1, entrevista del Equipo Directivo | Medio |
| 9 | Regla RN4: fecha de emisión del certificado obligatoria y bloqueo si no coincide con el día de carga | RN4, entrevista del Equipo Directivo | Bajo |
| 10 | Exportación semanal en el formato que se carga en CIDI (sin integración, solo el archivo) | RN1, entrevista Administrativa | Bajo |
| 11 | Notificaciones push con PWA (service worker) antes que una app nativa | RF3, entrevista de Docentes | Medio |
| 12 | Pantalla de ingreso con QR rotativo en una tablet y registro de auditoría de cambios | Matriz de riesgos (auditoría/edición) | Medio |
| 13 | Prueba de usabilidad con usuarios reales (protocolo de la tesis, sección 7.5) | Objetivo «interfaz clara» | Bajo |

Quedan fuera de alcance mientras no haya acuerdos o hardware: integración con CIDI y SIU Guaraní, biometría y validación domiciliaria por geolocalización.

## 5. Correcciones a la documentación

1. RF1: cambiar a «Parcial»: QR y GPS reales; Wi-Fi simulado; solo en la demostración.
2. RF4: aclarar que el flujo de aprobación existe solo en la demostración.
3. Agregar una tabla «Demo frente a modo real» (sección 1, S3).
4. WCAG 1: «Sin fallas automáticas tras la corrección» (antes 2,9:1 en «Pasar lista»). WCAG 2: «Cumple en la pantalla de fichaje».
5. RNF4: agregar los hallazgos S1, S4 y A4.
6. Matriz de pruebas: sumar las pruebas automáticas de esta auditoría (axe, zoom 200 %, `npm audit`, `tsc`).

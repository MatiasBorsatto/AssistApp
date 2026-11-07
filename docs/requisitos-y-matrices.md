# ASISTAPP · Requisitos, estado de implementación y matrices

Documento de trabajo del prototipo. El estado se marca con tres valores:

- **Implementado**: funciona en la aplicación y se probó en el navegador.
- **Parcial**: existe en el prototipo, pero no cubre todo lo pedido o no se verificó por completo.
- **No implementado**: no está en la aplicación. CIDI y SIU Guaraní no se pueden implementar libremente (dependen de sistemas oficiales y de acuerdos de integración).

## 1. Requisitos funcionales (RF)

| Código | Requisito | Estado | Dónde está en la app |
|---|---|---|---|
| RF1 | Registrar ingreso y egreso con código QR institucional o app móvil. | Implementado (QR, GPS, Wi-Fi y horario, en el prototipo). | Inicio → Registrar asistencia (`components/fichar.tsx`, `lib/fichaje.ts`). |
| RF2 | Carga masiva de nómina y horarios por CSV o Excel. | Parcial: importación en modo real. Sin carga masiva en el prototipo de demostración. | Modo real: `components/live/` y `lib/importar.ts`. |
| RF3 | Notificaciones automáticas al registrar un aviso temprano de inasistencia. | Parcial: alertas dentro de la aplicación (campanita). No hay notificación push ni WhatsApp. | `components/aviso.tsx`, `components/Shell.tsx`. |
| RF4 | Módulo exclusivo para que el equipo directivo apruebe, rechace o justifique faltas y licencias. | Implementado. | Justificaciones (`components/justificaciones.tsx`). |
| RF5 | Exportar reportes consolidados en Excel (.xlsx) y PDF para liquidación de haberes. | Implementado. La descarga del PDF se confirmó en la sesión de pruebas solo con el aviso; falta verificar el archivo descargado. | Reportes (`components/reportes.tsx`, `lib/export.ts`). |

## 2. Requisitos no funcionales (RNF)

| Código | Requisito | Estado | Implementación y verificación |
|---|---|---|---|
| RNF1 | Rendimiento: el fichaje responde en menos de 3 segundos. | Parcial. Implementado y medido en el prototipo. No se probó con concurrencia de muchos usuarios a la vez. | El tiempo se mide desde el escaneo hasta el resultado y se muestra en la pantalla de validación (`components/fichar.tsx`, constante `RNF1_SEGUNDOS` en `lib/fichaje.ts`). Prueba del navegador: 0,51 s con conexión simulada. |
| RNF2 | Offline-first: si no hay conexión, el fichaje se guarda en el celular y se sincroniza al volver la red. | Implementado para el fichaje QR en el prototipo. En el modo real no se implementó la cola local. | Cola en el navegador (`lib/cola-offline.ts`). Al volver la conexión se envían los fichajes guardados y se generan las alertas de tardanza que correspondan. |
| RNF3 | Portabilidad: web en navegadores comunes y uso cómodo en celular. | Parcial. Interfaz web responsive. No hay aplicación móvil nativa. | Next.js, exportación estática (carpeta `out`), desplegada en Netlify. |
| RNF4 | Seguridad: credenciales y base de datos cifradas. | Parcial. Conexión HTTPS en Netlify, autenticación de Supabase y cabeceras de seguridad (`netlify.toml`). El cifrado en reposo depende de Supabase; no se auditó. | Pendiente de revisión de seguridad. |
| WCAG 1 | Contraste AA en texto y fondo. | Pendiente de auditoría. No se midió con herramienta. | Pendiente. |
| WCAG 2 | Texto ampliable hasta 200 % sin romper la interfaz. | Pendiente de prueba. | Pendiente. |
| WCAG 3 | Errores y campos obligatorios explicados en texto, no solo con color. | Parcial. Los mensajes de fichaje y formularios son textuales. | Banners de resultado en `components/fichar.tsx` y formularios de `components/justificaciones.tsx`. |

## 3. Requisitos no implementados (documentados como pendientes)

| Requisito | Motivo | Estado |
|---|---|---|
| Integración con CIDI (carga semanal obligatoria). | Requiere acceso al sistema oficial. No es posible implementarla libremente. | No implementado |
| Integración con SIU Guaraní. | Requiere acuerdo e integración con el sistema oficial. No es posible implementarla libremente. | No implementado |
| Biometría para personal auxiliar. | Requiere hardware (lector biométrico) y tratamiento de datos biométricos. | No implementado (se mantiene la foto de respaldo como propuesta). |
| Notificaciones por WhatsApp o push nativa. | Requiere cuenta de mensajería y aplicación móvil nativa. | No implementado |
| Licencia médica con verificación de permanencia domiciliaria por geolocalización. | Requiere validación de datos de ubicación fuera de la escuela y consentimiento. | No implementado |
| Tablero de control con indicadores de ausentismo semanal. | Solo hay calendario y reportes, no un tablero con esos indicadores. | Parcial |

## 4. Matriz de trazabilidad (requisito → caso de uso → módulo)

| Requisito | Caso de uso | Módulo / archivo | Estado |
|---|---|---|---|
| RF1, RNF1, RNF2 | Registrar asistencia QR | Fichaje (`fichar.tsx`, `fichaje.ts`, `cola-offline.ts`) | Implementado |
| RF3 | Generar alerta de tardanza / aviso temprano | `aviso.tsx`, `Shell.tsx` | Parcial |
| RF4, WCAG 3 | Validar justificaciones (aprobar / rechazar) | `justificaciones.tsx`, `alumno.tsx` | Implementado |
| RF5 | Exportar reportes | `reportes.tsx`, `export.ts` | Implementado |
| RF2 | Configurar horarios y ciclo | `config-demo.tsx`, modo real | Parcial |
| RNF3 | Acceso web | Toda la aplicación | Parcial |
| RNF4 | Acceso seguro | Supabase, Netlify, `netlify.toml` | Parcial |

## 5. Matriz de pruebas (navegador)

| Prueba | Pasos | Resultado esperado | Resultado obtenido |
|---|---|---|---|
| P1. Fichaje con conexión | Perfil Preceptor → Mi asistencia → Escaneo simulado con conexión. | Asistencia registrada en menos de 3 s. | Registrado. Tiempo medido: 0,51 s. |
| P2. Fichaje sin conexión | Conexión del celular: "Sin conexión" → Escaneo simulado. | Queda guardado en el celular, con aviso de cola. | Registrado en cola. Aviso: "Sin conexión… se enviará al volver la red". |
| P3. Sincronización | Volver a "Con conexión". | Se envía la cola y se muestra aviso. | "Conexión restablecida: se envió 1 fichaje guardado sin conexión." La cola queda vacía. |
| P4. Descarga de PDF | Reportes → Exportar PDF. | Se descarga el archivo. | Pendiente: el aviso aparece, no se confirmó el archivo descargado. |

Pruebas anteriores de la sesión (justificaciones con rango de fechas, calendario y reportes) se registrarán aquí cuando se revisen los registros de la sesión anterior.

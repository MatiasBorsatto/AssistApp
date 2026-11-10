Creá una presentación en español de exactamente 10 diapositivas para la defensa de un proyecto académico. No agregues diapositivas extra. Tono formal pero claro, pensado para exponer en 10 a 12 minutos ante el profesor. Diseño limpio, con poco texto por diapositiva (máximo 6 viñetas cortas), íconos simples y colores sobrios (azul oscuro, gris y un acento naranja). Usá solo la información de este prompt: no inventes datos, cifras, nombres ni citas. Donde indico [CAPTURA: nombre], dejá un espacio para una imagen que voy a subir después.

DATOS GENERALES
- Proyecto: ASISTAPP, sistema de asistencia del personal escolar.
- Institución: UPC. Carrera: Tecnicatura Superior en Desarrollo de Software.
- Materias: Programación III e Ingeniería del Software. Profesor: Juan Domingo Tortelli.
- Fecha de presentación: 11/11/2026.
- Equipo: Matías Bogliotti (Product Owner), Tomás Gudiño Rubiolo (Scrum Master), Federico Bruno (Developer Frontend/UX), Alex Combina (Developer Frontend/UI), Matías Borsatto (Developer Backend), Cristian Figueroa (Developer Backend), Sergio Rios (QA y Documentación).

ESTRUCTURA

1. Portada: nombre del proyecto, subtítulo «Sistema de asistencia del personal escolar», institución, carrera, materias, profesor, fecha y equipo.

2. El problema y a quién afecta: el control de asistencia del personal es manual. Los avisos de ausencia llegan de forma informal, se anotan en planillas de Excel y se cargan una vez por semana en la plataforma oficial (CIDI). Afecta a docentes y auxiliares (fichaje lento que impacta en sus haberes), al personal administrativo (información dispersa) y al equipo directivo (sin datos en tiempo real para cubrir suplencias).

3. Cómo surgieron las entrevistas y qué dijeron: la guía de la cátedra pedía conocer al usuario antes de diseñar, eligiendo entre encuesta y entrevista. El equipo eligió entrevistas estructuradas con un representante de cada perfil, pidiendo solo los datos necesarios. Lo que pidió cada perfil:
- Directivos: ausentismo semanal y alertas apenas un docente avisa una falta.
- Administrativos: exportación a Excel y PDF, y carga masiva de horarios.
- Docentes: fichar hasta 10 minutos antes de entrar al aula y avisar ausencias al instante.
- Auxiliares: pocos clics.
- Sistemas: funcionar sin internet y sincronizar después.

4. Qué se abordó: definición del problema, entrevistas, stakeholders y matriz de poder-interés, backlog de 11 historias de usuario (Como/Quiero/Para), requisitos funcionales, no funcionales y de accesibilidad (WCAG), matriz FODA, matriz de riesgos, casos de uso, prototipo y pruebas. Los diagramas UML (casos de uso, clases y entidad-relación) se hicieron en draw.io; las descripciones, en Google Docs. [CAPTURA: diagrama de clases]

5. La solución, ASISTAPP: aplicación web pensada para el celular.
- Fichaje con el código QR de la entrada, validando ubicación GPS, red y horario.
- Alerta automática de tardanza.
- Aviso temprano de inasistencia del docente.
- Justificaciones con rango de fechas y foto del certificado, aprobadas o rechazadas con motivo.
- Calendario del ciclo lectivo, reportes y exportación a Excel y PDF.
[CAPTURA: fichaje con resultado]

6. Qué problemas resuelve (antes y después, en dos columnas):
- Registro en papel → fichaje digital verificable.
- Avisos informales → aviso temprano con alerta a directivos.
- Certificados que llegan tarde → justificación con foto en el mismo día.
- Tardanzas detectadas a fin de semana → alerta en el momento.
- Consolidación manual para sueldos → reportes en Excel y PDF.

7. La aplicación en uso: cuatro perfiles (Administrador, Preceptor, Profesor y Alumno), cada uno con su menú «¿Qué necesitás hacer?». Si se corta internet, el fichaje se guarda en el celular y se envía solo al volver la red. El fichaje se procesó en 0,51 segundos, con un objetivo de menos de 3 segundos. [CAPTURA: inicio del administrador] [CAPTURA: fichaje sin conexión]

8. Problemas técnicos y cómo se resolvieron:
- El navegador no permite leer la red Wi-Fi → se simula y queda para una app nativa.
- Los docentes no tienen horario fijo → el fichaje se mide contra su clase.
- Una foto del QR podía servir fuera de la escuela → validación combinada y código rotativo cada 30 segundos.
- Librerías con vulnerabilidades → actualizadas, auditoría en cero.
- Fallas de accesibilidad → corregidas; la prueba automática quedó sin errores.

9. Pruebas y límites: todas las pruebas ejecutadas en el navegador resultaron aprobadas (fichaje con y sin conexión, GPS, justificaciones, aviso temprano, calendario, reportes, accesibilidad). No implementado: integración con CIDI y SIU Guaraní (son sistemas oficiales), biometría y notificaciones por WhatsApp. Riesgo abierto: proteger la privacidad de los datos en la versión con base real.

10. Cierre y próximos pasos: llevar el fichaje y las justificaciones a la base de datos real, cerrar el riesgo de privacidad, sumar notificaciones push y pruebas con usuarios. Terminar con «¡Gracias! ¿Preguntas?».

En las notas del orador de cada diapositiva, agregá 2 o 3 oraciones para explicarla en voz alta.

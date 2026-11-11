# Guion de la presentación de ASISTAPP

**Duración de las diapositivas:** unos 10 a 12 minutos.
- **Parte 1, diapositivas (Gamma):** 10 a 12 minutos.
- **Parte 2, la aplicación funcionando:** según la división del equipo.
- **Preguntas:** al final, después de la demostración.

## Reparto de las diapositivas
Las diapositivas se dividen entre los siete integrantes, en el mismo orden en que después muestran la aplicación. Matías Bogliotti abre la presentación.

| Orden | Integrante | Diapositivas | Tiempo |
|---|---|---|---|
| 1 | Matías Bogliotti | 1 y 2: portada y el problema | 1 min 30 s |
| 2 | Tomás Gudiño Rubiolo | 3: entrevistas | 1 min 30 s |
| 3 | Federico Bruno | 4: qué se abordó en el proyecto | 1 min |
| 4 | Alex Combina | 5 y 6: la solución y qué problemas resuelve | 2 min |
| 5 | Matías Borsatto | 7: la aplicación en uso | 1 min |
| 6 | Cristian Figueroa | 8: problemas técnicos | 1 min 30 s |
| 7 | Sergio Rios | 9 y 10: pruebas, límites y próximos pasos | 1 min 30 s |

El texto sigue lo que se ve en cada diapositiva de Gamma. Debajo de cada título, «En pantalla» resume lo que muestra la diapositiva. Entre corchetes van las indicaciones de qué señalar o hacer.

## Parte 1: diapositivas

### Diapositiva 1. ASISTAPP (30 segundos)
**Habla: Matías Bogliotti**

En pantalla: «ASISTAPP, Sistema de asistencia del personal escolar», los datos de la materia y el equipo de desarrollo con sus roles.

Buenos días. Somos el equipo de ASISTAPP y les vamos a presentar el proyecto que desarrollamos para Programación III e Ingeniería del Software, con el profesor Juan Domingo Tortelli.

[Señalar la lista «Equipo de desarrollo».] Somos siete integrantes y trabajamos con Scrum: acá ven el rol de cada uno.

ASISTAPP es un sistema para registrar y gestionar la asistencia del personal de una escuela. Primero les contamos el problema y cómo llegamos a la solución, y al final les mostramos la aplicación funcionando.

### Diapositiva 2. El control de asistencia es manual y llega tarde (1 minuto)
**Habla: Matías Bogliotti**

En pantalla: el título, la línea «Avisos de ausencia informales · Planillas de Excel · Carga semanal en la plataforma oficial (CIDI)» y tres tarjetas: docentes y auxiliares, administrativos y directivos.

Como dice el título, hoy el control de asistencia es manual y la información llega tarde. [Señalar la línea de arriba.] Cuando alguien va a faltar, avisa de manera informal; eso se anota en una planilla de Excel y una vez por semana se carga en CIDI, la plataforma oficial de la provincia.

[Señalar las tres tarjetas, de izquierda a derecha.] El problema afecta a todos:
- A docentes y auxiliares, porque un fichaje lento o mal registrado impacta en sus haberes.
- A administración, que trabaja con información dispersa.
- Y a los directivos, que no tienen datos en tiempo real para cubrir una suplencia antes de que empiece la jornada.

Tomás les cuenta cómo llegamos a entender estas necesidades.

### Diapositiva 3. Entrevistas: conocer al usuario antes de diseñar (1 minuto y 30 segundos)
**Habla: Tomás Gudiño Rubiolo**

En pantalla: el párrafo sobre la elección de entrevistas y cinco tarjetas: directivos, administrativos, docentes, auxiliares y sistemas.

Antes de diseñar nada, la guía de la cátedra nos pidió conocer al usuario y elegir entre una encuesta y entrevistas. Elegimos entrevistas estructuradas, con un representante de cada perfil, porque queríamos entender las frustraciones en detalle. Pedimos solo los datos necesarios.

[Recorrer las cinco tarjetas.] Cada perfil nos dejó algo distinto:
- Los directivos querían ver el ausentismo semanal y enterarse apenas un docente avisa una falta.
- Administración necesitaba exportar a Excel y PDF, y cargar los horarios de forma masiva.
- Los docentes querían fichar hasta diez minutos antes de entrar al aula y avisar una ausencia al instante.
- Los auxiliares pidieron pocos clics.
- Y sistemas fue claro: tenía que funcionar sin internet y sincronizar después.

Federico les cuenta qué hicimos con esa información.

### Diapositiva 4. Qué se abordó en el proyecto (1 minuto)
**Habla: Federico Bruno**

En pantalla: la lista de lo que se trabajó y, al costado, el diagrama de clases.

[Recorrer la lista.] Con esa información seguimos el proceso de la materia: definimos el problema, hicimos las entrevistas y analizamos a los interesados con la matriz de poder e interés. Escribimos un backlog de once historias de usuario en formato «Como, quiero, para», y de ahí salieron los requisitos funcionales, los no funcionales y los de accesibilidad. Hicimos la matriz FODA, la matriz de riesgos y los casos de uso, y terminamos con el prototipo y las pruebas.

[Señalar el diagrama.] Este es el diagrama de clases. Los diagramas UML, los de casos de uso, el de clases y el entidad-relación, los hicimos en draw.io, y las descripciones las escribimos en Google Docs para revisarlas en equipo.

Alex les presenta la solución.

### Diapositiva 5. ASISTAPP: fichar desde el celular (1 minuto)
**Habla: Alex Combina**

En pantalla: cuatro puntos con las funciones y la captura «Pantalla de validación exitosa de ingreso».

La solución es una aplicación web pensada para usarse desde el celular.

[Señalar la captura.] Esta es la pantalla de validación. El personal ficha escaneando el código QR de la entrada y la aplicación verifica tres cosas: la ubicación por GPS, la red y el horario. Cuando las tres dan bien, como acá, el ingreso queda registrado.

[Recorrer los otros puntos.] Si alguien llega tarde, se genera una alerta automática, y el docente puede avisar que va a faltar. Las justificaciones se cargan con un rango de fechas y una foto del certificado, y se aprueban o rechazan con un motivo. Además hay un calendario del ciclo lectivo y reportes que se exportan a Excel y PDF.

### Diapositiva 6. Qué problemas resuelve (1 minuto)
**Habla: Alex Combina**

En pantalla: una tabla de dos columnas, «Situación anterior (manual)» y «Con ASISTAPP», con cinco filas.

Acá comparamos la situación anterior con lo que cambia con ASISTAPP. [Leer cada fila de izquierda a derecha.]
- El registro en planillas de papel pasa a ser un fichaje digital verificable e instantáneo.
- Los avisos informales por mensajes pasan a ser un aviso temprano con alerta directa a los directivos.
- Los certificados que llegaban con días de retraso ahora se cargan con una foto el mismo día.
- Las tardanzas que se detectaban recién a fin de semana se notifican en el momento.
- Y la consolidación manual para liquidar sueldos se reemplaza por la exportación a Excel y PDF.

Matías Borsatto les cuenta cómo se usa.

### Diapositiva 7. La aplicación en uso (1 minuto)
**Habla: Matías Borsatto**

En pantalla: los cuatro perfiles, el funcionamiento sin internet, el dato «Fichaje procesado en 0,51 s» con el objetivo de menos de 3 segundos, y dos capturas: el inicio del administrador y el fichaje sin conexión.

La aplicación tiene cuatro perfiles: administrador, preceptor, profesor y alumno. [Señalar la captura del inicio.] Cada uno entra a un menú distinto que pregunta «¿Qué necesitás hacer?», para que nadie necesite un manual.

[Señalar la captura del fichaje sin conexión.] Algo que pidió sistemas y que consideramos crítico: si se corta internet, el fichaje no se pierde. Queda guardado en el celular y se envía solo cuando vuelve la conexión.

[Señalar el número.] Y medimos la velocidad: el objetivo era menos de tres segundos, y el fichaje se procesó en 0,51 segundos.

Cristian les cuenta los problemas técnicos que encontramos.

### Diapositiva 8. Problemas técnicos y cómo se resolvieron (1 minuto y 30 segundos)
**Habla: Cristian Figueroa**

En pantalla: cinco tarjetas: conectividad, horarios, seguridad, dependencias y estándares.

En el camino aparecieron problemas que tuvimos que resolver. [Recorrer las tarjetas en orden.]
- Conectividad: el navegador no permite leer a qué red Wi-Fi está conectado el celular. Por eso en el prototipo la red está simulada; con una aplicación nativa sí se podría leer.
- Horarios: los docentes no tienen un horario fijo, van a dar sus clases. Entonces el fichaje del docente se mide contra la clase que le toca.
- Seguridad: una foto del QR podía usarse fuera de la escuela. Lo resolvimos combinando QR, ubicación, red y horario, y con un código en pantalla que cambia cada treinta segundos.
- Dependencias: algunas librerías tenían vulnerabilidades. Las actualizamos y la auditoría quedó en cero.
- Estándares: encontramos fallas de accesibilidad. Las corregimos y la prueba automática quedó sin errores.

Sergio les cuenta cómo lo probamos.

### Diapositiva 9. Pruebas y límites (1 minuto)
**Habla: Sergio Rios**

En pantalla: dos columnas: «Aprobadas en el navegador» y «No implementado y riesgo abierto».

[Señalar la columna de la izquierda.] Probamos cada flujo en el navegador: el fichaje con y sin conexión y el GPS, las justificaciones, el aviso temprano, el calendario, los reportes y la accesibilidad. Todas las pruebas que ejecutamos resultaron aprobadas.

[Señalar la columna de la derecha.] También queremos ser claros con lo que no está. La integración con CIDI y con SIU Guaraní no se puede implementar libremente porque son sistemas oficiales; lo que sí hicimos es una exportación semanal con el formato para cargar las novedades en CIDI. Tampoco implementamos la biometría ni las notificaciones por WhatsApp. Y tenemos identificado un riesgo abierto: proteger la privacidad de los datos en la versión conectada a la base real.

### Diapositiva 10. Próximos pasos (30 segundos)
**Habla: Sergio Rios**

En pantalla: cuatro pasos numerados y el cierre «¡Gracias! ¿Preguntas?».

[Recorrer los pasos del 01 al 04.] Los próximos pasos son llevar el fichaje y las justificaciones a la base de datos real, cerrar el riesgo de privacidad, sumar notificaciones push y hacer pruebas con usuarios.

[Si la diapositiva todavía dice «¿Preguntas?»:] Las preguntas las dejamos para el final, porque ahora les mostramos la aplicación funcionando. Empieza Matías Bogliotti.

[Cambiar a la pestaña del navegador con la aplicación abierta.]

## Parte 2: la aplicación funcionando
Sigue la división que ya tenía el equipo.

| # | Integrante | Perfil y pantallas | Qué mostrar (caso de uso) |
|---|---|---|---|
| 1 | Matías Bogliotti | Inicio y Administrador → Panel general | Presenta el problema y el acceso rápido por perfil (Loguearse). Muestra los indicadores del día y las justificaciones pendientes. |
| 2 | Tomás Gudiño Rubiolo | Administrador → Gestionar asistencia y Consultar historial | Revisar los fichajes del día (aparecen solos con la etiqueta «por QR»), confirmar los que quedaron «pendientes de validar», corregir el estado de una persona y filtrar el historial por persona y estado. |
| 3 | Federico Bruno | Administrador → Justificaciones | Solicitar una justificación, aprobar o rechazar (con aviso a la persona), y el menú de tres puntos: ver detalle, editar y eliminar con confirmación. |
| 4 | Alex Combina | Administrador → Administrar usuarios y Reportes | Alta con validación de datos y acciones por usuario. En Reportes: la torta, los indicadores, «Ver como tabla» (accesibilidad) y exportar PDF/Excel. |
| 5 | Matías Borsatto | Administrador → Configuración y Registrar mi asistencia | Cómo el sistema decide solo: tolerancia de tardanza, plazo de fichaje, cómo se valida (GPS o Wi-Fi) y espera máxima, radio y redes autorizadas, QR de ingreso que genera el administrador (imprimir y descargar) y horarios por persona. Guarda los cambios y muestra que los administrativos no tienen tardanza. |
| 6 | Cristian Figueroa | Preceptor → Gestionar asistencia, Historial, Justificaciones y Reportes | Validar curso y sección antes de pasar lista, marcar alumnos y guardar. Historial completo, justificación con documentación adjunta y reporte por curso. |
| 7 | Sergio Rios | Profesor → Registrar asistencia QR, Aviso de inasistencia, Mi historial; después Alumno completo | El profesor escanea con la cámara de su celular el QR de la puerta: a horario, con tardanza, fuera del perímetro, red no autorizada, fuera de plazo, código vencido y GPS que no responde (queda pendiente sin perder tiempo). Aviso con certificado médico. Alumno: historial, «Descargar resumen» y notificaciones. Cierra con el repaso de los casos de uso. |

**Para tener en cuenta durante la demostración**
- La diapositiva 9 anuncia la exportación semanal para CIDI. Conviene que Alex la muestre en Reportes (pestaña «Para CIDI»), después de exportar a PDF y Excel.
- No recarguen la página: los datos de la demostración viven en memoria y se pierden al recargar. Para cambiar de perfil, usen «Cerrar sesión».

## Si algo falla durante la demostración
- **No hay internet:** tener la aplicación compilada en la computadora (`npm run build` y servir la carpeta `out`) o, como último recurso, mostrar las capturas de la tesis (sección 6.9).
- **La cámara no abre:** usar «Escaneo simulado». El navegador puede bloquear la cámara si no se dio permiso.
- **Se recargó la página por error:** se pierden los cambios de la demostración. Volver a entrar y seguir desde el paso que corresponda.
- **El GPS real:** no lo usen en vivo salvo que lo hayan probado antes en esa computadora. Requiere cargar el punto de la escuela en Configuración y dar permiso de ubicación.

Las preguntas probables del profesor, con respuestas sugeridas, están en el Anexo G de la tesis.

import {
  Bell,
  CalendarDays,
  ClipboardCheck,
  FileCheck2,
  FileText,
  History,
  Home,
  MailWarning,
  QrCode,
  Send,
  Settings2,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'

// Fuente de verdad: Proyecto/Casos de uso/Casos de uso Editados + CASOS DE USO MEJORADOS (2)
export type Role = 'Administrador' | 'Preceptor' | 'Profesor' | 'Alumno'

export type ViewId =
  | 'inicio'
  | 'gestion-asistencia'
  | 'registrar-qr'
  | 'aviso'
  | 'historial'
  | 'justificaciones'
  | 'justificar'
  | 'usuarios'
  | 'reportes'
  | 'notificaciones'
  | 'calendario'
  | 'fichar'
  | 'configuracion'

export type NavItem = {
  id: ViewId
  label: string
  icon: LucideIcon
  /** Caso de uso principal que cubre la vista (para trazabilidad) */
  useCase: string
  /** Casos de uso incluidos / extendidos resueltos dentro de la vista */
  related?: string[]
  /** Frase corta que explica para qué sirve la pantalla y qué hacer primero */
  ayuda?: string
}

export type RoleConfig = {
  role: Role
  user: string
  initials: string
  detail: string
  description: string
  nav: NavItem[]
}

const calendario: NavItem = { id: 'calendario', label: 'Calendario', icon: CalendarDays, useCase: 'Calendario del ciclo lectivo', ayuda: 'Tocá cualquier día para ver si hay clases, si es feriado y qué ausencias hay registradas.' }

export const roles: Record<Role, RoleConfig> = {
  Administrador: {
    role: 'Administrador',
    user: 'Sofía López',
    initials: 'SL',
    detail: 'Administración · Escuela Modelo',
    description: 'Administra usuarios, asistencia, justificaciones y reportes institucionales.',
    nav: [
      { id: 'inicio', label: 'Inicio', icon: Home, useCase: 'Resumen institucional', ayuda: 'Acá ves lo más importante del día y lo que está esperando tu revisión.' },
      { id: 'gestion-asistencia', label: 'Asistencia de hoy', icon: ClipboardCheck, useCase: 'Gestionar asistencia', ayuda: 'Revisá quién llegó y corregí un estado tocando Presente, Tardanza o Ausente. Los fichajes por QR aparecen solos.' },
      { id: 'historial', label: 'Historial', icon: History, useCase: 'Consultar historial', ayuda: 'Elegí una persona para ver todas sus asistencias, tardanzas y ausencias.' },
      { id: 'justificaciones', label: 'Justificaciones', icon: FileCheck2, useCase: 'Solicitar y gestionar justificaciones', related: ['Notificar resolución (extend)'], ayuda: 'Las que están “Para revisar” esperan tu decisión: aprobalas o rechazalas y la persona recibe el aviso.' },
      { id: 'usuarios', label: 'Personas', icon: UsersRound, useCase: 'Administrar usuarios', related: ['Validar datos de usuario (include)'], ayuda: 'Da de alta, editá, desactivá o eliminá a las personas de la escuela.' },
      { id: 'reportes', label: 'Reportes', icon: FileText, useCase: 'Generar reportes de asistencia', related: ['Exportar a PDF / Excel (extend)'], ayuda: 'Elegí el período y descargá el reporte en Excel o PDF, con nombres y fechas.' },
      calendario,
      { id: 'fichar', label: 'Mi asistencia', icon: QrCode, useCase: 'Registrar asistencia QR', related: ['Validar geolocalización / Wi-Fi (include)'], ayuda: 'Fichá tu entrada escaneando el código QR de la puerta.' },
      { id: 'configuracion', label: 'Configuración', icon: Settings2, useCase: 'Configuración del sistema', related: ['Reglas de tardanza', 'Horarios del personal', 'Ciclo lectivo y feriados', 'Ubicación y redes Wi-Fi', 'Código QR de ingreso'], ayuda: 'Definí cuándo se considera tarde, los horarios, el calendario y el código QR. Guardá los cambios al terminar.' },
    ],
  },
  Preceptor: {
    role: 'Preceptor',
    user: 'Laura Benítez',
    initials: 'LB',
    detail: 'Preceptoría · 4° Año',
    description: 'Controla la asistencia de sus cursos y gestiona las justificaciones de los alumnos.',
    nav: [
      { id: 'inicio', label: 'Inicio', icon: Home, useCase: 'Resumen de preceptoría', ayuda: 'Empezá por acá: te mostramos lo que tenés para hacer hoy.' },
      { id: 'gestion-asistencia', label: 'Pasar lista', icon: ClipboardCheck, useCase: 'Gestionar asistencia', related: ['Validar curso y sección (include)'], ayuda: 'Primero elegí el curso y tocá “Validar”. Después marcá a cada alumno y guardá.' },
      { id: 'historial', label: 'Historial', icon: History, useCase: 'Consultar historial personal y completo', ayuda: 'Elegí un alumno para ver su asistencia.' },
      { id: 'justificaciones', label: 'Justificaciones', icon: FileCheck2, useCase: 'Gestionar justificaciones', related: ['Adjuntar documentación / certificado (extend)'], ayuda: 'Los alumnos te envían sus justificaciones acá, con la foto del certificado. Aprobalas o rechazalas.' },
      { id: 'reportes', label: 'Reportes', icon: FileText, useCase: 'Generar reportes de asistencia', related: ['Exportar a PDF / Excel (extend)'], ayuda: 'Elegí el curso y el período, y descargá la asistencia alumno por alumno.' },
      calendario,
      { id: 'fichar', label: 'Mi asistencia', icon: QrCode, useCase: 'Registrar asistencia QR', related: ['Validar geolocalización / Wi-Fi (include)', 'Generar alerta de tardanza (extend)'], ayuda: 'Fichá tu entrada escaneando el código QR de la puerta.' },
    ],
  },
  Profesor: {
    role: 'Profesor',
    user: 'María González',
    initials: 'MG',
    detail: 'Docente · Nivel Secundario',
    description: 'Registra su asistencia por QR, avisa inasistencias y consulta su historial.',
    nav: [
      { id: 'inicio', label: 'Inicio', icon: Home, useCase: 'Resumen del docente', ayuda: 'Acá ves tus clases de hoy y lo que tenés que hacer.' },
      { id: 'registrar-qr', label: 'Fichar entrada', icon: QrCode, useCase: 'Registrar asistencia QR', related: ['Validar geolocalización / Wi-Fi (include)', 'Generar alerta de tardanza (extend)'], ayuda: 'Al llegar a la escuela, tocá el recuadro de la cámara y apuntá al código QR de la puerta.' },
      { id: 'aviso', label: 'Avisar que no voy', icon: MailWarning, useCase: 'Enviar aviso temprano de inasistencia', related: ['Adjuntar certificado médico (extend)'], ayuda: 'Indicá desde qué día hasta qué día vas a faltar y el motivo. Administración lo recibe al instante.' },
      { id: 'historial', label: 'Mi historial', icon: History, useCase: 'Consultar historial personal', ayuda: 'Tus asistencias, tardanzas y ausencias.' },
      calendario,
    ],
  },
  Alumno: {
    role: 'Alumno',
    user: 'Tomás Ríos',
    initials: 'TR',
    detail: 'Alumno · 4° B',
    description: 'Consulta su asistencia, justifica sus faltas y recibe avisos.',
    nav: [
      { id: 'inicio', label: 'Inicio', icon: Home, useCase: 'Resumen del alumno', ayuda: 'Mirá cómo viene tu asistencia y justificá una falta si la necesitás.' },
      { id: 'justificar', label: 'Justificar una falta', icon: Send, useCase: 'Justificar inasistencia', related: ['Adjuntar imagen del certificado', 'Enviar al preceptor'], ayuda: 'Elegí los días que faltaste, el motivo y sacá una foto del certificado. Se la enviás directo a tu preceptora.' },
      { id: 'historial', label: 'Mi asistencia', icon: History, useCase: 'Consultar historial personal', related: ['Descargar resumen de asistencias (extend)'], ayuda: 'Tus presentes, tardanzas y faltas. Podés descargar un resumen en PDF.' },
      calendario,
      { id: 'notificaciones', label: 'Avisos', icon: Bell, useCase: 'Recibir notificaciones de inasistencia / tardanza', ayuda: 'Acá te avisamos si registraron una falta o si respondieron tus justificaciones.' },
    ],
  },
}

export const roleOrder: Role[] = ['Administrador', 'Preceptor', 'Profesor', 'Alumno']

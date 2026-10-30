import {
  Bell,
  ClipboardCheck,
  FileCheck2,
  FileText,
  History,
  LayoutDashboard,
  MailWarning,
  QrCode,
  Settings2,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'

// Fuente de verdad: Proyecto/Casos de uso/Casos de uso Editados + CASOS DE USO MEJORADOS (2)
export type Role = 'Administrador' | 'Preceptor' | 'Profesor' | 'Alumno'

export type ViewId =
  | 'panel'
  | 'gestion-asistencia'
  | 'registrar-qr'
  | 'aviso'
  | 'historial'
  | 'justificaciones'
  | 'usuarios'
  | 'reportes'
  | 'notificaciones'
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
}

export type RoleConfig = {
  role: Role
  user: string
  initials: string
  detail: string
  description: string
  nav: NavItem[]
}

export const roles: Record<Role, RoleConfig> = {
  Administrador: {
    role: 'Administrador',
    user: 'Sofía López',
    initials: 'SL',
    detail: 'Administración · Escuela Modelo',
    description: 'Administra usuarios, asistencia, justificaciones y reportes institucionales.',
    nav: [
      { id: 'panel', label: 'Panel general', icon: LayoutDashboard, useCase: 'Resumen institucional' },
      { id: 'gestion-asistencia', label: 'Gestionar asistencia', icon: ClipboardCheck, useCase: 'Gestionar asistencia' },
      { id: 'historial', label: 'Consultar historial', icon: History, useCase: 'Consultar historial' },
      { id: 'justificaciones', label: 'Justificaciones', icon: FileCheck2, useCase: 'Solicitar y gestionar justificaciones', related: ['Notificar resolución (extend)'] },
      { id: 'usuarios', label: 'Administrar usuarios', icon: UsersRound, useCase: 'Administrar usuarios', related: ['Validar datos de usuario (include)'] },
      { id: 'reportes', label: 'Reportes', icon: FileText, useCase: 'Generar reportes de asistencia', related: ['Exportar a PDF / Excel (extend)'] },
      { id: 'fichar', label: 'Registrar mi asistencia', icon: QrCode, useCase: 'Registrar asistencia QR', related: ['Validar geolocalización / Wi-Fi (include)'] },
      { id: 'configuracion', label: 'Configuración', icon: Settings2, useCase: 'Configuración del sistema', related: ['Reglas de tardanza', 'Horarios del personal', 'Ubicación y redes Wi-Fi', 'Código QR de ingreso'] },
    ],
  },
  Preceptor: {
    role: 'Preceptor',
    user: 'Laura Benítez',
    initials: 'LB',
    detail: 'Preceptoría · 4° Año',
    description: 'Controla la asistencia de sus cursos y gestiona justificaciones con documentación.',
    nav: [
      { id: 'gestion-asistencia', label: 'Gestionar asistencia', icon: ClipboardCheck, useCase: 'Gestionar asistencia', related: ['Validar curso y sección (include)'] },
      { id: 'historial', label: 'Historial completo', icon: History, useCase: 'Consultar historial personal y completo' },
      { id: 'justificaciones', label: 'Justificaciones', icon: FileCheck2, useCase: 'Gestionar justificaciones', related: ['Adjuntar documentación / certificado (extend)'] },
      { id: 'reportes', label: 'Reportes', icon: FileText, useCase: 'Generar reportes de asistencia', related: ['Exportar a PDF / Excel (extend)'] },
      { id: 'fichar', label: 'Registrar mi asistencia', icon: QrCode, useCase: 'Registrar asistencia QR', related: ['Validar geolocalización / Wi-Fi (include)', 'Generar alerta de tardanza (extend)'] },
    ],
  },
  Profesor: {
    role: 'Profesor',
    user: 'María González',
    initials: 'MG',
    detail: 'Docente · Nivel Secundario',
    description: 'Registra su asistencia por QR, avisa inasistencias y consulta su historial.',
    nav: [
      { id: 'registrar-qr', label: 'Registrar asistencia QR', icon: QrCode, useCase: 'Registrar asistencia QR', related: ['Validar geolocalización / Wi-Fi (include)', 'Generar alerta de tardanza (extend)'] },
      { id: 'aviso', label: 'Aviso de inasistencia', icon: MailWarning, useCase: 'Enviar aviso temprano de inasistencia', related: ['Adjuntar certificado médico (extend)'] },
      { id: 'historial', label: 'Mi historial', icon: History, useCase: 'Consultar historial personal' },
    ],
  },
  Alumno: {
    role: 'Alumno',
    user: 'Tomás Ríos',
    initials: 'TR',
    detail: 'Alumno · 4° B',
    description: 'Consulta su asistencia, recibe avisos de inasistencia/tardanza y descarga su resumen.',
    nav: [
      { id: 'historial', label: 'Mi historial', icon: History, useCase: 'Consultar historial personal', related: ['Descargar resumen de asistencias (extend)'] },
      { id: 'notificaciones', label: 'Notificaciones', icon: Bell, useCase: 'Recibir notificaciones de inasistencia / tardanza' },
    ],
  },
}

export const roleOrder: Role[] = ['Administrador', 'Preceptor', 'Profesor', 'Alumno']

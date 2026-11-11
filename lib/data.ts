export type Tone = 'success' | 'warning' | 'danger' | 'blue'

export type Justification = {
  id: number
  name: string
  initials: string
  /** Primer día de la ausencia o licencia (AAAA-MM-DD) */
  desde: string
  /** Último día (AAAA-MM-DD). Si es un solo día, es igual a "desde" */
  hasta: string
  reason: string
  /** Quién la inició: Alumno, Aviso temprano, Preceptoría, Administración */
  origin: string
  /** personal: docentes y no docentes (los revisa Administración) · alumno: los revisa el Preceptor */
  ambito: 'personal' | 'alumno'
  curso?: string
  status: 'Pendiente' | 'Aprobado' | 'Rechazado'
  attachment?: string
  /** Foto o imagen del certificado (data URL) */
  imagen?: string
  comentario?: string
  /** Motivo del rechazo, que se le informa a quien la envió */
  respuesta?: string
}

export type AppUser = {
  id: string
  name: string
  initials: string
  role: 'Profesor' | 'Preceptor' | 'Alumno' | 'Administrador'
  area: string
  email: string
  active: boolean
}

export type HistoryRecord = { date: string; entry: string; exit: string; status: string; tone: Tone; note: string }

const hoyIso = () => new Date().toISOString().slice(0, 10)
const dia = (n: number) => { const d = new Date(hoyIso() + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }

/** Datos de ejemplo, siempre cercanos a la fecha de hoy para que se vean en el calendario. */
export const initialJustifications = (): Justification[] => [
  { id: 1, name: 'Ana Martínez', initials: 'AM', desde: dia(-8), hasta: dia(-6), reason: 'Licencia médica', origin: 'Aviso temprano', ambito: 'personal', status: 'Pendiente', attachment: 'certificado-medico.pdf' },
  { id: 2, name: 'Carlos Rodríguez', initials: 'CR', desde: dia(-9), hasta: dia(-9), reason: 'Trámite personal', origin: 'Administración', ambito: 'personal', status: 'Pendiente' },
  { id: 3, name: 'Laura Gómez', initials: 'LG', desde: dia(-9), hasta: dia(-8), reason: 'Enfermedad', origin: 'Aviso temprano', ambito: 'personal', status: 'Pendiente', attachment: 'receta.jpg' },
  { id: 4, name: 'Jorge Fernández', initials: 'JF', desde: dia(-12), hasta: dia(-12), reason: 'Comisión de servicio', origin: 'Administración', ambito: 'personal', status: 'Aprobado' },
  { id: 5, name: 'Mariano Paz', initials: 'MP', desde: dia(-20), hasta: dia(-20), reason: 'Motivo no acreditado', origin: 'Administración', ambito: 'personal', status: 'Rechazado', respuesta: 'No se presentó documentación.' },
  { id: 6, name: 'Tomás Ríos', initials: 'TR', desde: dia(-2), hasta: dia(-2), reason: 'Control médico', origin: 'Alumno', ambito: 'alumno', curso: '4° B', status: 'Pendiente', comentario: 'Tenía turno con el pediatra.' },
  { id: 7, name: 'Julieta Sosa', initials: 'JS', desde: dia(-5), hasta: dia(-3), reason: 'Enfermedad (gripe)', origin: 'Alumno', ambito: 'alumno', curso: '4° B', status: 'Aprobado' },
  { id: 8, name: 'Mateo Villalba', initials: 'MV', desde: dia(-10), hasta: dia(-10), reason: 'Trámite familiar', origin: 'Alumno', ambito: 'alumno', curso: '4° B', status: 'Rechazado', respuesta: 'Falta el comprobante del trámite.' },
]

export const initialUsers: AppUser[] = [
  { id: 'AG-00125', name: 'María González', initials: 'MG', role: 'Profesor', area: 'Nivel Secundario', email: 'maria.gonzalez@escuelamodelo.edu.ar', active: true },
  { id: 'AG-00098', name: 'Carlos Rodríguez', initials: 'CR', role: 'Profesor', area: 'Nivel Primario', email: 'carlos.rodriguez@escuelamodelo.edu.ar', active: true },
  { id: 'AG-00141', name: 'Ana Martínez', initials: 'AM', role: 'Profesor', area: 'Nivel Secundario', email: 'ana.martinez@escuelamodelo.edu.ar', active: false },
  { id: 'PR-00012', name: 'Laura Benítez', initials: 'LB', role: 'Preceptor', area: '4° Año', email: 'laura.benitez@escuelamodelo.edu.ar', active: true },
  { id: 'AL-04021', name: 'Tomás Ríos', initials: 'TR', role: 'Alumno', area: '4° B', email: 'tomas.rios@escuelamodelo.edu.ar', active: true },
]

export const courses: Record<string, { id: string; name: string; initials: string }[]> = {
  '4° A': [
    { id: 'AL-04001', name: 'Valentina Acosta', initials: 'VA' },
    { id: 'AL-04002', name: 'Joaquín Benegas', initials: 'JB' },
    { id: 'AL-04003', name: 'Camila Duarte', initials: 'CD' },
  ],
  '4° B': [
    { id: 'AL-04021', name: 'Tomás Ríos', initials: 'TR' },
    { id: 'AL-04022', name: 'Julieta Sosa', initials: 'JS' },
    { id: 'AL-04023', name: 'Mateo Villalba', initials: 'MV' },
  ],
  '5° A': [
    { id: 'AL-05001', name: 'Lucía Herrera', initials: 'LH' },
    { id: 'AL-05002', name: 'Bruno Navarro', initials: 'BN' },
  ],
}

// Los datos de ejemplo usan los últimos días hábiles, así siempre se ven recientes y coinciden con el calendario.
const habiles = (() => { const out: Date[] = []; const d = new Date(); while (out.length < 8) { d.setDate(d.getDate() - 1); if (d.getDay() % 6) out.push(new Date(d)) } return out })()
const MES_CORTO = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sep.', 'oct.', 'nov.', 'dic.']
const corta = (d: Date) => `${d.getDate()} ${MES_CORTO[d.getMonth()]} ${d.getFullYear()}`
const larga = (d: Date) => d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })
const haceDias = (d: Date) => { const n = Math.round((new Date().setHours(12) - new Date(d).setHours(12)) / 86400000); return n === 1 ? 'Ayer' : `Hace ${n} días` }

export const personalHistory: HistoryRecord[] = [
  { date: corta(habiles[0]), entry: '08:02', exit: '17:05', status: 'Presente', tone: 'success', note: '—' },
  { date: corta(habiles[1]), entry: '08:16', exit: '17:00', status: 'Tardanza', tone: 'warning', note: 'Alerta de tardanza generada' },
  { date: corta(habiles[2]), entry: '—', exit: '—', status: 'Ausente', tone: 'danger', note: 'Aviso temprano · Licencia médica' },
  { date: corta(habiles[3]), entry: '07:58', exit: '17:10', status: 'Presente', tone: 'success', note: '—' },
  { date: corta(habiles[4]), entry: '08:01', exit: '16:55', status: 'Presente', tone: 'success', note: '—' },
]

export const alumnoNotifications = [
  { title: 'Inasistencia registrada', msg: `Se registró tu inasistencia del ${larga(habiles[2])}. Podés justificarla en preceptoría.`, time: haceDias(habiles[2]), tone: 'warning' as Tone },
  { title: 'Tardanza registrada', msg: `Ingresaste a las 08:16 el ${larga(habiles[1])} (tolerancia hasta las 08:10).`, time: haceDias(habiles[1]), tone: 'warning' as Tone },
  { title: 'Justificación aprobada', msg: `Tu justificación del ${larga(habiles[7])} fue aprobada.`, time: haceDias(habiles[6]), tone: 'success' as Tone },
]
/** «noviembre de 2026» */
export const mesActual = () => new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

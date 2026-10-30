export type Tone = 'success' | 'warning' | 'danger' | 'blue'

export type Justification = {
  id: number
  name: string
  initials: string
  date: string
  reason: string
  origin: string
  status: 'Pendiente' | 'Aprobado' | 'Rechazado'
  attachment?: string
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

export const initialJustifications: Justification[] = [
  { id: 1, name: 'Ana Martínez', initials: 'AM', date: '22 oct.', reason: 'Licencia médica', origin: 'Aviso temprano', status: 'Pendiente', attachment: 'certificado-medico.pdf' },
  { id: 2, name: 'Carlos Rodríguez', initials: 'CR', date: '21 oct.', reason: 'Trámite personal', origin: 'Preceptoría', status: 'Pendiente' },
  { id: 3, name: 'Laura Gómez', initials: 'LG', date: '21 oct.', reason: 'Enfermedad', origin: 'Aviso temprano', status: 'Pendiente', attachment: 'receta.jpg' },
  { id: 4, name: 'Jorge Fernández', initials: 'JF', date: '18 oct.', reason: 'Comisión de servicio', origin: 'Administración', status: 'Aprobado' },
  { id: 5, name: 'Mariano Paz', initials: 'MP', date: '10 oct.', reason: 'Motivo no acreditado', origin: 'Preceptoría', status: 'Rechazado' },
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

export const personalHistory: HistoryRecord[] = [
  { date: '24 oct. 2024', entry: '08:02', exit: '17:05', status: 'Presente', tone: 'success', note: '—' },
  { date: '23 oct. 2024', entry: '08:16', exit: '17:00', status: 'Tardanza', tone: 'warning', note: 'Alerta de tardanza generada' },
  { date: '22 oct. 2024', entry: '—', exit: '—', status: 'Ausente', tone: 'danger', note: 'Aviso temprano · Licencia médica' },
  { date: '21 oct. 2024', entry: '07:58', exit: '17:10', status: 'Presente', tone: 'success', note: '—' },
  { date: '18 oct. 2024', entry: '08:01', exit: '16:55', status: 'Presente', tone: 'success', note: '—' },
]

export const alumnoNotifications = [
  { title: 'Inasistencia registrada', msg: 'Se registró tu inasistencia del 22 de octubre. Podés justificarla en preceptoría.', time: 'Hace 2 días', tone: 'warning' as Tone },
  { title: 'Tardanza registrada', msg: 'Ingresaste a las 08:16 el 23 de octubre (tolerancia hasta las 08:10).', time: 'Hace 1 día', tone: 'warning' as Tone },
  { title: 'Justificación aprobada', msg: 'Tu justificación del 10 de octubre fue aprobada.', time: '12 oct.', tone: 'success' as Tone },
]

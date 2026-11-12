import type { Role } from './roles'

// Reglas de fichaje de la demostración: se comportan como lo haría el sistema funcionando al 100 %.

export type DiaSemana = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes'
export const DIAS: { id: DiaSemana; nombre: string; corto: string }[] = [
  { id: 'lunes', nombre: 'Lunes', corto: 'Lun' }, { id: 'martes', nombre: 'Martes', corto: 'Mar' },
  { id: 'miercoles', nombre: 'Miércoles', corto: 'Mié' }, { id: 'jueves', nombre: 'Jueves', corto: 'Jue' },
  { id: 'viernes', nombre: 'Viernes', corto: 'Vie' },
]
export type Franja = { entrada: string; salida: string }
/** Duración de una materia: todo el ciclo lectivo o sólo uno de los dos cuatrimestres. */
export type Periodo = 'anual' | 'c1' | 'c2'
export const PERIODOS: { id: Periodo; nombre: string; corto: string }[] = [
  { id: 'anual', nombre: 'Anual', corto: 'Anual' }, { id: 'c1', nombre: '1° cuatrimestre', corto: '1° C' }, { id: 'c2', nombre: '2° cuatrimestre', corto: '2° C' },
]
/** Una clase de un docente: va, la da y se va. Si no indica período, es anual. */
export type Clase = Franja & { materia: string; periodo?: Periodo }
export type HorarioPersona = Partial<Record<DiaSemana, Franja>>
export type TipoPersonal = 'docente' | 'preceptor' | 'administrativo'

export type Persona = {
  id: string
  nombre: string
  iniciales: string
  cargo: string
  tipo: TipoPersonal
  /** Sólo docentes: sus clases de cada día (no tienen un horario fijo, van a dar sus clases) */
  clases?: Partial<Record<DiaSemana, Clase[]>>
}
export type ReglasFichaje = {
  /** Minutos de gracia después de la hora de entrada antes de contar tardanza */
  tolerancia: number
  /** Cuántos minutos antes de la entrada se puede empezar a fichar */
  minutosAntes: number
  /** Hasta cuántos minutos después de la entrada se acepta el fichaje (luego se considera ausente) */
  minutosDespues: number
  lugar: string
  /** Radio permitido alrededor de la escuela, en metros */
  radio: number
  redes: string[]
  /** 'una': alcanza con que GPS o Wi-Fi validen. 'ambas': deben validar los dos. */
  modo: 'una' | 'ambas'
  /** Segundos máximos que se espera una validación antes de guardar el fichaje como pendiente */
  tiempoMaximo: number
  /** 'fijo': se imprime una sola vez. 'pantalla': una tablet en la puerta muestra un código que se renueva solo. */
  qrModo: 'fijo' | 'pantalla'
  /** Sube cada vez que se regenera el código: el impreso anterior deja de servir */
  qrVersion: number
  /** Punto de la escuela para medir la distancia con el GPS real del celular (null: todavía no se cargó) */
  punto: { lat: number; lng: number } | null
}
/** Preceptores y administrativos tienen un horario fijo, que se define por ROL. Los docentes tienen sus clases (por persona). */
export type RolConHorario = 'preceptor' | 'administrativo'
export type Feriado = { fecha: string; nombre: string }
export type ConfigDemo = {
  reglas: ReglasFichaje
  horarios: Record<RolConHorario, HorarioPersona>
  personal: Persona[]
  /** Ciclo lectivo: primer y último día de clases, y el día en que empieza el 2° cuatrimestre (AAAA-MM-DD) */
  ciclo: { inicio: string; fin: string; segundoCuatrimestre: string }
  /** Feriados y recesos: esos días no hay clases */
  feriados: Feriado[]
}

const semana = (entrada: string, salida: string, dias: DiaSemana[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']): HorarioPersona =>
  Object.fromEntries(dias.map(d => [d, { entrada, salida }])) as HorarioPersona

const MAT_LMV: Clase[] = [{ entrada: '08:00', salida: '09:20', materia: 'Matemática 4° A' }, { entrada: '09:30', salida: '10:50', materia: 'Matemática 5° B' }]
const MAT_MJ: Clase[] = [{ entrada: '10:00', salida: '11:20', materia: 'Matemática 4° B' }]
const LEN: Clase[] = [{ entrada: '13:30', salida: '14:50', materia: 'Lengua 3° A' }, { entrada: '15:00', salida: '16:20', materia: 'Lengua 3° B' }]
const BIO: Clase[] = [{ entrada: '08:00', salida: '09:20', materia: 'Biología 4° A' }, { entrada: '10:00', salida: '11:20', materia: 'Biología 5° A' }]
// Materias cuatrimestrales: el mismo horario lo ocupa una materia en el 1° cuatrimestre y otra en el 2°.
const TALLER: Clase[] = [
  { entrada: '13:30', salida: '14:50', materia: 'Taller de Estadística 6° A', periodo: 'c1' },
  { entrada: '13:30', salida: '14:50', materia: 'Taller de Programación 6° A', periodo: 'c2' },
]

/** Feriados de ejemplo de un año (fechas de 2026; en la versión real se cargan cada año). */
function feriadosEjemplo(y: number): Feriado[] {
  const d = (m: number, dd: number, nombre: string): Feriado => ({ fecha: `${y}-${String(m).padStart(2, '0')}-${String(dd).padStart(2, '0')}`, nombre })
  const receso: Feriado[] = []
  for (let dd = 20; dd <= 31; dd++) { const wd = new Date(y, 6, dd).getDay(); if (wd !== 0 && wd !== 6) receso.push(d(7, dd, 'Receso invernal')) }
  return [d(1, 1, 'Año Nuevo'), d(2, 16, 'Carnaval'), d(2, 17, 'Carnaval'), d(3, 24, 'Día de la Memoria'), d(4, 2, 'Día de Malvinas'), d(4, 3, 'Viernes Santo'), d(5, 1, 'Día del Trabajador'),
    d(5, 25, 'Revolución de Mayo'), d(6, 15, 'Paso a la Inmortalidad de Güemes'), d(6, 20, 'Día de la Bandera'), d(7, 9, 'Día de la Independencia'), ...receso, d(8, 17, 'Paso a la Inmortalidad de San Martín'),
    d(10, 12, 'Día del Respeto a la Diversidad Cultural'), d(11, 23, 'Día de la Soberanía Nacional'), d(12, 8, 'Inmaculada Concepción'), d(12, 25, 'Navidad')]
}
const ANIO = new Date().getFullYear()

export const CONFIG_INICIAL: ConfigDemo = {
  ciclo: { inicio: `${ANIO}-03-02`, fin: `${ANIO}-12-18`, segundoCuatrimestre: `${ANIO}-08-03` },
  feriados: feriadosEjemplo(ANIO),
  reglas: { tolerancia: 10, minutosAntes: 10, minutosDespues: 120, lugar: 'Escuela Modelo', radio: 150, redes: ['ESCUELA-MODELO', 'ESCUELA-MODELO-5G'], modo: 'una', tiempoMaximo: 3, qrModo: 'fijo', qrVersion: 1, punto: null },
  horarios: {
    preceptor: semana('07:30', '13:30'),
    administrativo: semana('08:00', '16:00'),
  },
  personal: [
    { id: 'maria', nombre: 'María González', iniciales: 'MG', cargo: 'Docente · Nivel Secundario', tipo: 'docente', clases: { lunes: MAT_LMV, miercoles: MAT_LMV, viernes: MAT_LMV, martes: [...MAT_MJ, ...TALLER], jueves: [...MAT_MJ, ...TALLER] } },
    { id: 'carlos', nombre: 'Carlos Rodríguez', iniciales: 'CR', cargo: 'Docente · Nivel Primario', tipo: 'docente', clases: { lunes: LEN, miercoles: LEN, viernes: LEN } },
    { id: 'ana', nombre: 'Ana Martínez', iniciales: 'AM', cargo: 'Docente · Nivel Secundario', tipo: 'docente', clases: { martes: BIO, jueves: BIO } },
    { id: 'laura', nombre: 'Laura Benítez', iniciales: 'LB', cargo: 'Preceptora · 4° Año', tipo: 'preceptor' },
    { id: 'sofia', nombre: 'Sofía López', iniciales: 'SL', cargo: 'Administrativa', tipo: 'administrativo' },
  ],
}

export const TIPO_LABEL: Record<TipoPersonal, string> = { docente: 'Docente', preceptor: 'Preceptor', administrativo: 'Administrativo' }
/** Los administrativos sólo tienen Presente y Ausente: no se les aplica tardanza. */
export const aplicaTardanza = (t: TipoPersonal) => t !== 'administrativo'

/** Persona del personal que representa a cada perfil de la demostración. */
export const personaDePerfil = (r: Role): string | null => (r === 'Profesor' ? 'maria' : r === 'Preceptor' ? 'laura' : r === 'Administrador' ? 'sofia' : null)

const aMin = (h: string) => { const [a, b] = h.split(':').map(Number); return a * 60 + (b || 0) }
export const sumarMin = (h: string, m: number) => { const t = aMin(h) + m; const x = ((t % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}` }

/** Condiciones del dispositivo que se simulan en el prototipo. */
export const UBICACIONES = [
  { id: 'dentro', label: 'Dentro de la escuela (a 40 m)', metros: 40 },
  { id: 'cerca', label: 'En la vereda de enfrente (a 140 m)', metros: 140 },
  { id: 'lejos', label: 'En la calle, lejos (a 850 m)', metros: 850 },
  { id: 'sin_gps', label: 'Dentro de la escuela, pero el GPS no responde', metros: null as number | null },
  { id: 'real', label: 'Mi ubicación real (GPS del celular)', metros: null as number | null },
]

/** Distancia en metros entre dos puntos (fórmula de haversine). */
export function distanciaMetros(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (g: number) => (g * Math.PI) / 180
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2
  return Math.round(2 * 6371000 * Math.asin(Math.sqrt(h)))
}
export type RedSim = { kind: 'wifi' | 'datos'; nombre: string }

export type ResultadoFichaje = {
  /** 'pendiente': no se pudo validar a tiempo; se guarda con la hora real del escaneo y se confirma después */
  estado: 'registrado' | 'pendiente' | 'rechazado' | 'qr_invalido' | 'sin_horario' | 'muy_temprano' | 'fuera_de_ventana'
  asistencia?: 'Presente' | 'Tardanza'
  minutosTarde: number
  /** La clase (o el turno) contra el que se midió el fichaje */
  clase?: Clase
  entrada?: string
  limiteTardanza?: string
  desde?: string
  hasta?: string
  segundos: number
  validadoPor?: 'GPS' | 'Wi-Fi' | 'GPS y Wi-Fi'
  geo: { ok: boolean | null; detalle: string }
  wifi: { ok: boolean | null; detalle: string }
  horario: { ok: boolean | null; detalle: string }
}

/** vigente: el de la puerta · anterior: uno ya regenerado · foto: foto del código · otro: código de otro lugar */
export type QrLeido = 'vigente' | 'anterior' | 'foto' | 'otro'

/** Cuatrimestre al que pertenece una fecha del ciclo lectivo. */
export const cuatrimestreDe = (config: ConfigDemo, iso: string): 'c1' | 'c2' => (iso < config.ciclo.segundoCuatrimestre ? 'c1' : 'c2')
/** Una clase se dicta en esa fecha si es anual o si es del cuatrimestre en curso. */
export const claseVigente = (config: ConfigDemo, c: Clase, iso: string) => !c.periodo || c.periodo === 'anual' || c.periodo === cuatrimestreDe(config, iso)
export const etiquetaPeriodo = (c: Clase) => (c.periodo && c.periodo !== 'anual' ? PERIODOS.find(p => p.id === c.periodo)!.nombre : '')

/** Franjas del día de una persona: las clases del docente, o el horario fijo de su rol.
 *  Con una fecha, sólo se cuentan las clases anuales y las del cuatrimestre en curso. */
export function franjasDelDia(config: ConfigDemo, persona: Persona, dia: DiaSemana, fecha?: string): Clase[] {
  if (persona.tipo === 'docente') return (persona.clases?.[dia] ?? []).filter(c => !fecha || claseVigente(config, c, fecha)).sort((a, b) => a.entrada.localeCompare(b.entrada))
  const f = config.horarios[persona.tipo as RolConHorario]?.[dia]
  return f ? [{ ...f, materia: 'Jornada' }] : []
}

/**
 * Decide qué pasa con un fichaje. Principios para que nadie pierda tiempo:
 *  - La hora que cuenta es la del ESCANEO, no la de cuando termina la validación.
 *  - Con modo "una", alcanza con que GPS o Wi-Fi validen: se acepta apenas una lo confirma.
 *  - Si una comprobación no responde dentro del tiempo máximo, no se bloquea a la persona: queda "pendiente" y se confirma después.
 *  - Un docente no tiene horario fijo: se lo mide contra la CLASE que le corresponde en ese momento.
 */
export function evaluarFichaje(p: { persona: Persona; franjas: Clase[]; dia: DiaSemana; hora: string; metros: number | null; red: RedSim; reglas: ReglasFichaje; qr?: QrLeido }): ResultadoFichaje {
  const { persona, franjas, dia, hora, metros, red, reglas, qr = 'vigente' } = p
  const gpsSinRespuesta = metros === null
  const geoOk = metros !== null && metros <= reglas.radio
  const geo = gpsSinRespuesta
    ? { ok: null as boolean | null, detalle: `Sin respuesta del GPS (se esperó ${reglas.tiempoMaximo} s)` }
    : { ok: geoOk as boolean | null, detalle: geoOk ? `${reglas.lugar} · a ${metros} m (límite ${reglas.radio} m)` : `A ${metros} m: fuera del perímetro de ${reglas.radio} m` }
  const wifiOk = red.kind === 'wifi' && reglas.redes.some(r => r.toLowerCase() === red.nombre.toLowerCase())
  const wifi = { ok: wifiOk as boolean | null, detalle: red.kind === 'datos' ? 'Sin Wi-Fi (datos móviles)' : wifiOk ? `${red.nombre} · red institucional` : `${red.nombre} · red no autorizada` }
  const base = { minutosTarde: 0, geo, wifi, segundos: 0.4 }

  // Código fijo: sirve hasta que se regenera. Una foto del código es válida (la seguridad está en GPS, Wi-Fi y horario); con la pantalla rotativa, una foto ya no sirve.
  const qrMalo = qr === 'otro' || qr === 'anterior' || (qr === 'foto' && reglas.qrModo === 'pantalla')
  if (qrMalo) return { ...base, estado: 'qr_invalido', horario: { ok: false, detalle: qr === 'otro' ? `El código no pertenece a ${reglas.lugar}` : qr === 'anterior' ? 'El código fue reemplazado por uno nuevo' : 'Ese código ya se renovó (la pantalla de ingreso cambia cada 30 s)' } }

  const nombreDia = DIAS.find(d => d.id === dia)?.nombre.toLowerCase()
  if (!franjas.length) return { ...base, estado: 'sin_horario', horario: { ok: null, detalle: persona.tipo === 'docente' ? `No tiene clases el ${nombreDia}` : `El rol ${TIPO_LABEL[persona.tipo].toLowerCase()} no tiene horario el ${nombreDia}` } }

  const t = aMin(hora)
  // Ventana de cada clase: desde "minutosAntes" antes de la entrada hasta el menor entre "minutosDespues" y el fin de la clase
  const ventana = (c: Clase) => ({ desde: aMin(c.entrada) - reglas.minutosAntes, hasta: Math.min(aMin(c.entrada) + reglas.minutosDespues, aMin(c.salida)) })
  const habilitadas = franjas.filter(c => { const v = ventana(c); return t >= v.desde && t <= v.hasta })
  if (!habilitadas.length) {
    const proxima = franjas.find(c => ventana(c).desde > t)
    if (proxima) {
      const d = sumarMin(proxima.entrada, -reglas.minutosAntes)
      return { ...base, entrada: proxima.entrada, clase: proxima, desde: d, estado: 'muy_temprano', horario: { ok: false, detalle: `Todavía no se puede fichar${persona.tipo === 'docente' ? ` (próxima clase: ${proxima.materia} a las ${proxima.entrada})` : ''}: se habilita a las ${d}` } }
    }
    const ultima = franjas[franjas.length - 1]
    const h = sumarMin(ultima.entrada, Math.min(reglas.minutosDespues, aMin(ultima.salida) - aMin(ultima.entrada)))
    return { ...base, entrada: ultima.entrada, clase: ultima, hasta: h, estado: 'fuera_de_ventana', horario: { ok: false, detalle: `Pasó el plazo de fichaje (hasta las ${h}): se considera ausente` } }
  }
  // Si hay más de una habilitada (clases seguidas), se mide contra la que ya empezó más recientemente
  const clase = [...habilitadas].reverse().find(c => aMin(c.entrada) <= t) ?? habilitadas[0]
  const ent = aMin(clase.entrada)
  const limiteTardanza = sumarMin(clase.entrada, reglas.tolerancia)
  const tarde = t > ent + reglas.tolerancia
  const minutosTarde = Math.max(0, t - ent)
  const aTardanza = tarde && aplicaTardanza(persona.tipo)
  const asistencia = aTardanza ? ('Tardanza' as const) : ('Presente' as const)
  const etiqueta = persona.tipo === 'docente' ? `Clase ${clase.materia} ${clase.entrada}` : `Entrada ${clase.entrada}`
  const horarioInfo = { ok: !aTardanza as boolean | null, detalle: `${etiqueta} · tolerancia hasta ${limiteTardanza}${tarde && !aplicaTardanza(persona.tipo) ? ' (sin tardanza para administrativos)' : ''}` }
  const datos = { entrada: clase.entrada, clase, limiteTardanza }

  const valida = reglas.modo === 'una' ? geoOk || wifiOk : geoOk && wifiOk
  if (valida) {
    const validadoPor = geoOk && wifiOk ? 'GPS y Wi-Fi' : geoOk ? 'GPS' : 'Wi-Fi'
    const segundos = reglas.modo === 'una' ? (wifiOk ? 0.3 : 0.8) : 0.8
    return { ...base, ...datos, estado: 'registrado', asistencia, minutosTarde, horario: horarioInfo, validadoPor, segundos }
  }
  const podriaValidar = gpsSinRespuesta && (reglas.modo === 'una' ? true : wifiOk)
  if (podriaValidar) return { ...base, ...datos, estado: 'pendiente', asistencia, minutosTarde, horario: horarioInfo, segundos: reglas.tiempoMaximo }
  return { ...base, ...datos, estado: 'rechazado', minutosTarde, horario: horarioInfo }
}

export type Fichaje = { personaId: string; fecha: string; hora: string; estado: 'Presente' | 'Tardanza'; minutosTarde: number; pendiente?: boolean }

/** RNF1: el fichaje debe quedar procesado en menos de este tiempo (segundos), medido desde el escaneo hasta el resultado. */
export const RNF1_SEGUNDOS = 3

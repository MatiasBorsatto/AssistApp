// Lógica de dominio portada de assistapp2/app.js (gestión de faltas del personal docente).

export type Franja = { entrada: string; salida: string; materia?: string }
export type Horario = Partial<Record<DiaKey, Franja[] | Franja>>
export type DiaKey = 'domingo' | 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado'
export type Nivel = 'secundaria' | 'primaria' | 'inicial' | 'estudiantes'

export type TipoNovedad =
  | 'presente' | 'tardanza' | 'justificada' | 'injustificada' | 'justificada_parcial' | 'injustificada_parcial'
  | 'medica' | 'medica_familiar' | 'cambio' | 'duelo' | 'lic_embarazo' | 'lic_gremial' | 'carpeta_psiq'
  | 'formacion' | 'lic_capacitacion' | 'adelanto' | 'compensada' | 'paro' | 'jubilacion'

export type Docente = {
  id: string
  nombre: string
  apellido: string
  cargo: string
  horario: Horario
  grupos: string[]
  materias: string
  notas: string
  tipoHs: string
  jubilado: boolean
  nivel: Nivel
  area: string
  fechaIngreso: string
  faltasMes: number
  faltasAnio: number
  eliminadoEn?: Record<string, boolean>
}

export type Novedad = {
  id: string
  docente_id: string
  tipo: TipoNovedad
  fecha: string
  mes: string
  anio: string
  obs?: string
  modulo?: string
  modulos?: string[]
  franjasTotal?: number
  durVence?: string
  medicoNombre?: string
  matriculaMedico?: string
  compensaFecha?: string
  compensadaConAdelanto?: string
  docsEntregados?: boolean
  referencia?: string
  adjuntoURL?: string
  comentario?: string
  created_at?: string
}

export type Config = { cicloInicio: string; cicloFin: string; feriados: { fecha: string; nombre: string }[] }

export const DIAS_KEYS: DiaKey[] = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
export const DIA_IDX: Record<DiaKey, number> = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 }
export const DIA_ABREV = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
export const DIA_NOMBRE = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
export const DIA_ORDEN = [1, 2, 3, 4, 5, 6, 0]

export const LABELS: Record<TipoNovedad, string> = {
  presente: 'Presente', tardanza: 'Tardanza', justificada: 'Inasist. Justificada', injustificada: 'Inasist. Injustificada',
  medica: 'Carpeta Médica', medica_familiar: 'C. Médica Familiar', cambio: 'Cambio de Actividad',
  duelo: 'Duelo / Fallec. Familiar', lic_embarazo: 'Licencia por Embarazo', lic_gremial: 'Licencia Gremial',
  carpeta_psiq: 'Carpeta Psiquiátrica', formacion: 'Jornada de Formación en otra institución',
  lic_capacitacion: 'Licencia por Capacitación/Estudio', adelanto: 'Adelanto de Horas', compensada: 'Falta Compensada',
  justificada_parcial: 'Falta Parcial Justificada', injustificada_parcial: 'Falta Parcial Injustificada',
  paro: 'Paro Docente', jubilacion: 'Jubilación',
}
export const LABELS_SHORT: Record<TipoNovedad, string> = {
  presente: 'Presente', tardanza: 'Tardanza', justificada: 'Just.', injustificada: 'Injust.', medica: 'C. Médica', medica_familiar: 'C. Méd. Fam.',
  cambio: 'Cambio Act.', duelo: 'Duelo', lic_embarazo: 'Lic. Embarazo', lic_gremial: 'Lic. Gremial', carpeta_psiq: 'C. Psiquiát.',
  formacion: 'Formación', lic_capacitacion: 'Lic. Capacitación', adelanto: 'Adelanto', compensada: 'Compensada',
  justificada_parcial: 'F.Parc.Just.', injustificada_parcial: 'F.Parc.Injust.', paro: 'Paro', jubilacion: 'Jubilación',
}
export const TIPOS: TipoNovedad[] = [
  'presente', 'tardanza', 'justificada', 'injustificada', 'justificada_parcial', 'injustificada_parcial', 'medica', 'medica_familiar',
  'cambio', 'duelo', 'lic_embarazo', 'lic_gremial', 'carpeta_psiq', 'formacion', 'lic_capacitacion', 'adelanto', 'compensada', 'paro', 'jubilacion',
]
/** Tipos que se pueden registrar como rango de días */
export const TIPOS_RANGO: TipoNovedad[] = ['medica', 'medica_familiar', 'carpeta_psiq', 'lic_embarazo', 'lic_gremial', 'duelo', 'paro', 'formacion', 'lic_capacitacion', 'jubilacion']
/** Tipos que requieren documentación respaldatoria */
export const TIPOS_CON_DOCS: TipoNovedad[] = ['justificada', 'injustificada', 'justificada_parcial', 'injustificada_parcial', 'medica', 'medica_familiar', 'carpeta_psiq', 'duelo', 'lic_embarazo', 'lic_gremial', 'lic_capacitacion', 'formacion']
/** Licencias con fecha de comienzo y de finalización (la jubilación sólo tiene comienzo). */
export const TIPOS_LICENCIA: TipoNovedad[] = TIPOS_RANGO.filter(t => t !== 'jubilacion')

const NO_ADMIN = ['preceptor', 'director', 'vicedirector', 'coordinador', 'coordinadora', 'autoridad']
/** Personal administrativo / no docente (secretaría, biblioteca, ayudantes…). Los preceptores y directivos no entran. */
export const esAdministrativo = (d: { nivel?: string; cargo?: string }) => {
  if (d.nivel === 'estudiantes' || !d.cargo) return false
  const c = quitarTildes(d.cargo.toLowerCase())
  return !NO_ADMIN.some(k => c.includes(k)) && ['administrativ', 'secretari', 'biblioteca', 'bibliotecari', 'ayudante', 'auxiliar', 'maestranza', 'ordenanza'].some(k => c.includes(k))
}
export const TIPOS_PERSONA = ['Profesor', 'Preceptor', 'Directivo', 'Administrativo', 'Estudiante'] as const
export type TipoPersona = (typeof TIPOS_PERSONA)[number]
/** Tipo de persona deducido del cargo (no se guarda aparte): sirve para filtrar listados. */
export const tipoPersona = (d: { nivel?: string; cargo?: string }): TipoPersona => {
  if (d.nivel === 'estudiantes') return 'Estudiante'
  const c = quitarTildes((d.cargo || '').toLowerCase())
  if (c.includes('preceptor')) return 'Preceptor'
  if (['director', 'vicedirector', 'coordinador', 'coordinadora', 'autoridad'].some(k => c.includes(k))) return 'Directivo'
  if (esAdministrativo(d)) return 'Administrativo'
  return 'Profesor'
}
/**
 * Estados que se pueden registrar según el perfil:
 *  - administrativos: sólo Presente y Ausente
 *  - estudiantes: todos, incluida la Tardanza
 *  - docentes: todos menos la Tardanza
 */
export const tiposPermitidos = (d: { nivel?: string; cargo?: string }): TipoNovedad[] => {
  if (esAdministrativo(d)) return ['presente', 'injustificada']
  if (d.nivel === 'estudiantes') return TIPOS
  return TIPOS.filter(t => t !== 'tardanza')
}
/** En administrativos la falta se muestra simplemente como "Ausente". */
export const etiquetaTipo = (t: TipoNovedad, d?: { nivel?: string; cargo?: string }) => (d && esAdministrativo(d) && t === 'injustificada' ? 'Ausente' : LABELS[t])

export const TIPOS_MEDICOS: TipoNovedad[] = ['medica', 'medica_familiar', 'carpeta_psiq']

export type Tono = 'success' | 'warning' | 'danger' | 'blue' | 'neutral'
export const TIPO_TONO: Record<TipoNovedad, Tono> = {
  presente: 'success', tardanza: 'warning', justificada: 'warning', injustificada: 'danger', justificada_parcial: 'warning', injustificada_parcial: 'danger',
  medica: 'blue', medica_familiar: 'blue', cambio: 'neutral', duelo: 'neutral', lic_embarazo: 'blue', lic_gremial: 'neutral',
  carpeta_psiq: 'blue', formacion: 'success', lic_capacitacion: 'success', adelanto: 'neutral', compensada: 'success', paro: 'neutral', jubilacion: 'neutral',
}

export const esFalta = (t: string) => t === 'justificada' || t === 'injustificada'
export const esFaltaCualquiera = (t: string) => esFalta(t) || t === 'justificada_parcial' || t === 'injustificada_parcial'
/** Presente en el % del día: sin novedad o explícitamente presente/cambio/parcial */
export const esPresenteDia = (t?: string) => !t || t === 'presente' || t === 'tardanza' || t === 'cambio' || t === 'justificada_parcial' || t === 'injustificada_parcial'
export const esAusencia = (t?: string) => !esPresenteDia(t)

// ── Fechas (zona horaria de Buenos Aires) ──
export function hoyDate(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }))
}
export const pad2 = (n: number) => String(n).padStart(2, '0')
export const fmtFecha = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
export const hoyStr = () => fmtFecha(hoyDate())
export const fechaDate = (f: string) => new Date(f + 'T12:00:00')
export function sumarDias(f: string, n: number) { const d = fechaDate(f); d.setDate(d.getDate() + n); return fmtFecha(d) }
export function fechaLarga(f: string) {
  const s = fechaDate(f).toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}
export const esFinde = (f: string) => { const d = fechaDate(f).getDay(); return d === 0 || d === 6 }
export const uuid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)

export const DEFAULT_CONFIG: Config = { cicloInicio: `${new Date().getFullYear()}-02-18`, cicloFin: `${new Date().getFullYear()}-12-30`, feriados: [] }
export const esFeriado = (cfg: Config, f: string) => cfg.feriados.some(x => x.fecha === f)

/** Lista de fechas hábiles (lun-vie) entre desde y hasta, para registrar rangos */
export function fechasHabiles(desde: string, hasta: string): string[] {
  const out: string[] = []
  const cur = fechaDate(desde)
  const fin = fechaDate(hasta)
  while (cur <= fin) { const d = cur.getDay(); if (d !== 0 && d !== 6) out.push(fmtFecha(cur)); cur.setDate(cur.getDate() + 1) }
  return out
}
export function siguientesHabiles(desde: string, cant: number): string[] {
  const out: string[] = []
  const cur = fechaDate(desde)
  while (out.length < cant) { const d = cur.getDay(); if (d !== 0 && d !== 6) out.push(fmtFecha(cur)); cur.setDate(cur.getDate() + 1) }
  return out
}

// ── Horarios ──
export function normalizarFranjas(val: Franja[] | Franja | undefined): Franja[] {
  if (!val) return []
  if (Array.isArray(val)) return val.filter(f => f.entrada && f.salida)
  return val.entrada && val.salida ? [val] : []
}
export function minDia(h: Franja[] | Franja | undefined): number {
  if (!h) return 0
  if (Array.isArray(h)) return h.reduce((s, f) => s + minDia(f), 0)
  if (!h.entrada || !h.salida) return 0
  const [eh, em] = h.entrada.split(':').map(Number)
  const [sh, sm] = h.salida.split(':').map(Number)
  return Math.max(0, sh * 60 + sm - eh * 60 - em)
}
export const hsDia = (h: Franja[] | Franja | undefined) => minDia(h) / 60
/** Horas cátedra: 1 hc = 40 min de reloj */
export const hsCatedraDia = (h: Franja[] | Franja | undefined) => minDia(h) / 40
export const hsSemanales = (hor?: Horario) => hor ? Object.values(hor).reduce((s, h) => s + hsDia(h), 0) : 0
export const hsCatedraSemanales = (hor?: Horario) => hor ? Object.values(hor).reduce((s, h) => s + hsCatedraDia(h), 0) : 0
export const diasConHorario = (hor?: Horario): DiaKey[] => hor ? (Object.keys(hor) as DiaKey[]).filter(d => hsDia(hor[d]) > 0) : []

const CARGOS_RELOJ = ['preceptor', 'biblioteca', 'bibliotecario', 'secretari', 'director', 'coordinador', 'coordinadora', 'ayudante', 'administrativ', 'vicedirector', 'autoridad']
export const quitarTildes = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
export const esCargoReloj = (cargo?: string) => !!cargo && CARGOS_RELOJ.some(k => quitarTildes(cargo.toLowerCase()).includes(k))
export const getTipoHs = (d: Pick<Docente, 'tipoHs' | 'cargo'>) => d.tipoHs || (esCargoReloj(d.cargo) ? 'reloj' : 'catedra')
export function hsDisplay(hor: Horario | undefined, tipo: string) {
  return tipo === 'reloj' ? { valor: Math.floor(hsSemanales(hor)), unidad: 'hs reloj' } : { valor: Math.floor(hsCatedraSemanales(hor)), unidad: 'hc' }
}

// ── Nombres ──
export function soloNombre(nombreCompleto: string, apellido?: string) {
  if (!apellido || !apellido.trim()) return nombreCompleto || ''
  const norm = (s: string) => quitarTildes((s || '').trim().toLowerCase())
  const ap = norm(apellido), n = (nombreCompleto || '').trim(), nn = norm(n)
  if (nn.startsWith(ap + ' ')) return n.slice(apellido.trim().length).trim()
  if (nn.endsWith(' ' + ap)) return n.slice(0, n.length - apellido.trim().length).trim()
  return n
}
export const nombreMostrar = (d: Pick<Docente, 'nombre' | 'apellido'>) =>
  d.apellido && d.apellido.trim() ? `${d.apellido.trim().toUpperCase()}, ${soloNombre(d.nombre, d.apellido)}` : d.nombre
export function keyOrden(d: Pick<Docente, 'nombre' | 'apellido'>) {
  if (d.apellido && d.apellido.trim()) return `${quitarTildes(d.apellido).toLowerCase().trim()} ${quitarTildes(d.nombre).toLowerCase().trim()}`
  const n = quitarTildes(d.nombre).toLowerCase().trim(), partes = n.split(/\s+/)
  return partes.length > 1 ? `${partes[partes.length - 1]} ${partes.slice(0, -1).join(' ')}` : n
}
export const ordenarDocentes = <T extends Pick<Docente, 'nombre' | 'apellido'>>(l: T[]) => l.slice().sort((a, b) => keyOrden(a).localeCompare(keyOrden(b), 'es'))

// ── Días hábiles y porcentajes ──
export function contarDias(cfg: Config, hor: Horario | undefined, desde: Date, hasta: Date): number {
  const idxs = diasConHorario(hor).map(d => DIA_IDX[d]).filter(i => i !== undefined)
  if (!idxs.length) return 0
  let n = 0
  const cur = new Date(desde); cur.setHours(0, 0, 0, 0)
  const fin = new Date(hasta); fin.setHours(23, 59, 59, 999)
  while (cur <= fin) { if (idxs.includes(cur.getDay()) && !esFeriado(cfg, fmtFecha(cur))) n++; cur.setDate(cur.getDate() + 1) }
  return n
}
export function calcDias(cfg: Config, hor: Horario | undefined, anio: number) {
  const h = hoyDate()
  const ini = new Date(cfg.cicloInicio.replace(/^\d{4}/, String(anio)) + 'T12:00:00')
  const fin = new Date(cfg.cicloFin.replace(/^\d{4}/, String(anio)) + 'T12:00:00')
  return {
    diasMes: contarDias(cfg, hor, new Date(h.getFullYear(), h.getMonth(), 1), new Date(h.getFullYear(), h.getMonth() + 1, 0)),
    diasAnio: contarDias(cfg, hor, ini, fin),
  }
}
export const calcPct = (total: number, faltas: number) => total > 0 ? Math.max(0, Math.min(100, ((total - faltas) / total) * 100)) : 100
export const pctColor = (p: number) => (p >= 90 ? '#117a4f' : p >= 75 ? '#8f5800' : '#b83a3a')
export const pctTono = (p: number): Tono => (p >= 90 ? 'success' : p >= 75 ? 'warning' : 'danger')

export type ResumenPeriodo = {
  presentes: number
  contadores: Partial<Record<TipoNovedad, number>>
  totalFaltas: number
  faltasParciales: number
  pctAsistencia: number
  diasHabiles: number
  fechaJubilacion: string | null
}

/** Resumen de asistencia de un docente en un período (portado de renderHistorial). */
export function resumenPeriodo(cfg: Config, doc: Pick<Docente, 'horario'>, items: Novedad[], desde: string, hasta: string): ResumenPeriodo {
  const reales = items.filter(i => i.tipo !== 'presente')
  const jub = reales.find(i => i.tipo === 'jubilacion')
  const fechaJubilacion = jub ? jub.fecha : null
  const hastaEf = fechaJubilacion && fechaJubilacion < hasta ? fechaJubilacion : hasta
  const porFecha: Record<string, Novedad> = {}
  reales.forEach(i => { porFecha[i.fecha] = i })

  let presentes = 0
  const idxs = diasConHorario(doc.horario).map(d => DIA_IDX[d])
  const cur = fechaDate(desde), fin = fechaDate(hastaEf)
  while (cur <= fin) {
    const dia = cur.getDay()
    if (dia !== 0 && dia !== 6 && idxs.includes(dia)) {
      const f = fmtFecha(cur)
      if (!esFeriado(cfg, f)) {
        const n = porFecha[f]
        if (n && n.tipo === 'jubilacion') { /* no cuenta */ } else if (!n || esPresenteDia(n.tipo)) presentes++
      }
    }
    cur.setDate(cur.getDate() + 1)
  }
  const contadores: Partial<Record<TipoNovedad, number>> = {}
  reales.forEach(i => { contadores[i.tipo] = (contadores[i.tipo] || 0) + 1 })
  const totalFaltas = (contadores.justificada || 0) + (contadores.injustificada || 0)
  const faltasParciales = reales.filter(i => i.tipo === 'justificada_parcial' || i.tipo === 'injustificada_parcial').reduce((s, i) => s + 1 / (i.franjasTotal || 1), 0)
  const base = presentes + totalFaltas
  return {
    presentes, contadores, totalFaltas, faltasParciales,
    pctAsistencia: base > 0 ? Math.round((presentes / base) * 100) : 100,
    diasHabiles: presentes + reales.length,
    fechaJubilacion,
  }
}

export const etiquetaDocs = (t: TipoNovedad) => {
  if (t === 'medica' || t === 'medica_familiar' || t === 'carpeta_psiq') return 'Cert. médico'
  if (t === 'justificada' || t === 'justificada_parcial') return 'Justificación'
  if (t === 'injustificada' || t === 'injustificada_parcial') return 'Nota / aviso'
  if (t === 'duelo') return 'Documentación duelo'
  if (t === 'lic_embarazo') return 'Cert. embarazo'
  if (t === 'lic_gremial') return 'Nota gremial'
  if (t === 'lic_capacitacion' || t === 'formacion') return 'Cert. asistencia'
  return 'Documentación'
}

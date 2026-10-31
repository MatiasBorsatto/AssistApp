import { courses, type Justification } from './data'
import { aIso, tipoDia } from './calendario'
import { TIPO_LABEL, aplicaTardanza, franjasDelDia, type ConfigDemo, type DiaSemana, type Fichaje } from './fichaje'
import type { Role } from './roles'

export type Periodo = 'Esta semana' | 'Este mes' | 'Último trimestre'
export const PERIODOS: Periodo[] = ['Esta semana', 'Este mes', 'Último trimestre']

export type TipoReg = 'Tardanza' | 'Ausencia justificada' | 'Ausencia (justificación pendiente)' | 'Ausencia injustificada'
export type Registro = { fecha: string; persona: string; rol: string; tipo: TipoReg; detalle: string }
export type FilaPersona = { nombre: string; rol: string; cargo: string; dias: number; presentes: number; tardanzas: number; justificadas: number; pendientes: number; injustificadas: number; pct: number }
export type Reporte = {
  desde: string; hasta: string; alcance: string
  personas: FilaPersona[]
  registros: Registro[]
  kpi: { asistencia: number; ausentismo: number; tardanzas: number; pendientes: number }
  distribucion: [string, number][]
  serie: { etiqueta: string; pct: number }[]
  motivos: [string, number][]
  ranking: [string, number][]
}

const f = (iso: string) => new Date(iso + 'T12:00:00')
const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h }
const DIA_ID: (DiaSemana | null)[] = [null, 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', null]
const r1 = (n: number) => Math.round(n * 10) / 10

/** Rango de fechas de un período, recortado al ciclo lectivo y sin pasar de hoy. */
export function rangoPeriodo(p: Periodo, hoy: string, config: ConfigDemo): [string, string] {
  const h = f(hoy)
  let d: Date
  if (p === 'Esta semana') { d = new Date(h); d.setDate(h.getDate() - ((h.getDay() + 6) % 7)) }
  else if (p === 'Este mes') d = new Date(h.getFullYear(), h.getMonth(), 1)
  else d = new Date(h.getFullYear(), h.getMonth() - 2, 1)
  const desde = aIso(d) < config.ciclo.inicio ? config.ciclo.inicio : aIso(d)
  const hasta = hoy > config.ciclo.fin ? config.ciclo.fin : hoy
  return [desde, hasta]
}

type Sujeto = { id: string; nombre: string; rol: string; cargo: string; curso?: string; trabaja: (iso: string) => boolean; tardanza: boolean }

function sujetos(role: Role, config: ConfigDemo, justs: Justification[], alcance: string): Sujeto[] {
  if (role === 'Preceptor') {
    const out: Sujeto[] = []
    Object.entries(courses).forEach(([curso, lista]) => lista.forEach(a => { if (alcance === 'Todos mis cursos' || alcance === curso) out.push({ id: a.id, nombre: a.name, rol: 'Alumno', cargo: curso, curso, trabaja: () => true, tardanza: true }) }))
    return out
  }
  const base: Sujeto[] = config.personal
    .filter(p => alcance === 'Toda la institución' || p.cargo.includes(alcance))
    .map(p => ({ id: p.id, nombre: p.nombre, rol: TIPO_LABEL[p.tipo], cargo: p.cargo, trabaja: iso => { const d = DIA_ID[f(iso).getDay()]; return !!d && franjasDelDia(config, p, d).length > 0 }, tardanza: aplicaTardanza(p.tipo) }))
  // Personas que tienen justificaciones pero no figuran en la lista de personal (se muestran igual, con su nombre)
  if (alcance === 'Toda la institución') {
    const nombres = new Set(base.map(b => b.nombre))
    justs.filter(j => j.ambito === 'personal' && !nombres.has(j.name)).forEach(j => { if (!nombres.has(j.name)) { nombres.add(j.name); base.push({ id: `x-${j.name}`, nombre: j.name, rol: 'Personal', cargo: 'Personal', trabaja: iso => { const w = f(iso).getDay(); return w >= 1 && w <= 5 }, tardanza: false }) } })
  }
  return base
}

/** Arma el reporte completo (números, personas y detalle) con los datos de la demostración. Lo usan las pantallas y las exportaciones. */
export function construirReporte(p: { role: Role; config: ConfigDemo; justificaciones: Justification[]; fichajes: Record<string, Fichaje>; periodo: Periodo; alcance: string; hoy: string; _prev?: boolean }): Reporte {
  const { role, config, justificaciones, fichajes, periodo, alcance, hoy } = p
  const [desde, hasta] = rangoPeriodo(periodo, hoy, config)
  const ambito = role === 'Preceptor' ? 'alumno' : 'personal'
  const justs = justificaciones.filter(j => j.ambito === ambito)
  const gente = sujetos(role, config, justs, alcance)

  const dias: string[] = []
  for (const c = f(desde); desde <= hasta && aIso(c) <= hasta; c.setDate(c.getDate() + 1)) if (tipoDia(config, aIso(c)).tipo === 'clase') dias.push(aIso(c))

  const registros: Registro[] = []
  const agenda = new Map<string, Set<string>>() // persona -> días con ausencia
  const marcar = (id: string, iso: string) => { if (!agenda.has(id)) agenda.set(id, new Set()); agenda.get(id)!.add(iso) }

  gente.forEach(s => {
    justs.filter(j => j.name === s.nombre).forEach(j => dias.filter(d => d >= j.desde && d <= j.hasta && s.trabaja(d)).forEach(d => {
      marcar(s.id, d)
      registros.push({ fecha: d, persona: s.nombre, rol: s.rol, tipo: j.status === 'Aprobado' ? 'Ausencia justificada' : j.status === 'Pendiente' ? 'Ausencia (justificación pendiente)' : 'Ausencia injustificada', detalle: `${j.reason}${j.status === 'Rechazado' ? ' (justificación rechazada)' : ''}` })
    }))
    // Otros hechos del período (datos de ejemplo estables: siempre son los mismos para la misma persona y fecha)
    dias.filter(d => s.trabaja(d) && !agenda.get(s.id)?.has(d)).forEach(d => {
      const h = hash(`${s.id}|${d}`)
      if (h % 47 === 0) { marcar(s.id, d); registros.push({ fecha: d, persona: s.nombre, rol: s.rol, tipo: 'Ausencia injustificada', detalle: 'Sin aviso ni justificación' }) }
      else if (s.tardanza && h % 19 === 0) registros.push({ fecha: d, persona: s.nombre, rol: s.rol, tipo: 'Tardanza', detalle: 'Llegó pasada la tolerancia' })
    })
    const fich = fichajes[s.id]
    if (fich && fich.estado === 'Tardanza' && fich.fecha >= desde && fich.fecha <= hasta && !registros.some(r => r.persona === s.nombre && r.fecha === fich.fecha && r.tipo === 'Tardanza'))
      registros.push({ fecha: fich.fecha, persona: s.nombre, rol: s.rol, tipo: 'Tardanza', detalle: `Fichó a las ${fich.hora} (${fich.minutosTarde} min tarde)` })
  })
  registros.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.persona.localeCompare(b.persona, 'es'))

  const esAus = (t: TipoReg) => t !== 'Tardanza'
  const personas: FilaPersona[] = gente.map(s => {
    const mios = registros.filter(r => r.persona === s.nombre)
    const d = dias.filter(x => s.trabaja(x)).length
    const j = mios.filter(r => r.tipo === 'Ausencia justificada').length, pe = mios.filter(r => r.tipo === 'Ausencia (justificación pendiente)').length
    const inj = mios.filter(r => r.tipo === 'Ausencia injustificada').length, t = mios.filter(r => r.tipo === 'Tardanza').length
    const aus = j + pe + inj
    return { nombre: s.nombre, rol: s.rol, cargo: s.cargo, dias: d, presentes: d - aus, tardanzas: t, justificadas: j, pendientes: pe, injustificadas: inj, pct: d ? r1(((d - aus) / d) * 100) : 100 }
  }).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  const total = personas.reduce((s, x) => s + x.dias, 0)
  const aus = registros.filter(r => esAus(r.tipo)).length, tard = registros.filter(r => r.tipo === 'Tardanza').length
  const kpi = {
    asistencia: total ? r1(((total - aus) / total) * 100) : 100, ausentismo: total ? r1((aus / total) * 100) : 0, tardanzas: total ? r1((tard / total) * 100) : 0,
    pendientes: justs.filter(j => j.status === 'Pendiente' && gente.some(g => g.nombre === j.name)).length,
  }
  const aHorario = Math.max(0, total - aus - tard)
  const distribucion: [string, number][] = [['Presente a horario', total ? r1((aHorario / total) * 100) : 100], ['Con tardanza', kpi.tardanzas], ['Ausente', kpi.ausentismo]]

  // Serie: un punto por día (semana), por semana (mes) o por mes (trimestre)
  const clave = (iso: string) => periodo === 'Esta semana' ? iso : periodo === 'Este mes' ? `S${Math.ceil(f(iso).getDate() / 7)}` : iso.slice(0, 7)
  const nombreMes = (k: string) => f(`${k}-01`).toLocaleDateString('es-AR', { month: 'short' }).replace('.', '')
  const buckets = new Map<string, { sched: number; aus: number }>()
  dias.forEach(d => { const k = clave(d); const b = buckets.get(k) ?? { sched: 0, aus: 0 }; b.sched += gente.filter(g => g.trabaja(d)).length; buckets.set(k, b) })
  registros.filter(r => esAus(r.tipo)).forEach(r => { const b = buckets.get(clave(r.fecha)); if (b) b.aus++ })
  const serie = [...buckets.entries()].map(([k, b]) => ({ etiqueta: periodo === 'Esta semana' ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][f(k).getDay()] : periodo === 'Este mes' ? k.replace('S', 'Sem ') : nombreMes(k), pct: b.sched ? Math.round(((b.sched - b.aus) / b.sched) * 100) : 100 }))

  const m = new Map<string, number>()
  registros.filter(r => r.tipo === 'Ausencia justificada' || r.tipo === 'Ausencia (justificación pendiente)').forEach(r => m.set(r.detalle, (m.get(r.detalle) ?? 0) + 1))
  const sinJust = registros.filter(r => r.tipo === 'Ausencia injustificada').length
  const motivos: [string, number][] = [...[...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4), ...(sinJust ? [['Sin justificar', sinJust] as [string, number]] : [])]

  const grupo = role === 'Preceptor' ? (x: FilaPersona) => x.cargo : (x: FilaPersona) => x.nombre
  const rk = new Map<string, { s: number; a: number }>()
  personas.forEach(x => { const k = grupo(x); const b = rk.get(k) ?? { s: 0, a: 0 }; b.s += x.dias; b.a += x.justificadas + x.pendientes + x.injustificadas; rk.set(k, b) })
  const ranking = [...rk.entries()].map(([k, b]) => [k, b.s ? r1((b.a / b.s) * 100) : 0] as [string, number]).sort((a, b) => b[1] - a[1]).slice(0, 6)

  return { desde, hasta, alcance, personas, registros, kpi, distribucion, serie, motivos, ranking }
}

export const fechaLegible = (iso: string) => f(iso).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })


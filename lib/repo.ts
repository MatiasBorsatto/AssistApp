import { getSupabase } from './supabase'
import {
  DEFAULT_CONFIG, esFalta, hoyStr, ordenarDocentes, uuid,
  type Config, type Docente, type Horario, type Nivel, type Novedad, type TipoNovedad,
} from './domain'

export type Rol = 'admin' | 'directivo' | 'docente' | 'invitado'
export type Grupo = { id: string; nombre: string; color: string }

const db = () => getSupabase()
function ok<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return (res.data ?? ([] as unknown)) as T
}

// ── Auth ──
export async function getRolUsuario(email: string): Promise<{ rol: Rol; nombre?: string }> {
  const res = await db().from('usuarios').select('rol,nombre').eq('email', email).maybeSingle()
  return { rol: ((res.data && res.data.rol) as Rol) || 'docente', nombre: res.data?.nombre }
}

// ── Config (ciclo y feriados) ──
export async function cargarConfig(anio: number): Promise<Config> {
  const base: Config = { ...DEFAULT_CONFIG, feriados: [] }
  for (const id of [`anio_${anio}`, 'general']) {
    const res = await db().from('config').select('*').eq('id', id).maybeSingle()
    if (res.data && res.data.data) {
      const d = res.data.data as Partial<Config>
      return { cicloInicio: d.cicloInicio || base.cicloInicio, cicloFin: d.cicloFin || base.cicloFin, feriados: d.feriados || [] }
    }
  }
  return base
}
export async function guardarConfig(anio: number, cfg: Config) {
  const r = await Promise.all([
    db().from('config').upsert({ id: `anio_${anio}`, data: cfg }),
    db().from('config').upsert({ id: 'general', data: cfg }),
  ])
  r.forEach(x => { if (x.error) throw new Error(x.error.message) })
}

// ── Docentes ──
type FilaDocente = Record<string, unknown>
function mapDocente(r: FilaDocente): Docente {
  return {
    id: r.id as string, nombre: (r.nombre as string) || '', apellido: (r.apellido as string) || '', cargo: (r.cargo as string) || '',
    horario: (r.horario as Docente['horario']) || {}, grupos: (r.grupos as string[]) || [], materias: (r.materias as string) || '',
    notas: (r.notas as string) || '', tipoHs: (r.tipo_hs as string) || '', jubilado: Boolean(r.jubilado),
    nivel: ((r.nivel as Nivel) || 'secundaria'), area: (r.area as string) || '', fechaIngreso: (r.fechaingreso as string) || '',
    faltasMes: (r.faltasMes as number) || 0, faltasAnio: (r.faltasAnio as number) || 0,
    eliminadoEn: (r.eliminado_en as Record<string, boolean>) || undefined,
  }
}
export function estaEliminado(d: Docente, nivel: Nivel | '') {
  if (!d.eliminadoEn) return false
  return nivel ? d.eliminadoEn[nivel] === true : d.eliminadoEn[d.nivel || 'secundaria'] === true
}
/** Docentes del año; excluye placeholders. Filtra por nivel y por soft-delete como la app original. */
export async function cargarDocentes(anio: number, nivel: Nivel | '' = ''): Promise<Docente[]> {
  const rows = ok<FilaDocente[]>(await db().from('docentes').select('*').eq('anio', anio))
  const docs = rows.filter(r => !r.esplaceholder).map(mapDocente).filter(d => !estaEliminado(d, nivel))
  return ordenarDocentes(nivel ? docs.filter(d => (d.nivel || 'secundaria') === nivel) : docs)
}
export async function cargarDocentesEliminados(anio: number): Promise<Docente[]> {
  const rows = ok<FilaDocente[]>(await db().from('docentes').select('*').eq('anio', anio))
  return ordenarDocentes(rows.filter(r => !r.esplaceholder).map(mapDocente).filter(d => d.eliminadoEn && Object.values(d.eliminadoEn).some(Boolean)))
}
export type DatosDocente = Omit<Docente, 'id' | 'faltasMes' | 'faltasAnio' | 'eliminadoEn' | 'fechaIngreso'> & { fechaIngreso?: string }
function filaDocente(d: DatosDocente, anio: number) {
  return {
    nombre: d.nombre, apellido: d.apellido, cargo: d.cargo, tipo_hs: d.tipoHs, faltasMes: 0, faltasAnio: 0, horario: d.horario,
    grupos: d.grupos, materias: d.materias, notas: d.notas, jubilado: d.jubilado, nivel: d.nivel, area: d.area, anio,
  }
}
export async function crearDocente(d: DatosDocente, anio: number): Promise<string> {
  const id = uuid()
  const res = await db().from('docentes').insert({ id, ...filaDocente(d, anio) })
  if (res.error) throw new Error(res.error.message)
  await registrarPresenteHoy(id, anio)
  return id
}
export async function actualizarDocente(id: string, d: DatosDocente, anio: number) {
  const res = await db().from('docentes').update(filaDocente(d, anio)).eq('id', id)
  if (res.error) throw new Error(res.error.message)
}
/** Soft delete / restore por nivel (campos jsonb eliminado_en, fecha_eliminado_en, eliminado_por_en). */
export async function softDeleteDocentes(ids: string[], nivel: string, marcar: boolean, quien: string) {
  const rows = ok<FilaDocente[]>(await db().from('docentes').select('id,eliminado_en,fecha_eliminado_en,eliminado_por_en').in('id', ids))
  const ahora = new Date().toISOString()
  const res = await Promise.all(rows.map(row => {
    const elim = { ...((row.eliminado_en as Record<string, unknown>) || {}) }
    const fecha = { ...((row.fecha_eliminado_en as Record<string, unknown>) || {}) }
    const por = { ...((row.eliminado_por_en as Record<string, unknown>) || {}) }
    if (marcar) { elim[nivel] = true; fecha[nivel] = ahora; por[nivel] = quien } else { delete elim[nivel]; delete fecha[nivel]; delete por[nivel] }
    return db().from('docentes').update({ eliminado_en: elim, fecha_eliminado_en: fecha, eliminado_por_en: por }).eq('id', row.id as string)
  }))
  res.forEach(x => { if (x.error) throw new Error(x.error.message) })
}
export async function marcarJubilado(id: string, jubilado: boolean) {
  const res = await db().from('docentes').update({ jubilado }).eq('id', id)
  if (res.error) throw new Error(res.error.message)
}

// ── Novedades ──
export async function novedadesDelDia(anio: number, fecha: string): Promise<Novedad[]> {
  return ok<Novedad[]>(await db().from('novedades').select('*').eq('anio', String(anio)).eq('fecha', fecha))
}
export async function novedadesAnio(anio: number): Promise<Novedad[]> {
  return ok<Novedad[]>(await db().from('novedades').select('*').eq('anio', String(anio)))
}
export async function novedadesRango(desde: string, hasta: string): Promise<Novedad[]> {
  return ok<Novedad[]>(await db().from('novedades').select('*').gte('fecha', desde).lte('fecha', hasta))
}
export async function novedadesDocente(docenteId: string): Promise<Novedad[]> {
  return ok<Novedad[]>(await db().from('novedades').select('*').eq('docente_id', docenteId))
}
export async function novedadesDocenteFecha(docenteId: string, fecha: string): Promise<Novedad[]> {
  return ok<Novedad[]>(await db().from('novedades').select('*').eq('docente_id', docenteId).eq('fecha', fecha))
}
/** Contadores de faltas completas (justificada/injustificada) del mes y del año por docente. */
export function contarFaltas(novs: Novedad[], mes: string) {
  const mesC: Record<string, number> = {}, anioC: Record<string, number> = {}
  novs.forEach(x => {
    if (!esFalta(x.tipo)) return
    if (x.mes === mes) mesC[x.docente_id] = (mesC[x.docente_id] || 0) + 1
    anioC[x.docente_id] = (anioC[x.docente_id] || 0) + 1
  })
  return { mesC, anioC }
}
async function registrarPresenteHoy(docenteId: string, anio: number) {
  const hoy = hoyStr(), dia = new Date(hoy + 'T12:00:00').getDay()
  if (dia === 0 || dia === 6) return
  try {
    const ya = await novedadesDocenteFecha(docenteId, hoy)
    if (ya.length) return
    await db().from('novedades').insert({ id: uuid(), docente_id: docenteId, tipo: 'presente', fecha: hoy, mes: hoy.slice(0, 7), anio: String(anio), created_at: new Date().toISOString() })
  } catch { /* no bloquea el alta */ }
}

export type OpcionesNovedad = {
  tipo: TipoNovedad
  fechas: string[]
  anio: number
  comentario?: string
  modulo?: string
  modulos?: string[]
  medicoNombre?: string
  matriculaMedico?: string
  compensaFecha?: string
  durVence?: string
  franjasTotalPorFecha?: (f: string) => number
}
/** Guarda una novedad (o rango). Reemplaza los registros previos del mismo día salvo parciales por módulo. */
export async function guardarNovedad(docenteId: string, o: OpcionesNovedad) {
  const primera = o.fechas[0]
  const previas = await novedadesDocenteFecha(docenteId, primera)
  if (previas.length && previas[0].tipo === o.tipo && o.fechas.length === 1) throw new Error('same')
  const parcial = o.tipo === 'justificada_parcial' || o.tipo === 'injustificada_parcial'
  const borrar = parcial && o.modulo
    ? previas.filter(p => (p.tipo === 'justificada_parcial' || p.tipo === 'injustificada_parcial') && p.modulo === o.modulo).map(p => p.id)
    : previas.map(p => p.id)
  const filas: Record<string, unknown>[] = o.fechas.map((f, i) => {
    const n: Record<string, unknown> = { id: uuid(), docente_id: docenteId, tipo: o.tipo, fecha: f, mes: f.slice(0, 7), anio: String(o.anio), created_at: new Date().toISOString() }
    if (o.durVence && i === o.fechas.length - 1) n.durVence = o.durVence
    if (o.comentario) n.obs = o.comentario
    if (o.modulo) n.modulo = o.modulo
    if (o.modulos && o.modulos.length > 1) n.modulos = o.modulos
    if (o.medicoNombre) n.medicoNombre = o.medicoNombre
    if (o.matriculaMedico) n.matriculaMedico = o.matriculaMedico
    if (parcial) n.franjasTotal = o.franjasTotalPorFecha ? o.franjasTotalPorFecha(f) : 1
    if (o.tipo === 'adelanto' && o.compensaFecha) n.compensaFecha = o.compensaFecha
    return n
  })
  if (o.tipo === 'adelanto' && o.compensaFecha) {
    filas.push({ id: uuid(), docente_id: docenteId, tipo: 'compensada', fecha: o.compensaFecha, mes: o.compensaFecha.slice(0, 7), anio: String(o.anio), compensadaConAdelanto: primera, created_at: new Date().toISOString() })
  }
  if (borrar.length) { const r = await db().from('novedades').delete().in('id', borrar); if (r.error) throw new Error(r.error.message) }
  if (filas.length) { const r = await db().from('novedades').insert(filas); if (r.error) throw new Error(r.error.message) }
  if (o.tipo === 'jubilacion') await marcarJubilado(docenteId, true)
}
export async function setDocsEntregados(novId: string, v: boolean) {
  const r = await db().from('novedades').update({ docsEntregados: v }).eq('id', novId)
  if (r.error) throw new Error(r.error.message)
}
export async function borrarNovedades(ids: string[]) {
  const r = await db().from('novedades').delete().in('id', ids)
  if (r.error) throw new Error(r.error.message)
}
/** Para un registro de tipo rango, devuelve el bloque contiguo (≤4 días de separación) que contiene la fecha. */
export async function bloqueContiguo(nov: Novedad): Promise<{ id: string; fecha: string }[]> {
  const todos = (await db().from('novedades').select('id,fecha').eq('docente_id', nov.docente_id).eq('tipo', nov.tipo)).data || []
  const orden = (todos as { id: string; fecha: string }[]).sort((a, b) => a.fecha.localeCompare(b.fecha))
  const bloques: { id: string; fecha: string }[][] = []
  let actual: { id: string; fecha: string }[] = []
  orden.forEach(it => {
    if (!actual.length) { actual.push(it); return }
    const dif = Math.round((new Date(it.fecha + 'T12:00:00').getTime() - new Date(actual[actual.length - 1].fecha + 'T12:00:00').getTime()) / 86400000)
    if (dif <= 4) actual.push(it); else { bloques.push(actual); actual = [it] }
  })
  if (actual.length) bloques.push(actual)
  return bloques.find(b => b.some(x => x.fecha === nov.fecha)) || [{ id: nov.id, fecha: nov.fecha }]
}

// ── Grupos ──
export async function cargarGrupos(): Promise<Grupo[]> {
  return ok<Grupo[]>(await db().from('grupos').select('*').order('nombre'))
}
export async function crearGrupo(nombre: string, color: string) {
  const r = await db().from('grupos').insert({ id: uuid(), nombre, color }); if (r.error) throw new Error(r.error.message)
}
export async function renombrarGrupo(id: string, nombre: string) {
  const r = await db().from('grupos').update({ nombre }).eq('id', id); if (r.error) throw new Error(r.error.message)
}
export async function eliminarGrupo(id: string) {
  const r = await db().from('grupos').delete().eq('id', id); if (r.error) throw new Error(r.error.message)
}

// ── Backups ──
export type Backup = {
  id: string; ts: string; motivo: string; quien: string; anio: number
  data: { empleados: Record<string, unknown>[]; novedades: Record<string, unknown>[]; fecha: string; hora: string }
}
const MAX_BACKUPS = 20
let timer: ReturnType<typeof setTimeout> | null = null
let enCurso = false
/** Snapshot diferido (3 s) de docentes + novedades del año; conserva los últimos 20. */
export function crearBackupAutomatico(motivo: string, anio: number, quien: string) {
  if (timer) clearTimeout(timer)
  timer = setTimeout(async () => {
    if (enCurso) return
    enCurso = true
    try {
      const ts = new Date()
      const [d, n] = await Promise.all([db().from('docentes').select('*').eq('anio', anio), db().from('novedades').select('*').eq('anio', String(anio))])
      if (d.error || n.error) throw new Error((d.error || n.error)!.message)
      await db().from('backups').insert({
        id: uuid(), ts: ts.toISOString(), motivo: motivo || 'Modificación automática', quien, anio,
        data: { empleados: d.data || [], novedades: n.data || [], fecha: ts.toLocaleDateString('es-AR'), hora: ts.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) },
      })
      const lista = (await db().from('backups').select('id,ts').order('ts', { ascending: true })).data as { id: string }[] | null
      if (lista && lista.length > MAX_BACKUPS) await db().from('backups').delete().in('id', lista.slice(0, lista.length - MAX_BACKUPS).map(r => r.id))
    } catch (e) { console.warn('Backup falló:', (e as Error).message) } finally { enCurso = false }
  }, 3000)
}
export async function listarBackups(): Promise<Backup[]> {
  return ok<Backup[]>(await db().from('backups').select('*').order('ts', { ascending: false }))
}
export async function eliminarBackup(id: string) {
  const r = await db().from('backups').delete().eq('id', id); if (r.error) throw new Error(r.error.message)
}

// ── Copias entre niveles / años ──
export async function copiarDocenteANivel(d: Docente, nivel: Nivel, anio: number) {
  const r = await db().from('docentes').insert({
    id: uuid(), nombre: d.nombre, apellido: d.apellido, cargo: d.cargo, tipo_hs: d.tipoHs || 'catedra', horario: d.horario, grupos: [],
    materias: d.materias, notas: d.notas, jubilado: false, nivel, area: d.area, faltasMes: 0, faltasAnio: 0, anio,
  })
  if (r.error) throw new Error(r.error.message)
}
/** Copia los docentes del año anterior al año nuevo (resetea faltas). */
export async function copiarDocentesAnioAnterior(anioNuevo: number): Promise<number> {
  const filas = ok<FilaDocente[]>(await db().from('docentes').select('*').eq('anio', anioNuevo - 1))
  if (!filas.length) return 0
  const nuevas = filas.filter(f => !f.esplaceholder).map(f => ({
    id: uuid(), anio: anioNuevo, nombre: f.nombre || '', apellido: f.apellido || '', cargo: f.cargo || '', nivel: f.nivel || 'secundaria',
    area: f.area || '', horario: f.horario || {}, grupos: f.grupos || [], materias: f.materias || '', notas: f.notas || '', tipo_hs: f.tipo_hs || '',
    faltasMes: 0, faltasAnio: 0, copiadoDe: anioNuevo - 1,
  }))
  if (nuevas.length) { const r = await db().from('docentes').insert(nuevas); if (r.error) throw new Error(r.error.message) }
  return nuevas.length
}
/** Fila placeholder para que un año vacío exista y no vuelva a pedir la copia. */
export async function crearAnioVacio(anio: number) {
  await db().from('docentes').insert({ id: uuid(), anio, nombre: '__placeholder__', cargo: '', horario: {}, grupos: [], materias: '', faltasMes: 0, faltasAnio: 0, esplaceholder: true })
}
export async function hayDocentesEnAnio(anio: number): Promise<boolean> {
  const r = await db().from('docentes').select('id').eq('anio', anio).limit(1)
  return !!(r.data && r.data.length)
}

// ── Restaurar backup ──
/** Reemplaza docentes y novedades del año del backup. Hace antes un backup inmediato del estado actual. */
export async function restaurarBackup(b: Backup) {
  const anio = b.anio
  const [d, n] = await Promise.all([db().from('docentes').select('id').eq('anio', anio), db().from('novedades').select('id').eq('anio', String(anio))])
  if (d.error || n.error) throw new Error((d.error || n.error)!.message)
  // Resguardo del estado actual antes de borrar
  const [dAct, nAct] = await Promise.all([db().from('docentes').select('*').eq('anio', anio), db().from('novedades').select('*').eq('anio', String(anio))])
  const ts = new Date()
  await db().from('backups').insert({ id: uuid(), ts: ts.toISOString(), motivo: 'Pre-restauración automática', quien: 'sistema', anio,
    data: { empleados: dAct.data || [], novedades: nAct.data || [], fecha: ts.toLocaleDateString('es-AR'), hora: ts.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) } })
  const idsD = (d.data || []).map((r: { id: string }) => r.id), idsN = (n.data || []).map((r: { id: string }) => r.id)
  if (idsD.length) { const r = await db().from('docentes').delete().in('id', idsD); if (r.error) throw new Error(r.error.message) }
  if (idsN.length) { const r = await db().from('novedades').delete().in('id', idsN); if (r.error) throw new Error(r.error.message) }
  const fix = (x: Record<string, unknown>, anioVal: unknown) => { const o = { ...x }; const id = (o._id as string) || (o.id as string); delete o._id; o.id = id; o.anio = anioVal; return o }
  const filasD = b.data.empleados.map(e => fix(e, anio)), filasN = b.data.novedades.map(e => fix(e, String(anio)))
  if (filasD.length) { const r = await db().from('docentes').insert(filasD); if (r.error) throw new Error(r.error.message) }
  if (filasN.length) { const r = await db().from('novedades').insert(filasN); if (r.error) throw new Error(r.error.message) }
}

// ── Ciclos archivados ──
export type CicloArchivado = { id: string; anio: number; created_at: string; data: { totalNovedades: number; novedades: Novedad[] } }
export async function listarCiclosArchivados(): Promise<CicloArchivado[]> {
  const r = await db().from('ciclos_archivados').select('*').order('anio', { ascending: false })
  return (r.data as CicloArchivado[]) || []
}
/** Guarda las novedades del año en ciclos_archivados y las borra de la base activa. */
export async function cerrarCiclo(anio: number): Promise<number> {
  const novs = await novedadesRango(`${anio}-01-01`, `${anio}-12-31`)
  const r = await db().from('ciclos_archivados').upsert({ id: String(anio), anio, created_at: new Date().toISOString(), data: { totalNovedades: novs.length, novedades: novs } })
  if (r.error) throw new Error(r.error.message)
  if (novs.length) { const d = await db().from('novedades').delete().in('id', novs.map(n => n.id)); if (d.error) throw new Error(d.error.message) }
  return novs.length
}
export async function restaurarCiclo(id: string) {
  const r = await db().from('ciclos_archivados').select('*').eq('id', id).maybeSingle()
  if (r.error) throw new Error(r.error.message)
  const novs = ((r.data?.data as { novedades?: Novedad[] })?.novedades || []).map(n => ({ ...n, id: n.id || uuid() }))
  if (novs.length) { const i = await db().from('novedades').insert(novs); if (i.error) throw new Error(i.error.message) }
}

// ── Importación masiva de docentes ──
export async function insertarDocentes(lista: DatosDocente[], anio: number): Promise<number> {
  const filas = lista.map(d => ({ id: uuid(), ...filaDocente(d, anio) }))
  if (!filas.length) return 0
  const r = await db().from('docentes').insert(filas)
  if (r.error) throw new Error(r.error.message)
  return filas.length
}

// ── Estudiantes: materias por carrera (config 'materias_carrera') ──
export type MateriaCarrera = { id: string; nombre: string; horario: Horario }
export type MateriasPorCarrera = Record<string, Record<string, MateriaCarrera[]>>
export async function cargarMateriasCarrera(): Promise<MateriasPorCarrera> {
  const r = await db().from('config').select('*').eq('id', 'materias_carrera').maybeSingle()
  return ((r.data?.data as MateriasPorCarrera) || {})
}
export async function guardarMateriasCarrera(m: MateriasPorCarrera) {
  const r = await db().from('config').upsert({ id: 'materias_carrera', data: m })
  if (r.error) throw new Error(r.error.message)
}

export type EstadoMateria = 'cursa' | 'virtual' | 'equiv' | 'no'
export type DatosEstudiante = { nombre: string; apellido: string; carrera: string; anioCarrera: number; estados: Record<string, EstadoMateria>; horario: Horario; notas: string }
const ORD = ['', '1°', '2°', '3°', '4°', '5°']
function filaEstudiante(e: DatosEstudiante, anio: number) {
  return { nombre: e.nombre, apellido: e.apellido, cargo: `${ORD[e.anioCarrera] || e.anioCarrera + '°'} Año`, area: e.carrera, nivel: 'estudiantes', tipo_hs: 'reloj', horario: e.horario,
    materiasestado: e.estados, materias: '', notas: e.notas, grupos: [], jubilado: false, faltasMes: 0, faltasAnio: 0, anio }
}
export async function crearEstudiante(e: DatosEstudiante, anio: number) {
  const r = await db().from('docentes').insert({ id: uuid(), ...filaEstudiante(e, anio) }); if (r.error) throw new Error(r.error.message)
}
export async function actualizarEstudiante(id: string, e: DatosEstudiante, anio: number) {
  const r = await db().from('docentes').update(filaEstudiante(e, anio)).eq('id', id); if (r.error) throw new Error(r.error.message)
}
export async function estadosMateriasEstudiante(id: string): Promise<Record<string, EstadoMateria>> {
  const r = await db().from('docentes').select('materiasestado').eq('id', id).maybeSingle()
  const v = r.data?.materiasestado
  if (!v) return {}
  try { return typeof v === 'string' ? JSON.parse(v) : v } catch { return {} }
}

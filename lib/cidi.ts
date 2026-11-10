import {
  LABELS, TIPOS, TIPOS_CON_DOCS, fechaDate, fmtFecha, keyOrden, sumarDias,
  type Docente, type Novedad, type TipoNovedad,
} from './domain'

// Exportación semanal de novedades para cargar a mano en CIDI (regla RN1: carga semanal fija).
// No hay conexión con CIDI: se arma el archivo y se registra qué semanas ya se cargaron.

/** Código que CIDI usa para cada tipo de novedad. Lo completa administración en Configuración. */
export type FormatoCidi = { codigos: Partial<Record<TipoNovedad, string>>; incluirSinCodigo: boolean }
export const FORMATO_INICIAL: FormatoCidi = { codigos: {}, incluirSinCodigo: true }

export type SemanaCargada = { lunes: string; cargadaPor: string; cargadaEl: string; filas: number }

/** Lo mínimo de una persona del personal que necesita la exportación. */
export type PersonaCidi = Pick<Docente, 'id' | 'nombre' | 'apellido' | 'cargo'> & { nivel: string }

export const TIPOS_CIDI: TipoNovedad[] = TIPOS.filter(t => t !== 'presente')
export const COLUMNAS_CIDI = ['Apellido', 'Nombre', 'Cargo', 'Nivel', 'Fecha', 'Novedad', 'Código CIDI', 'Observación']

/** Lunes de la semana de una fecha (AAAA-MM-DD). */
export function lunesDe(f: string) {
  const d = fechaDate(f)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return fmtFecha(d)
}
export const semanaAnterior = (hoy: string) => sumarDias(lunesDe(hoy), -7)
export const viernesDe = (lunes: string) => sumarDias(lunes, 4)

export type ResultadoCidi = {
  filas: (string | number)[][]
  /** Tipos de novedad de la semana que no tienen código CIDI cargado */
  sinCodigo: TipoNovedad[]
  /** Novedades que requieren documentación y todavía no la tienen */
  sinDocumentacion: number
  /** Filas omitidas por no tener código (cuando no se incluyen) */
  omitidas: number
}

/** Arma las filas de la semana (lunes a viernes) con las novedades del personal, ordenadas por apellido y fecha. */
export function filasCidi(docentes: PersonaCidi[], novedades: Novedad[], lunes: string, formato: FormatoCidi): ResultadoCidi {
  const viernes = viernesDe(lunes)
  const mapa = new Map(docentes.map(d => [d.id, d]))
  const sinCodigo = new Set<TipoNovedad>()
  let sinDocumentacion = 0, omitidas = 0
  const lista = novedades
    .filter(n => n.fecha >= lunes && n.fecha <= viernes && n.tipo !== 'presente' && mapa.has(n.docente_id))
    .sort((a, b) => keyOrden(mapa.get(a.docente_id)!).localeCompare(keyOrden(mapa.get(b.docente_id)!)) || a.fecha.localeCompare(b.fecha))
  const filas: (string | number)[][] = []
  for (const n of lista) {
    const d = mapa.get(n.docente_id)!
    const codigo = (formato.codigos[n.tipo] || '').trim()
    if (!codigo) sinCodigo.add(n.tipo)
    if (TIPOS_CON_DOCS.includes(n.tipo) && !n.docsEntregados) sinDocumentacion++
    if (!codigo && !formato.incluirSinCodigo) { omitidas++; continue }
    const [y, m, dd] = n.fecha.split('-')
    filas.push([d.apellido.trim(), d.nombre.trim(), d.cargo, d.nivel, `${dd}/${m}/${y}`, LABELS[n.tipo], codigo, n.obs || ''])
  }
  return { filas, sinCodigo: [...sinCodigo], sinDocumentacion, omitidas }
}

/** Semanas completas (desde el inicio del ciclo hasta la semana anterior) que todavía no se marcaron como cargadas. */
export function semanasSinCargar(cargadas: SemanaCargada[], hoy: string, cicloInicio: string, maximo = 8): string[] {
  const hechas = new Set(cargadas.map(s => s.lunes))
  const out: string[] = []
  const primera = lunesDe(cicloInicio)
  for (let l = semanaAnterior(hoy); l >= primera && out.length < maximo; l = sumarDias(l, -7)) if (!hechas.has(l)) out.push(l)
  return out
}

/** «2 al 6 de noviembre de 2026» */
export function textoSemana(lunes: string) {
  const v = fechaDate(viernesDe(lunes)), l = fechaDate(lunes)
  const mes = (d: Date) => d.toLocaleDateString('es-AR', { month: 'long' })
  return l.getMonth() === v.getMonth()
    ? `${l.getDate()} al ${v.getDate()} de ${mes(v)} de ${v.getFullYear()}`
    : `${l.getDate()} de ${mes(l)} al ${v.getDate()} de ${mes(v)} de ${v.getFullYear()}`
}

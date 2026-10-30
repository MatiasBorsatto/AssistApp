import { fechaDate, hoyStr, nombreMostrar, type Docente, type Novedad, type TipoNovedad } from './domain'

export const ALERTA_DIAS_ANTES = 7
export const TIPOS_CON_VENCIMIENTO: TipoNovedad[] = ['lic_embarazo', 'lic_gremial', 'carpeta_psiq', 'medica', 'medica_familiar', 'duelo', 'paro']

export type Alerta = {
  docenteId: string
  docenteNombre: string
  tipo: TipoNovedad
  fecha: string
  durVence: string | null
  diffDias: number | null
  diasTranscurridos?: number
  novedadId: string
  esVencimiento: boolean
}

/**
 * Alertas de vencimiento (licencias que vencen en ≤7 días) y de tratamientos largos
 * (10+ días corridos con el mismo estado activo hoy). Portado de calcularAlertas.
 */
export function calcularAlertas(docs: (Docente & { estadoHoy: string })[], novs: Novedad[]): Alerta[] {
  const hoyIso = hoyStr()
  const hoy = fechaDate(hoyIso)
  const hace10 = new Date(hoy); hace10.setDate(hace10.getDate() - 10)
  const hace10Str = `${hace10.getFullYear()}-${String(hace10.getMonth() + 1).padStart(2, '0')}-${String(hace10.getDate()).padStart(2, '0')}`
  const alertas: Alerta[] = []

  novs.filter(n => n.durVence && n.durVence >= hoyIso && TIPOS_CON_VENCIMIENTO.includes(n.tipo)).forEach(n => {
    const diff = Math.round((fechaDate(n.durVence!).getTime() - hoy.getTime()) / 86400000)
    if (diff < 0 || diff > ALERTA_DIAS_ANTES) return
    const doc = docs.find(d => d.id === n.docente_id)
    if (!doc || doc.jubilado) return
    alertas.push({ docenteId: doc.id, docenteNombre: nombreMostrar(doc), tipo: n.tipo, fecha: n.fecha, durVence: n.durVence!, diffDias: diff, novedadId: n.id, esVencimiento: true })
  })

  const masAntiguo: Record<string, Novedad> = {}
  novs.filter(n => TIPOS_CON_VENCIMIENTO.includes(n.tipo) && n.fecha <= hace10Str && n.fecha <= hoyIso).forEach(n => {
    const k = `${n.docente_id}_${n.tipo}`
    if (!masAntiguo[k] || n.fecha < masAntiguo[k].fecha) masAntiguo[k] = n
  })
  Object.values(masAntiguo).forEach(n => {
    const doc = docs.find(d => d.id === n.docente_id)
    if (!doc || doc.jubilado || doc.estadoHoy !== n.tipo) return
    const dias = Math.round((hoy.getTime() - fechaDate(n.fecha).getTime()) / 86400000)
    if (dias < 10) return
    if (alertas.some(a => a.docenteId === n.docente_id && a.tipo === n.tipo)) return
    alertas.push({ docenteId: doc.id, docenteNombre: nombreMostrar(doc), tipo: n.tipo, fecha: n.fecha, durVence: null, diffDias: null, diasTranscurridos: dias, novedadId: n.id, esVencimiento: false })
  })

  return alertas.sort((a, b) => {
    if (a.esVencimiento !== b.esVencimiento) return a.esVencimiento ? -1 : 1
    if (a.esVencimiento) return (a.diffDias || 0) - (b.diffDias || 0)
    return (b.diasTranscurridos || 0) - (a.diasTranscurridos || 0)
  })
}

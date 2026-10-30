import {
  DIA_IDX, TIPOS, diasConHorario, esFalta as _esFalta, esFaltaCualquiera, esFeriado, fechaDate, fmtFecha, nombreMostrar,
  type Config, type Docente, type Novedad, type TipoNovedad,
} from './domain'

export type ItemRanking = {
  id: string
  nombre: string
  cargo: string
  contadores: Record<TipoNovedad, number>
  totalAusencias: number
  diasDebVenir: number
  presentesAuto: number
  novedades: Novedad[]
}
void _esFalta

/** Ranking de ausentismo/presentismo en [desde, hasta]. Portado de cargarRanking de assistapp2. */
export function calcularRanking(cfg: Config, docentes: Docente[], novs: Novedad[], desde: string, hasta: string): ItemRanking[] {
  const porDoc: Record<string, Novedad[]> = {}
  novs.filter(n => n.fecha >= desde && n.fecha <= hasta).forEach(n => { (porDoc[n.docente_id] ||= []).push(n) })

  return docentes.map(doc => {
    const nvs = (porDoc[doc.id] || []).sort((a, b) => a.fecha.localeCompare(b.fecha))
    const contadores = Object.fromEntries(TIPOS.map(t => [t, 0])) as Record<TipoNovedad, number>
    let totalAusencias = 0
    nvs.forEach(n => {
      if (contadores[n.tipo] !== undefined) contadores[n.tipo]++
      if (esFaltaCualquiera(n.tipo)) totalAusencias++
    })
    const porFecha: Record<string, Novedad> = {}
    nvs.forEach(n => { if (n.tipo !== 'presente') porFecha[n.fecha] = n })
    const idxs = diasConHorario(doc.horario).map(d => DIA_IDX[d])
    let diasHab = 0, presentes = 0
    const cur = fechaDate(desde), fin = fechaDate(hasta)
    while (cur <= fin) {
      const dia = cur.getDay()
      if (dia !== 0 && dia !== 6) {
        const f = fmtFecha(cur)
        if (!esFeriado(cfg, f)) {
          const tiene = idxs.includes(dia)
          const nov = porFecha[f]
          if (tiene || (desde === hasta && nov)) {
            // Novedades que no bajan presentismo (licencias, paro, etc.) no cuentan como día a cumplir
            const sinDescuento = nov && !esFaltaCualquiera(nov.tipo)
            if (!sinDescuento) { diasHab++; if (!nov) presentes++ }
          }
        }
      }
      cur.setDate(cur.getDate() + 1)
    }
    return { id: doc.id, nombre: nombreMostrar(doc), cargo: doc.cargo || '—', contadores, totalAusencias, diasDebVenir: diasHab, presentesAuto: presentes, novedades: nvs }
  })
}

/** % de asistencia del ítem (sólo las faltas reales bajan el %). -1 = sin datos. */
export function pctAsistenciaItem(it: ItemRanking): number {
  return it.diasDebVenir === 0 ? -1 : Math.round(((it.diasDebVenir - it.totalAusencias) / it.diasDebVenir) * 100)
}
/** % usado en la solapa Ausentismo: presentes / (presentes + faltas). */
export function pctPresenteItem(it: ItemRanking): number {
  const tot = it.presentesAuto + it.totalAusencias
  return tot > 0 ? Math.round((it.presentesAuto / tot) * 100) : -1
}

import type { ConfigDemo } from './fichaje'

export type TipoDia = 'fuera' | 'finde' | 'feriado' | 'clase'
export type Evento = { desde: string; hasta: string; titulo: string; detalle?: string; tone: 'success' | 'warning' | 'blue' | 'danger' }

const f = (iso: string) => new Date(iso + 'T12:00:00')
export const aIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Qué tipo de día es: con clases, feriado/receso, fin de semana o fuera del ciclo lectivo. */
export function tipoDia(config: ConfigDemo, iso: string): { tipo: TipoDia; nombre?: string } {
  if (iso < config.ciclo.inicio || iso > config.ciclo.fin) return { tipo: 'fuera' }
  const wd = f(iso).getDay()
  if (wd === 0 || wd === 6) return { tipo: 'finde' }
  const fer = config.feriados.find(x => x.fecha === iso)
  if (fer) return { tipo: 'feriado', nombre: fer.nombre }
  return { tipo: 'clase' }
}

/** Días de clase del ciclo: total, ya pasados y restantes. */
export function resumenCiclo(config: ConfigDemo, hoy: string) {
  let total = 0, pasados = 0
  const cur = f(config.ciclo.inicio), fin = f(config.ciclo.fin)
  while (cur <= fin) {
    const iso = aIso(cur)
    if (tipoDia(config, iso).tipo === 'clase') { total++; if (iso <= hoy) pasados++ }
    cur.setDate(cur.getDate() + 1)
  }
  return { total, pasados, restantes: total - pasados, pct: total ? Math.round((pasados / total) * 100) : 0 }
}

export const eventosDelDia = (eventos: Evento[], iso: string) => eventos.filter(e => iso >= e.desde && iso <= e.hasta)

/** Semanas de un mes, empezando en lunes. Los días de otros meses vienen como null. */
export function semanasDelMes(anio: number, mes: number): (string | null)[][] {
  const primero = new Date(anio, mes, 1)
  const offset = (primero.getDay() + 6) % 7
  const dias = new Date(anio, mes + 1, 0).getDate()
  const celdas: (string | null)[] = [...Array(offset).fill(null), ...Array.from({ length: dias }, (_, i) => aIso(new Date(anio, mes, i + 1)))]
  while (celdas.length % 7) celdas.push(null)
  return Array.from({ length: celdas.length / 7 }, (_, i) => celdas.slice(i * 7, i * 7 + 7))
}

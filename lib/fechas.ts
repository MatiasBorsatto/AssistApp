import { fechasHabiles } from './domain'

const MES = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sep.', 'oct.', 'nov.', 'dic.']
const f = (iso: string) => new Date(iso + 'T12:00:00')

/** 22 oct. */
export const fechaCorta = (iso: string) => `${f(iso).getDate()} ${MES[f(iso).getMonth()].replace(".", "")}.`
/** Días corridos entre dos fechas, inclusive. */
export const diasCorridos = (desde: string, hasta: string) => Math.round((f(hasta).getTime() - f(desde).getTime()) / 86400000) + 1
/** "22 oct." o "22 oct. → 24 oct." */
export const rangoCorto = (desde: string, hasta: string) => (desde === hasta ? fechaCorta(desde) : `${fechaCorta(desde)} → ${fechaCorta(hasta)}`)
/** "3 días hábiles" (lunes a viernes) */
export const diasHabilesTxt = (desde: string, hasta: string) => { const n = fechasHabiles(desde, hasta).length; return `${n} día${n === 1 ? '' : 's'} hábil${n === 1 ? '' : 'es'}` }
/** ¿La fecha cae dentro del rango? */
export const enRango = (iso: string, desde: string, hasta: string) => iso >= desde && iso <= hasta

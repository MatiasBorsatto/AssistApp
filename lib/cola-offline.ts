import type { Fichaje } from './fichaje'

// RNF2: si no hay conexión, el fichaje se guarda en el celular y se envía cuando vuelve la red.
const CLAVE = 'asistapp-cola-fichajes'

export type FichajeEnCola = Fichaje & { id: string; guardadoEn: string }

export function leerCola(): FichajeEnCola[] {
  try { return JSON.parse(localStorage.getItem(CLAVE) || '[]') } catch { return [] }
}

function escribirCola(cola: FichajeEnCola[]) {
  try { localStorage.setItem(CLAVE, JSON.stringify(cola)) } catch { /* sin almacenamiento: el fichaje sigue en pantalla */ }
}

/** Guarda un fichaje sin conexión y devuelve la cola actualizada. */
export function encolar(f: Fichaje): FichajeEnCola[] {
  const cola = [...leerCola(), { ...f, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, guardadoEn: new Date().toISOString() }]
  escribirCola(cola)
  return cola
}

/** Envía todo lo guardado sin conexión y vacía la cola. Devuelve cuántos se enviaron. */
export function sincronizarCola(enviar: (f: Fichaje) => void): number {
  const cola = leerCola()
  cola.forEach(enviar)
  escribirCola([])
  return cola.length
}

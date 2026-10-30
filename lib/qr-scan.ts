import jsQR from 'jsqr'
import type { QrLeido, ReglasFichaje } from './fichaje'

/** Busca un código QR dentro de una imagen (un fotograma de la cámara). */
export function decodificar(data: Uint8ClampedArray, ancho: number, alto: number): string | null {
  const r = jsQR(data, ancho, alto, { inversionAttempts: 'dontInvert' })
  return r ? r.data : null
}

const clave = (lugar: string) => lugar.toUpperCase().replace(/\s+/g, '-')

/**
 * Compara lo que se leyó con el código de la escuela:
 *  - fijo: "ASISTAPP|<LUGAR>|INGRESO|V<n>" con la versión vigente
 *  - pantalla: "ASISTAPP|<LUGAR>|PANTALLA|…" (se renueva solo; acá se verifica el prefijo)
 */
export function clasificarQr(texto: string, reglas: ReglasFichaje): QrLeido {
  const partes = texto.trim().split('|')
  if (partes[0] !== 'ASISTAPP' || partes[1] !== clave(reglas.lugar)) return 'otro'
  if (reglas.qrModo === 'pantalla') return partes[2] === 'PANTALLA' ? 'vigente' : 'anterior'
  if (partes[2] !== 'INGRESO') return 'anterior'
  const version = parseInt((partes[3] || '').replace(/^V/i, ''), 10)
  return version === reglas.qrVersion ? 'vigente' : 'anterior'
}

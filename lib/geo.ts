// Lectura del GPS real del celular para el fichaje.

export type Posicion = { lat: number; lng: number; precision: number }
export type ErrorGps = 'no_soportado' | 'permiso' | 'sin_senal' | 'tiempo'

export const MENSAJE_GPS: Record<ErrorGps, string> = {
  no_soportado: 'Este navegador no permite leer la ubicación. Probá desde el navegador del celular.',
  permiso: 'No diste permiso para usar la ubicación. Habilitalo en la configuración del navegador y volvé a intentar.',
  sin_senal: 'El celular no pudo obtener la ubicación. Revisá que el GPS esté activado.',
  tiempo: 'El GPS tardó demasiado en responder.',
}

/** Pide la ubicación actual. Si no responde dentro del plazo, falla con 'tiempo'. */
export function obtenerUbicacion(plazoMs: number): Promise<Posicion> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { reject('no_soportado' as ErrorGps); return }
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, precision: Math.round(p.coords.accuracy) }),
      e => reject((e.code === e.PERMISSION_DENIED ? 'permiso' : e.code === e.TIMEOUT ? 'tiempo' : 'sin_senal') as ErrorGps),
      { enableHighAccuracy: true, timeout: plazoMs, maximumAge: 0 },
    )
  })
}

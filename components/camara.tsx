'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { decodificar } from '@/lib/qr-scan'

export type ErrorCamara = 'permiso' | 'sin_camara' | 'insegura' | 'no_soportada' | 'otro'
export const MENSAJE_CAMARA: Record<ErrorCamara, string> = {
  permiso: 'No diste permiso para usar la cámara. Habilitala en el navegador o usá el escaneo simulado.',
  sin_camara: 'No se encontró una cámara en este dispositivo. Podés usar el escaneo simulado.',
  insegura: 'La cámara solo funciona en páginas seguras (HTTPS o localhost).',
  no_soportada: 'Este navegador no permite usar la cámara.',
  otro: 'No se pudo iniciar la cámara. Podés usar el escaneo simulado.',
}

/**
 * Visor con la cámara real del dispositivo. Lee fotogramas, busca un QR y avisa apenas encuentra uno.
 * Se apaga sola al leer, al cerrar o al desmontarse (la luz de la cámara no queda prendida).
 */
export function VisorCamara({ onLeido, onError, onCerrar }: { onLeido: (texto: string) => void; onError: (e: ErrorCamara) => void; onCerrar: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [lista, setLista] = useState(false)

  useEffect(() => {
    let vivo = true
    let stream: MediaStream | null = null
    let raf = 0
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    const apagar = () => { cancelAnimationFrame(raf); stream?.getTracks().forEach(t => t.stop()); stream = null }

    async function iniciar() {
      if (typeof window !== 'undefined' && !window.isSecureContext) { onError('insegura'); return }
      if (!navigator.mediaDevices?.getUserMedia) { onError('no_soportada'); return }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false })
        if (!vivo) { apagar(); return }
        const v = video.current!
        v.srcObject = stream
        await v.play()
        setLista(true)
        const leer = () => {
          if (!vivo) return
          if (v.readyState >= 2 && v.videoWidth && ctx) {
            // Se reduce el fotograma para que la lectura sea rápida en celulares
            const escala = Math.min(1, 640 / v.videoWidth)
            canvas.width = Math.round(v.videoWidth * escala); canvas.height = Math.round(v.videoHeight * escala)
            ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const texto = decodificar(img.data, img.width, img.height)
            if (texto) { apagar(); onLeido(texto); return }
          }
          raf = requestAnimationFrame(leer)
        }
        raf = requestAnimationFrame(leer)
      } catch (e) {
        const n = (e as DOMException)?.name
        onError(n === 'NotAllowedError' || n === 'SecurityError' ? 'permiso' : n === 'NotFoundError' || n === 'OverconstrainedError' ? 'sin_camara' : 'otro')
      }
    }
    iniciar()
    return () => { vivo = false; apagar() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="scanner leyendo camara" role="img" aria-label="Cámara del celular buscando un código QR">
      <video ref={video} muted playsInline className="camara-video" />
      <span className="sc-c tl" /><span className="sc-c tr" /><span className="sc-c bl" /><span className="sc-c br" /><span className="scan-line" />
      <div className="sc-texto sobre-video"><Camera size={22} /><strong>{lista ? 'Apuntá al código QR' : 'Iniciando la cámara…'}</strong></div>
      <button type="button" className="mini-btn camara-cerrar" onClick={onCerrar}>Cerrar cámara</button>
    </div>
  )
}

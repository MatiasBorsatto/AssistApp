'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Download, Printer, QrCode, X } from 'lucide-react'

/** Texto del código fijo: no incluye la fecha, se imprime una sola vez. Cambia sólo si se regenera. */
export const textoQrFijo = (lugar: string, version: number) => `ASISTAPP|${lugar.toUpperCase().replace(/\s+/g, '-')}|INGRESO|V${version}`

export function useQr(texto: string, ancho: number) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    QRCode.toDataURL(texto, { margin: 1, width: ancho, errorCorrectionLevel: 'M', color: { dark: '#1f1300', light: '#ffffff' } }).then(setSrc).catch(() => setSrc(''))
  }, [texto, ancho])
  return src
}

export function QrImagen({ texto, tam = 150 }: { texto: string; tam?: number }) {
  const src = useQr(texto, 300)
  return src
    // eslint-disable-next-line @next/next/no-img-element
    ? <img className="qr-real" src={src} width={tam} height={tam} alt="Código QR de ingreso a la institución" />
    : <div className="qr-symbol"><QrCode size={46} /></div>
}

/** Botones Imprimir / Descargar + la hoja que se imprime (se hace una sola vez). */
export function QrAcciones({ lugar, version, onNotify }: { lugar: string; version: number; onNotify: (m: string) => void }) {
  const texto = textoQrFijo(lugar, version)
  const grande = useQr(texto, 900)
  const imprimir = () => { onNotify('Abriendo la impresión del código QR…'); setTimeout(() => window.print(), 200) }
  const descargar = () => { const a = document.createElement('a'); a.href = grande; a.download = `QR-ingreso-v${version}.png`; a.click(); onNotify(`Código QR descargado (QR-ingreso-v${version}.png).`) }
  return <>
    <div className="qr-print-sheet" aria-hidden="true">
      <h1>ASISTAPP</h1><h2>{lugar}</h2>
      {grande && /* eslint-disable-next-line @next/next/no-img-element */ <img src={grande} alt="" />}
      <p className="qr-print-lema">Escaneá este código con la app para registrar tu ingreso</p>
      <ol><li>Abrí ASISTAPP en tu celular e ingresá a “Registrar asistencia”.</li><li>Apuntá la cámara a este código.</li><li>Verificá que estés dentro de la escuela y conectado a su Wi-Fi.</li></ol>
      <small>Código permanente · versión {version}. Si se pierde o se daña, pedí uno nuevo a administración.</small>
    </div>
    <div className="qr-acciones">
      <button className="button secondary inline" onClick={imprimir} disabled={!grande}><Printer size={15} />Imprimir QR</button>
      <button className="button secondary inline" onClick={descargar} disabled={!grande}><Download size={15} />Descargar PNG</button>
    </div>
  </>
}

/** Modo opcional: una tablet o pantalla en la puerta muestra un código que se renueva solo cada pocos segundos. Nada que imprimir. */
export function PantallaIngreso({ lugar, segundos = 30, onClose }: { lugar: string; segundos?: number; onClose: () => void }) {
  // El código se fija al empezar cada período (vence); la cuenta regresiva sólo actualiza el contador.
  const [ahora, setAhora] = useState(() => Date.now())
  const [vence, setVence] = useState(() => Date.now() + segundos * 1000)
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => { if (ahora >= vence) setVence(ahora + segundos * 1000) }, [ahora, vence, segundos])
  const resta = Math.max(1, Math.round((vence - ahora) / 1000))
  const texto = `ASISTAPP|${lugar.toUpperCase().replace(/\s+/g, '-')}|PANTALLA|${vence.toString(36).slice(-6)}`
  return (
    <div className="modal-backdrop kiosko" role="dialog" aria-modal="true" aria-label="Pantalla de ingreso">
      <div className="kiosko-card">
        <button className="icon-button kiosko-x" aria-label="Cerrar pantalla de ingreso" onClick={onClose}><X size={18} /></button>
        <h2>{lugar}</h2>
        <p>Escaneá el código para registrar tu ingreso</p>
        <QrImagen texto={texto} tam={260} />
        <div className="kiosko-barra" aria-hidden="true"><span style={{ width: `${(resta / segundos) * 100}%` }} /></div>
        <small>Se renueva solo en {resta} s · Dejá esta pantalla fija en la puerta</small>
      </div>
    </div>
  )
}

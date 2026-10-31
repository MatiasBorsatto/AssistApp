'use client'

import { useId, useRef, useState } from 'react'
import { Camera, ImagePlus, Trash2 } from 'lucide-react'

const MAX_MB = 5

/** Lee un archivo y devuelve su contenido como data URL (para mostrarlo sin subirlo a ningún lado). */
export function leerArchivo(file: File): Promise<string> {
  return new Promise((ok, mal) => {
    const r = new FileReader()
    r.onload = () => ok(String(r.result))
    r.onerror = () => mal(new Error('No se pudo leer el archivo.'))
    r.readAsDataURL(file)
  })
}

export type Adjunto = { imagen?: string; nombre?: string }

/**
 * Selector de foto o certificado. En el celular ofrece sacar la foto en el momento o elegirla de la galería.
 * Muestra una vista previa grande para que se vea qué se está enviando.
 */
export function SubirImagen({ value, onChange, etiqueta = 'Foto o imagen del certificado', ayuda = 'Podés sacar la foto ahora o elegirla de tu galería.' }: {
  value: Adjunto; onChange: (a: Adjunto) => void; etiqueta?: string; ayuda?: string
}) {
  const id = useId()
  const ref = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')

  const elegir = async (f?: File) => {
    if (!f) return
    setError('')
    const esImagen = f.type.startsWith('image/'), esPdf = f.type === 'application/pdf'
    if (!esImagen && !esPdf) { setError('El archivo debe ser una imagen (JPG, PNG) o un PDF.'); return }
    if (f.size > MAX_MB * 1024 * 1024) { setError(`El archivo pesa más de ${MAX_MB} MB. Probá con una foto más liviana.`); return }
    try { onChange({ nombre: f.name, imagen: esImagen ? await leerArchivo(f) : undefined }) } catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="subir">
      <span className="subir-et" id={`${id}-et`}>{etiqueta}</span>
      {value.nombre ? (
        <div className="subir-prev">
          {value.imagen
            // eslint-disable-next-line @next/next/no-img-element
            ? <a href={value.imagen} target="_blank" rel="noreferrer" aria-label="Ver la imagen en grande"><img src={value.imagen} alt="Vista previa del certificado adjunto" /></a>
            : <div className="subir-pdf">PDF</div>}
          <div className="subir-info"><strong>{value.nombre}</strong><small>Adjunto listo para enviar</small>
            <div className="subir-acc"><button type="button" className="mini-btn" onClick={() => ref.current?.click()}><Camera size={13} /> Cambiar</button>
              <button type="button" className="mini-btn bad" onClick={() => { onChange({}); if (ref.current) ref.current.value = '' }}><Trash2 size={13} /> Quitar</button></div></div>
        </div>
      ) : (
        <button type="button" className="subir-zona" onClick={() => ref.current?.click()} aria-labelledby={`${id}-et`}>
          <ImagePlus size={26} /><strong>Tocá para sacar una foto o elegir un archivo</strong><small>{ayuda}</small>
        </button>
      )}
      <input ref={ref} type="file" accept="image/*,application/pdf" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={e => elegir(e.target.files?.[0])} />
      {error && <p role="alert" className="form-error subir-error">{error}</p>}
    </div>
  )
}

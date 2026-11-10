'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Download } from 'lucide-react'
import { exportarCSV, exportarExcel } from '@/lib/export'
import { LABELS, hoyStr, type Novedad } from '@/lib/domain'
import {
  COLUMNAS_CIDI, FORMATO_INICIAL, TIPOS_CIDI, filasCidi, lunesDe, semanaAnterior, semanasSinCargar, textoSemana, viernesDe,
  type FormatoCidi, type PersonaCidi, type SemanaCargada,
} from '@/lib/cidi'

/**
 * Exportación semanal de novedades para cargar a mano en CIDI. Se usa en el modo real (datos de Supabase)
 * y en la demostración (datos de ejemplo): cada uno le pasa de dónde salen las novedades y dónde se guardan las semanas.
 */
export function PanelCidi({ personal, cargarNovedades, cicloInicio, formato, cargadas, guardarSemanas, puedeMarcar, usuario, notify, avisos }: {
  personal: PersonaCidi[]
  cargarNovedades: (lunes: string) => Promise<Novedad[]>
  cicloInicio: string
  formato: FormatoCidi
  cargadas: SemanaCargada[]
  guardarSemanas: (s: SemanaCargada[]) => Promise<void>
  puedeMarcar: boolean
  usuario: string
  notify: (m: string) => void
  /** Avisos propios de cada modo para la semana elegida (por ejemplo, justificaciones sin resolver) */
  avisos?: (lunes: string) => string[]
}) {
  const hoy = hoyStr()
  const [lunes, setLunes] = useState(semanaAnterior(hoy))
  const [novs, setNovs] = useState<Novedad[] | null>(null)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    let vivo = true
    setNovs(null)
    cargarNovedades(lunes).then(n => { if (vivo) setNovs(n) }).catch(e => setError((e as Error).message))
    return () => { vivo = false }
  }, [lunes, cargarNovedades])

  const res = useMemo(() => (novs ? filasCidi(personal, novs, lunes, formato) : null), [novs, personal, lunes, formato])
  const estaSemana = cargadas.find(c => c.lunes === lunes)
  const pendientes = semanasSinCargar(cargadas, hoy, cicloInicio)
  const nombre = `CIDI_novedades_${lunes}_${viernesDe(lunes)}`
  const extra = avisos ? avisos(lunes) : []

  const marcar = async (cargada: boolean) => {
    if (!res) return
    if (cargada && !window.confirm(`¿Confirmás que la semana del ${textoSemana(lunes)} ya se cargó en CIDI?`)) return
    setGuardando(true); setError('')
    try {
      const nuevas = (cargada
        ? [...cargadas.filter(c => c.lunes !== lunes), { lunes, cargadaPor: usuario, cargadaEl: new Date().toISOString(), filas: res.filas.length }]
        : cargadas.filter(c => c.lunes !== lunes)).sort((a, b) => b.lunes.localeCompare(a.lunes))
      await guardarSemanas(nuevas)
      notify(cargada ? 'Semana marcada como cargada en CIDI.' : 'Se quitó la marca de carga en CIDI.')
    } catch (e) { setError((e as Error).message) } finally { setGuardando(false) }
  }

  return <section className="panel cidi-panel">
    {pendientes.length > 0 && <div className="result-banner warning" role="status"><AlertTriangle size={18} /><span>
      {pendientes.length === 1 ? 'Hay 1 semana' : `Hay ${pendientes.length} semanas`} sin marcar como cargada en CIDI: {pendientes.map(textoSemana).join(' · ')}.
    </span></div>}
    <div className="report-filters inner">
      <label>Semana (elegí cualquier día)<input type="date" value={lunes} onChange={e => e.target.value && setLunes(lunesDe(e.target.value))} /></label>
      <div className="export-buttons">
        <button disabled={!res?.filas.length} onClick={() => res && exportarExcel(res.filas, COLUMNAS_CIDI, nombre, 'CIDI')}><Download size={15} />Excel</button>
        <button disabled={!res?.filas.length} onClick={() => res && exportarCSV(res.filas, COLUMNAS_CIDI, nombre)}><Download size={15} />CSV</button>
      </div>
    </div>
    {error && <p role="alert" className="form-error flow-error">{error}</p>}
    <div className="cfg-body">
      <p><strong>Semana del {textoSemana(lunes)}</strong> (lunes a viernes) · {res ? `${res.filas.length} novedades para cargar` : 'Cargando…'}</p>
      {extra.map(a => <p key={a} className="result-banner warning" role="status"><AlertTriangle size={16} /><span>{a}</span></p>)}
      {res && res.sinDocumentacion > 0 && <p className="result-banner warning" role="status"><AlertTriangle size={16} /><span>{res.sinDocumentacion === 1 ? 'Una novedad' : `${res.sinDocumentacion} novedades`} todavía no tiene la documentación entregada. Revisalas antes de cargar la semana.</span></p>}
      {res && res.sinCodigo.length > 0 && <p className="result-banner info" role="status"><AlertTriangle size={16} /><span>Sin código CIDI cargado: {res.sinCodigo.map(t => LABELS[t]).join(', ')}. Completalo en «Formato para CIDI».{res.omitidas ? ` Se omitieron ${res.omitidas} filas.` : ''}</span></p>}
      {res && res.filas.length > 0 && <div className="table-scroll"><table><thead><tr>{COLUMNAS_CIDI.map(c => <th key={c}>{c.toUpperCase()}</th>)}</tr></thead>
        <tbody>{res.filas.map((f, i) => <tr key={i}>{f.map((v, j) => <td key={j}>{v === '' ? '—' : v}</td>)}</tr>)}</tbody></table></div>}
      {estaSemana
        ? <p className="result-banner success" role="status"><CheckCircle2 size={16} /><span>Cargada en CIDI por {estaSemana.cargadaPor} el {new Date(estaSemana.cargadaEl).toLocaleDateString('es-AR')} ({estaSemana.filas} novedades).</span></p>
        : <p className="empty-state">Esta semana todavía no se marcó como cargada en CIDI.</p>}
      {puedeMarcar && <div className="export-buttons">
        {estaSemana
          ? <button disabled={guardando} onClick={() => marcar(false)}>Quitar la marca</button>
          : <button disabled={guardando || !res} onClick={() => marcar(true)}><CheckCircle2 size={15} />Marcar como cargada en CIDI</button>}
      </div>}
      {cargadas.length > 0 && <>
        <h3>Últimas semanas cargadas</h3>
        <ul>{cargadas.slice(0, 8).map(c => <li key={c.lunes}>{textoSemana(c.lunes)} · {c.filas} novedades · {c.cargadaPor}</li>)}</ul>
      </>}
    </div>
  </section>
}

/** Código de cada tipo de novedad en CIDI. */
export function EditorFormatoCidi({ valor, onGuardar }: { valor: FormatoCidi; onGuardar: (f: FormatoCidi) => Promise<void> }) {
  const [f, setF] = useState<FormatoCidi>({ ...FORMATO_INICIAL, ...valor })
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  useEffect(() => { setF({ ...FORMATO_INICIAL, ...valor }) }, [valor])
  const guardar = async () => {
    setGuardando(true); setError('')
    try { await onGuardar(f) } catch (e) { setError((e as Error).message) } finally { setGuardando(false) }
  }
  return <>
    <div className="cfg-grid two">{TIPOS_CIDI.map(t => <label key={t} className="cfg-field">{LABELS[t]}
      <input value={f.codigos[t] || ''} onChange={e => setF({ ...f, codigos: { ...f.codigos, [t]: e.target.value } })} placeholder="Código en CIDI" /></label>)}</div>
    <label className="cfg-field"><span><input type="checkbox" checked={f.incluirSinCodigo} onChange={e => setF({ ...f, incluirSinCodigo: e.target.checked })} /> Incluir en la exportación las novedades sin código (quedan con la columna vacía)</span></label>
    <div className="export-buttons"><button disabled={guardando} onClick={guardar}>Guardar formato</button></div>
    {error && <p role="alert" className="form-error flow-error">{error}</p>}
  </>
}

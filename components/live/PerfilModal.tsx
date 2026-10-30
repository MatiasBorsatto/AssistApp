'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Pencil, X } from 'lucide-react'
import { useLive, type DocenteDia } from './LiveContext'
import { StatusBadge } from '../shared'
import { novedadesDocente, setDocsEntregados } from '@/lib/repo'
import { exportarExcel, exportarPDF } from '@/lib/export'
import {
  DIA_ABREV, LABELS, LABELS_SHORT, TIPOS, TIPOS_CON_DOCS, TIPO_TONO, etiquetaDocs, fechaDate, fmtFecha, hoyStr,
  nombreMostrar, resumenPeriodo, pctTono, type Novedad,
} from '@/lib/domain'

type Periodo = 'anio' | 'mes' | 'rango'

/** Perfil / historial de un docente: portado de "MODAL PERFIL / HISTORIAL" de assistapp2. */
export function PerfilModal({ docente, onClose, onEditar, onRegistrar }: {
  docente: DocenteDia; onClose: () => void; onEditar?: () => void; onRegistrar?: () => void
}) {
  const { config, puedeEditar, puedeVerTodo, notify, backup } = useLive()
  const [periodo, setPeriodo] = useState<Periodo>('anio')
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [mes, setMes] = useState(hoyStr().slice(0, 7))
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [todas, setTodas] = useState<Novedad[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true); setError('')
    try { setTodas(await novedadesDocente(docente.id)) } catch (e) { setError((e as Error).message) } finally { setCargando(false) }
  }, [docente.id])
  useEffect(() => { cargar() }, [cargar])

  const rango = useMemo(() => {
    if (periodo === 'anio') return { d: `${anio}-01-01`, h: `${anio}-12-31` }
    if (periodo === 'mes') {
      const [y, m] = mes.split('-').map(Number)
      return { d: `${mes}-01`, h: fmtFecha(new Date(y, m, 0)) }
    }
    return { d: desde, h: hasta }
  }, [periodo, anio, mes, desde, hasta])

  const items = useMemo(() => rango.d && rango.h ? todas.filter(n => n.fecha >= rango.d && n.fecha <= rango.h).sort((a, b) => b.fecha.localeCompare(a.fecha)) : [], [todas, rango])
  const resumen = useMemo(() => rango.d && rango.h ? resumenPeriodo(config, docente, items, rango.d, rango.h) : null, [config, docente, items, rango])
  const registros = items.filter(i => i.tipo !== 'presente')

  const porMes = useMemo(() => {
    const m: Record<string, Novedad[]> = {}
    registros.forEach(r => { (m[r.fecha.slice(0, 7)] ||= []).push(r) })
    return Object.keys(m).sort().reverse().map(k => ({ mes: k, items: m[k] }))
  }, [registros])

  const toggleDocs = async (n: Novedad) => {
    try { await setDocsEntregados(n.id, !n.docsEntregados); notify(!n.docsEntregados ? 'Documentación marcada como entregada.' : 'Documentación desmarcada.'); backup(`Documentación — ${docente.nombre} ${n.fecha}`); cargar() } catch (e) { setError((e as Error).message) }
  }

  const filasExport = registros.slice().reverse().map(r => [r.fecha, DIA_ABREV[fechaDate(r.fecha).getDay()], LABELS[r.tipo], r.modulo || '', r.obs || ''])
  const colsExport = ['Fecha', 'Día', 'Estado', 'Módulo', 'Comentario']
  const nombre = nombreMostrar(docente)
  const etiquetaPeriodo = `${rango.d} a ${rango.h}`

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" role="dialog" aria-modal="true" aria-label={`Historial de ${nombre}`} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div><h2>{nombre}</h2><p>{docente.cargo || 'Sin cargo'}{docente.area ? ` · ${docente.area}` : ''}</p></div>
          <button className="icon-button" aria-label="Cerrar" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="perfil-controles">
            <label>Período<select value={periodo} onChange={e => setPeriodo(e.target.value as Periodo)}><option value="anio">Año</option><option value="mes">Mes</option><option value="rango">Rango</option></select></label>
            {periodo === 'anio' && <label>Año<input type="number" min={2020} max={new Date().getFullYear() + 1} value={anio} onChange={e => setAnio(parseInt(e.target.value) || anio)} /></label>}
            {periodo === 'mes' && <label>Mes<input type="month" value={mes} onChange={e => setMes(e.target.value)} /></label>}
            {periodo === 'rango' && <><label>Desde<input type="date" value={desde} onChange={e => setDesde(e.target.value)} /></label><label>Hasta<input type="date" value={hasta} onChange={e => setHasta(e.target.value)} /></label></>}
          </div>
          <div className="perfil-acciones">
            {puedeVerTodo && <>
              <button className="mini-btn" disabled={!registros.length} onClick={() => exportarExcel(filasExport, colsExport, `Historial_${nombre}`)}><Download size={12} /> Excel</button>
              <button className="mini-btn" disabled={!registros.length} onClick={() => exportarPDF(`Historial — ${nombre}`, etiquetaPeriodo, colsExport, filasExport, `Historial_${nombre}`)}><Download size={12} /> PDF</button>
            </>}
            {puedeEditar && onRegistrar && <button className="mini-btn ok" onClick={onRegistrar}>Registrar novedad</button>}
            {puedeEditar && onEditar && <button className="mini-btn" onClick={onEditar}><Pencil size={12} /> Editar docente</button>}
          </div>

          {error && <p role="alert" className="form-error">{error}</p>}
          {cargando ? <p className="empty-state">Cargando historial…</p> : !resumen ? <p className="empty-state">Elegí un rango de fechas.</p> : <>
            {resumen.fechaJubilacion && <div className="jub-banner"><strong>Jubilado/a el {fechaDate(resumen.fechaJubilacion).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong><span>La asistencia queda registrada hasta esa fecha.</span></div>}
            <div className="perfil-stats">
              <div className="stat on"><strong>{resumen.presentes}/{resumen.diasHabiles}</strong><span>Presente</span></div>
              {TIPOS.filter(t => t !== 'presente' && (resumen.contadores[t] || 0) > 0).map(t => <div className="stat" key={t}><strong>{resumen.contadores[t]}</strong><span>{LABELS_SHORT[t]}</span></div>)}
            </div>
            <div className="perfil-resumen">
              <span>Días hábiles: <strong>{resumen.diasHabiles}</strong></span>
              <span>Presentes: <strong>{resumen.presentes}</strong></span>
              <span>Faltas: <strong>{resumen.totalFaltas}{resumen.faltasParciales > 0 ? ` + ${resumen.faltasParciales.toFixed(2)} parciales` : ''}</strong></span>
              <span>Asistencia: <StatusBadge tone={pctTono(resumen.pctAsistencia) === 'neutral' ? 'blue' : pctTono(resumen.pctAsistencia)}>{`${resumen.pctAsistencia}%`}</StatusBadge></span>
            </div>
            {!registros.length ? <p className="empty-state">Sin novedades en el período: todos los días hábiles están presentes.</p> : porMes.map(g => (
              <section className="hist-mes" key={g.mes} aria-label={g.mes}>
                <h3>{new Date(g.mes + '-01T12:00:00').toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}</h3>
                {g.items.map(n => (
                  <div className="hist-row" key={n.id}>
                    <strong className="hist-fecha">{DIA_ABREV[fechaDate(n.fecha).getDay()]} {fechaDate(n.fecha).getDate()}</strong>
                    <StatusBadge tone={TIPO_TONO[n.tipo] === 'neutral' ? 'blue' : TIPO_TONO[n.tipo]}>{LABELS[n.tipo]}</StatusBadge>
                    <span className="muted-cell hist-detalle">
                      {(n.modulos && n.modulos.length ? n.modulos.join(', ') : n.modulo) || ''}
                      {n.obs ? ` — ${n.obs}` : ''}
                      {(n.medicoNombre || n.matriculaMedico) ? ` · ${n.medicoNombre || ''}${n.matriculaMedico ? ` (Mat. ${n.matriculaMedico})` : ''}` : ''}
                    </span>
                    {puedeEditar && TIPOS_CON_DOCS.includes(n.tipo) && (
                      <label className={`docs-check ${n.docsEntregados ? 'on' : ''}`}><input type="checkbox" checked={!!n.docsEntregados} onChange={() => toggleDocs(n)} /> {etiquetaDocs(n.tipo)}</label>
                    )}
                  </div>
                ))}
              </section>
            ))}
          </>}
        </div>
        <div className="modal-footer"><button className="button secondary" onClick={onClose}>Cerrar</button></div>
      </div>
    </div>
  )
}

'use client'

import { useMemo, useState } from 'react'
import { FileSpreadsheet, FileText } from 'lucide-react'
import { PageHeading, StatusBadge } from './shared'
import { useDemoBus } from '@/lib/demo-bus'
import { courses } from '@/lib/data'
import { CONFIG_INICIAL } from '@/lib/fichaje'
import { PERIODOS, construirReporte, fechaLegible, type Periodo, type Reporte } from '@/lib/demo-report'
import { exportarExcelMulti, exportarPDFMulti } from '@/lib/export'
import type { Role } from '@/lib/roles'

const COLORES_DIST = ['#d98a0b', '#4b5d78', '#d64545']
const COLORES_MOT = ['#d98a0b', '#4b5d78', '#d64545', '#8a96a8', '#117a4f']
const tono = (p: number) => (p >= 90 ? 'success' : p >= 75 ? 'warning' : 'danger') as 'success' | 'warning' | 'danger'
const f1 = (n: number) => String(n).replace('.', ',')

function Delta({ value, prev, invert = false, unit = '%' }: { value: number; prev: number | null; invert?: boolean; unit?: string }) {
  if (prev === null) return <small className="delta"><span>Sin período anterior para comparar</span></small>
  const diff = Math.round((value - prev) * 10) / 10
  const good = invert ? diff <= 0 : diff >= 0
  return <small className={good ? 'delta good' : 'delta bad'}>{diff > 0 ? '▲ +' : diff < 0 ? '▼ ' : '= '}{f1(diff)}{unit} <span>vs. período anterior</span></small>
}

function Tarjeta({ titulo, sub, tabla, children }: { titulo: string; sub: string; tabla: React.ReactNode; children: React.ReactNode }) {
  const [t, setT] = useState(false)
  return <section className="panel chart-card"><div className="panel-header"><div><h2>{titulo}</h2><p>{sub}</p></div><button className="text-button" aria-pressed={t} onClick={() => setT(v => !v)}>{t ? 'Ver gráfico' : 'Ver como tabla'}</button></div><div className="chart-body">{t ? tabla : children}</div></section>
}

/** Reportes del Administrador y del Preceptor. Todo sale de los mismos datos, con nombres y fechas, y se exporta tal cual se ve. */
export function ReportsView({ role, onNotify }: { role: Role; onNotify: (m?: string) => void }) {
  const bus = useDemoBus()
  const esPrec = role === 'Preceptor'
  const config = bus?.config ?? CONFIG_INICIAL
  const [periodo, setPeriodo] = useState<Periodo>('Este mes')
  const alcances = esPrec ? ['Todos mis cursos', ...Object.keys(courses)] : ['Toda la institución', 'Nivel Primario', 'Nivel Secundario']
  const [alcance, setAlcance] = useState(alcances[0])
  const [tab, setTab] = useState<'resumen' | 'detalle'>('resumen')
  const hoy = new Date().toISOString().slice(0, 10)

  const datos = { role, config, justificaciones: bus?.justificaciones ?? [], fichajes: bus?.fichajes ?? {}, alcance }
  const rep: Reporte = useMemo(() => construirReporte({ ...datos, periodo, hoy }), [bus?.justificaciones, bus?.fichajes, config, periodo, alcance]) // eslint-disable-line react-hooks/exhaustive-deps
  const prev: Reporte | null = useMemo(() => {
    const d = new Date(hoy + 'T12:00:00')
    if (periodo === 'Esta semana') d.setDate(d.getDate() - 7); else if (periodo === 'Este mes') d.setDate(0); else d.setMonth(d.getMonth() - 3)
    const r = construirReporte({ ...datos, periodo, hoy: d.toISOString().slice(0, 10) })
    return r.personas.some(p => p.dias > 0) ? r : null
  }, [bus?.justificaciones, bus?.fichajes, config, periodo, alcance]) // eslint-disable-line react-hooks/exhaustive-deps

  const W = 520, H = 220, pad = 34
  const serie = rep.serie, bw = Math.min(54, (W - pad * 2) / Math.max(1, serie.length) - 18)
  const maxRank = Math.max(1, ...rep.ranking.map(r => r[1]))
  const totalMot = rep.motivos.reduce((a, m) => a + m[1], 0)
  const titulosRank = esPrec ? 'Ausentismo por curso' : 'Ausentismo por persona'
  const rango = `${fechaLegible(rep.desde)} al ${fechaLegible(rep.hasta)}`

  const nombreArchivo = `Asistencia_${periodo.replace(/\s+/g, '_')}_${alcance.replace(/\s+/g, '_')}_${hoy}`
  const hojas = () => {
    const resumen: (string | number)[][] = [
      ['Período', periodo], ['Desde', rep.desde], ['Hasta', rep.hasta], ['Alcance', alcance], [''], ['Asistencia promedio (%)', rep.kpi.asistencia], ['Ausentismo (%)', rep.kpi.ausentismo], ['Tardanzas (%)', rep.kpi.tardanzas],
      ['Justificaciones pendientes', rep.kpi.pendientes], [''], ...rep.distribucion.map(([n, v]) => [`Distribución · ${n} (%)`, v]),
    ]
    const personas = rep.personas.map(p => [p.nombre, p.rol, p.cargo, p.dias, p.presentes, p.tardanzas, p.justificadas, p.pendientes, p.injustificadas, p.pct])
    const novedades = rep.registros.map(r => [r.fecha, r.persona, r.rol, r.tipo, r.detalle])
    return { resumen, personas, novedades }
  }
  const colsP = [esPrec ? 'Alumno' : 'Persona', 'Rol', esPrec ? 'Curso' : 'Cargo', 'Días con clases', 'Presentes', 'Tardanzas', 'Ausencias justificadas', 'Justificación pendiente', 'Ausencias injustificadas', '% asistencia']
  const colsN = ['Fecha', esPrec ? 'Alumno' : 'Persona', 'Rol', 'Tipo', 'Detalle']
  const excel = () => { const h = hojas(); exportarExcelMulti([{ nombre: 'Resumen', columnas: ['Dato', 'Valor'], filas: h.resumen, anchos: [34, 36] }, { nombre: esPrec ? 'Por alumno' : 'Por persona', columnas: colsP, filas: h.personas }, { nombre: 'Novedades', columnas: colsN, filas: h.novedades }], nombreArchivo); onNotify('Excel descargado: incluye resumen, detalle con nombres y todas las novedades.') }
  const pdf = () => { const h = hojas(); exportarPDFMulti({ titulo: `Reporte de asistencia · ${esPrec ? 'Preceptoría' : 'Administración'}`, lineas: [`Período: ${periodo} (${rango})`, `Alcance: ${alcance}`, `Asistencia ${f1(rep.kpi.asistencia)}% · Ausentismo ${f1(rep.kpi.ausentismo)}% · Tardanzas ${f1(rep.kpi.tardanzas)}% · Justificaciones pendientes: ${rep.kpi.pendientes}`],
    secciones: [{ titulo: esPrec ? 'Detalle por alumno' : 'Detalle por persona', columnas: colsP.map(c => c.replace('Ausencias ', 'Aus. ').replace('Justificación pendiente', 'Just. pend.').replace('Días con clases', 'Días')), filas: h.personas.map(r => r.map(String)) }, { titulo: 'Novedades del período', columnas: colsN, filas: h.novedades.map(r => r.map(String)), vacio: 'No hubo novedades en este período.' }] }, nombreArchivo); onNotify('PDF descargado: incluye el detalle con nombres y fechas.') }

  return <>
    <PageHeading eyebrow="INFORMACIÓN Y ANÁLISIS" title="Reportes de asistencia" description={esPrec ? 'Mirá cómo viene la asistencia de tus cursos, alumno por alumno, y descargala.' : 'Mirá cómo viene la asistencia del personal, persona por persona, y descargala.'}
      action={<div className="descargas"><span>Descargar este reporte:</span><button className="button secondary" onClick={excel}><FileSpreadsheet size={16} />Excel</button><button className="button secondary" onClick={pdf}><FileText size={16} />PDF</button></div>} />

    <div className="report-filters">
      <label>Período<select value={periodo} onChange={e => setPeriodo(e.target.value as Periodo)}>{PERIODOS.map(p => <option key={p}>{p}</option>)}</select></label>
      <label>{esPrec ? 'Curso' : 'Área'}<select value={alcance} onChange={e => setAlcance(e.target.value)}>{alcances.map(a => <option key={a}>{a}</option>)}</select></label>
      <div className="tabs" role="tablist" aria-label="Qué querés ver">
        <button role="tab" aria-selected={tab === 'resumen'} className={tab === 'resumen' ? 'on' : ''} onClick={() => setTab('resumen')}>Resumen</button>
        <button role="tab" aria-selected={tab === 'detalle'} className={tab === 'detalle' ? 'on' : ''} onClick={() => setTab('detalle')}>{esPrec ? 'Detalle por alumno' : 'Detalle por persona'}</button>
      </div>
    </div>
    <p className="rango-rep">Del {rango}{rep.personas.length ? ` · ${rep.personas.length} ${esPrec ? 'alumnos' : 'personas'}` : ''}</p>

    {rep.personas.length === 0 ? <div className="vacio panel"><FileText size={30} /><strong>No hay datos para esta selección</strong><p>Probá con otro período o con otra {esPrec ? 'curso' : 'área'}.</p></div> : tab === 'resumen' ? <>
      <div className="kpi-layout">
        <section className="kpi-card kpi-wide" aria-label="Distribución de registros del período"><span>Cómo fue la asistencia · {periodo}</span>
          <div className="dist-row" role="img" aria-label={`Distribución: ${rep.distribucion.map(([n, v]) => `${n} ${f1(v)}%`).join(', ')}`}>
            <svg viewBox="0 0 120 120" className="dist-pie" aria-hidden="true">{rep.distribucion.map(([n, v], i) => { const antes = rep.distribucion.slice(0, i).reduce((a, x) => a + x[1], 0); const L = Math.max(v - 0.6, 0); return <circle key={n} cx="60" cy="60" r="36" fill="none" stroke={COLORES_DIST[i]} strokeWidth="34" pathLength="100" strokeDasharray={`${L} ${100 - L}`} strokeDashoffset={-antes} transform="rotate(-90 60 60)" /> })}</svg>
            <ul className="dist-legend">{rep.distribucion.map(([n, v], i) => <li key={n}><i style={{ background: COLORES_DIST[i] }} /><span>{n}</span><strong>{f1(v)}%</strong>
              {i === 0 && <Delta value={rep.kpi.asistencia} prev={prev?.kpi.asistencia ?? null} />}{i === 1 && <Delta value={rep.kpi.tardanzas} prev={prev?.kpi.tardanzas ?? null} invert />}{i === 2 && <Delta value={rep.kpi.ausentismo} prev={prev?.kpi.ausentismo ?? null} invert />}</li>)}</ul></div></section>
        <div className="kpi-card"><span>Justificaciones por revisar</span><strong>{rep.kpi.pendientes}</strong><small className="delta"><span>{rep.kpi.pendientes ? 'Revisalas en la sección Justificaciones' : 'No hay nada pendiente'}</span></small></div>
      </div>

      <Tarjeta titulo="Tendencia de asistencia" sub={`${periodo} · ${alcance}`} tabla={<table className="data-table"><thead><tr><th>Momento</th><th>Asistencia</th></tr></thead><tbody>{serie.map(s => <tr key={s.etiqueta}><td>{s.etiqueta}</td><td>{s.pct}%</td></tr>)}</tbody></table>}>
        {serie.length === 0 ? <p className="empty-state">No hubo días de clases en este período.</p> : <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Asistencia: ${serie.map(s => `${s.etiqueta} ${s.pct}%`).join(', ')}`} className="bar-chart">
          {[100, 75, 50].map(g => { const y = 20 + (H - 60) * (1 - (g - 40) / 60); return <g key={g}><line x1={pad} x2={W - 10} y1={y} y2={y} className="grid" /><text x={pad - 6} y={y + 4} textAnchor="end" className="axis">{g}%</text></g> })}
          {serie.map((s, i) => { const slot = (W - pad - 10) / serie.length; const x = pad + slot * i + (slot - bw) / 2; const h = (H - 60) * ((Math.max(40, s.pct) - 40) / 60); const y = 20 + (H - 60) - h; return <g key={s.etiqueta}><rect x={x} y={y} width={bw} height={h} rx={5} className="bar" /><text x={x + bw / 2} y={y - 6} textAnchor="middle" className="bar-value">{s.pct}%</text><text x={x + bw / 2} y={H - 14} textAnchor="middle" className="axis">{s.etiqueta}</text></g> })}</svg>}
      </Tarjeta>

      <div className="chart-pair">
        <Tarjeta titulo="Faltas por motivo" sub={`${totalMot} ausencias en el período`} tabla={<table className="data-table"><thead><tr><th>Motivo</th><th>Ausencias</th></tr></thead><tbody>{rep.motivos.map(([n, v]) => <tr key={n}><td>{n}</td><td>{v}</td></tr>)}</tbody></table>}>
          {totalMot === 0 ? <p className="empty-state">No hubo ausencias en este período.</p> : <><div className="stack" role="img" aria-label={`Faltas por motivo: ${rep.motivos.map(([n, v]) => `${n} ${v}`).join(', ')}`}>{rep.motivos.map(([n, v], i) => <span key={n} style={{ width: `${(v / totalMot) * 100}%`, background: COLORES_MOT[i % 5] }} />)}</div>
            <ul className="legend-list">{rep.motivos.map(([n, v], i) => <li key={n}><i style={{ background: COLORES_MOT[i % 5] }} /><span>{n}</span><strong>{v}</strong><em>{Math.round((v / totalMot) * 100)}%</em></li>)}</ul></>}
        </Tarjeta>
        <Tarjeta titulo={titulosRank} sub="Porcentaje de días con ausencia" tabla={<table className="data-table"><thead><tr><th>{esPrec ? 'Curso' : 'Persona'}</th><th>Ausentismo</th></tr></thead><tbody>{rep.ranking.map(([n, v]) => <tr key={n}><td>{n}</td><td>{f1(v)}%</td></tr>)}</tbody></table>}>
          <ul className="hbars" aria-label={titulosRank}>{rep.ranking.map(([n, v]) => <li key={n}><span className="hb-label">{n}</span><span className="hb-track"><span className="hb-fill" style={{ width: `${(v / maxRank) * 100}%` }} /></span><strong>{f1(v)}%</strong></li>)}</ul>
        </Tarjeta>
      </div>
    </> : <>
      <section className="panel table-panel"><div className="panel-header"><div><h2>{esPrec ? 'Asistencia de cada alumno' : 'Asistencia de cada persona'}</h2><p>Con nombre, días y motivos. Es lo mismo que se descarga.</p></div></div>
        <div className="table-scroll"><table><thead><tr><th>{esPrec ? 'ALUMNO' : 'PERSONA'}</th><th>{esPrec ? 'CURSO' : 'ROL'}</th><th>DÍAS</th><th>PRESENTES</th><th>TARDANZAS</th><th>JUSTIFICADAS</th><th>POR REVISAR</th><th>SIN JUSTIFICAR</th><th>ASISTENCIA</th></tr></thead><tbody>
          {rep.personas.map(p => <tr key={p.nombre}><td><strong>{p.nombre}</strong></td><td className="muted-cell">{esPrec ? p.cargo : p.rol}</td><td>{p.dias}</td><td>{p.presentes}</td><td>{p.tardanzas}</td><td>{p.justificadas}</td><td>{p.pendientes}</td><td>{p.injustificadas}</td><td><StatusBadge tone={tono(p.pct)}>{`${f1(p.pct)}%`}</StatusBadge></td></tr>)}
        </tbody></table></div></section>
      <section className="panel table-panel"><div className="panel-header"><div><h2>Novedades del período</h2><p>Cada ausencia o tardanza, con fecha y detalle</p></div></div>
        {rep.registros.length === 0 ? <p className="empty-state">No hubo novedades en este período.</p> : <div className="table-scroll"><table><thead><tr><th>FECHA</th><th>{esPrec ? 'ALUMNO' : 'PERSONA'}</th><th>TIPO</th><th>DETALLE</th></tr></thead><tbody>
          {rep.registros.map((r, i) => <tr key={i}><td>{fechaLegible(r.fecha)}</td><td><strong>{r.persona}</strong></td><td><StatusBadge tone={r.tipo === 'Tardanza' ? 'warning' : r.tipo === 'Ausencia justificada' ? 'success' : r.tipo.includes('pendiente') ? 'blue' : 'danger'}>{r.tipo}</StatusBadge></td><td className="muted-cell">{r.detalle}</td></tr>)}</tbody></table></div>}
      </section>
    </>}
  </>
}

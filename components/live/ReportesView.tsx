'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { useLive } from './LiveContext'
import { PageHeading, StatusBadge } from '../shared'
import { calcularRanking, pctAsistenciaItem, pctPresenteItem, type ItemRanking } from '@/lib/ranking'
import { guardarDato, leerDato, novedadesRango } from '@/lib/repo'
import { exportarExcel, exportarPDF } from '@/lib/export'
import { FORMATO_INICIAL, viernesDe, type FormatoCidi, type SemanaCargada } from '@/lib/cidi'
import { PanelCidi } from '../cidi'
import {
  DIA_IDX, LABELS, LABELS_SHORT, TIPOS, contarDias, diasConHorario, esFaltaCualquiera, esFeriado, fechaDate, fmtFecha, hoyStr, nombreMostrar, pctTono,
  type Novedad,
} from '@/lib/domain'

type Vista = 'ranking' | 'tendencias' | 'exportar' | 'cidi'
type PeriodoR = 'dia' | 'mes' | 'anio' | 'rango'
type TabRank = 'ausentismo' | 'presentismo' | 'tipo'
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const tn = (p: number) => { const t = pctTono(p); return t === 'neutral' ? 'blue' : t }

export function ReportesView() {
  const { puedeVerTodo } = useLive()
  const [vista, setVista] = useState<Vista>('ranking')
  if (!puedeVerTodo) return <><PageHeading eyebrow="INFORMACIÓN Y ANÁLISIS" title="Reportes" description="Los reportes están disponibles para administradores y directivos." /></>
  return <>
    <PageHeading eyebrow="INFORMACIÓN Y ANÁLISIS" title="Reportes de asistencia" description="Ranking de ausentismo, tendencias mensuales y exportación de datos." />
    <div className="report-filters"><div className="tabs" role="tablist" aria-label="Vista de reportes">
      {([['ranking', 'Ranking'], ['tendencias', 'Tendencias'], ['exportar', 'Exportar'], ['cidi', 'Para CIDI']] as [Vista, string][]).map(([k, l]) => <button key={k} role="tab" aria-selected={vista === k} className={vista === k ? 'on' : ''} onClick={() => setVista(k)}>{l}</button>)}
    </div></div>
    {vista === 'ranking' && <Ranking />}
    {vista === 'tendencias' && <Tendencias />}
    {vista === 'exportar' && <Exportar />}
    {vista === 'cidi' && <ExportarCidi />}
  </>
}

function rangoDe(p: PeriodoR, dia: string, mes: string, anio: number, d: string, h: string): [string, string] {
  if (p === 'dia') return [dia, dia]
  if (p === 'mes') { const [y, m] = mes.split('-').map(Number); return [`${mes}-01`, fmtFecha(new Date(y, m, 0))] }
  if (p === 'anio') return [`${anio}-01-01`, `${anio}-12-31`]
  return [d, h]
}

function Ranking() {
  const { docentes, config, fecha, anio } = useLive()
  const [p, setP] = useState<PeriodoR>('dia')
  const [dia, setDia] = useState(fecha)
  const [mes, setMes] = useState(hoyStr().slice(0, 7))
  const [an, setAn] = useState(anio)
  const [d, setD] = useState('')
  const [h, setH] = useState('')
  const [tab, setTab] = useState<TabRank>('ausentismo')
  const [novs, setNovs] = useState<Novedad[]>([])
  const [error, setError] = useState('')
  const [desde, hasta] = rangoDe(p, dia, mes, an, d, h)

  useEffect(() => {
    if (!desde || !hasta) { setNovs([]); return }
    let vivo = true
    novedadesRango(desde, hasta).then(r => { if (vivo) { setNovs(r); setError('') } }).catch(e => vivo && setError(e.message))
    return () => { vivo = false }
  }, [desde, hasta])

  const ranking = useMemo<ItemRanking[]>(() => desde && hasta ? calcularRanking(config, docentes, novs, desde, hasta) : [], [config, docentes, novs, desde, hasta])
  const lista = useMemo(() => {
    const porNombre = (a: ItemRanking, b: ItemRanking) => a.nombre.localeCompare(b.nombre, 'es')
    if (tab === 'ausentismo') return ranking.filter(r => r.totalAusencias > 0).sort((a, b) => b.totalAusencias - a.totalAusencias || porNombre(a, b))
    if (tab === 'presentismo') return ranking.slice().sort((a, b) => { const x = pctAsistenciaItem(a), y = pctAsistenciaItem(b); if (x === -1 && y === -1) return porNombre(a, b); if (x === -1) return 1; if (y === -1) return -1; return y - x || porNombre(a, b) })
    const tot = (r: ItemRanking) => TIPOS.filter(t => t !== 'presente').reduce((s, t) => s + (r.contadores[t] || 0), 0)
    return ranking.slice().sort((a, b) => tot(b) - tot(a) || porNombre(a, b))
  }, [ranking, tab])
  const max = Math.max(1, ...lista.map(r => r.totalAusencias))

  const exportar = (f: 'xlsx' | 'pdf') => {
    const cols = ['Docente', 'Cargo', 'Faltas', '% Asistencia', ...TIPOS.filter(t => t !== 'presente').map(t => LABELS_SHORT[t])]
    const filas = lista.map(r => { const pc = tab === 'ausentismo' ? pctPresenteItem(r) : pctAsistenciaItem(r); return [r.nombre, r.cargo, r.totalAusencias, pc < 0 ? '—' : `${pc}%`, ...TIPOS.filter(t => t !== 'presente').map(t => r.contadores[t] || 0)] })
    const nombre = `Ranking_${desde}_${hasta}`
    if (f === 'xlsx') exportarExcel(filas, cols, nombre); else exportarPDF('Ranking de ausentismo', `${desde} a ${hasta}`, cols, filas, nombre)
  }

  return <section className="panel">
    <div className="report-filters inner">
      <label>Período<select value={p} onChange={e => setP(e.target.value as PeriodoR)}><option value="dia">Día</option><option value="mes">Mes</option><option value="anio">Año</option><option value="rango">Rango</option></select></label>
      {p === 'dia' && <label>Día<input type="date" value={dia} onChange={e => setDia(e.target.value)} /></label>}
      {p === 'mes' && <label>Mes<input type="month" value={mes} onChange={e => setMes(e.target.value)} /></label>}
      {p === 'anio' && <label>Año<input type="number" value={an} onChange={e => setAn(parseInt(e.target.value) || an)} /></label>}
      {p === 'rango' && <><label>Desde<input type="date" value={d} onChange={e => setD(e.target.value)} /></label><label>Hasta<input type="date" value={h} onChange={e => setH(e.target.value)} /></label></>}
      <div className="export-buttons"><button onClick={() => exportar('xlsx')} disabled={!lista.length}><Download size={15} />Excel</button><button onClick={() => exportar('pdf')} disabled={!lista.length}><Download size={15} />PDF</button></div>
    </div>
    <div className="tabs tabs-inline" role="tablist" aria-label="Tipo de ranking">
      {([['ausentismo', 'Ausentismo'], ['presentismo', 'Presentismo'], ['tipo', 'Por tipo']] as [TabRank, string][]).map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
    </div>
    {error && <p role="alert" className="form-error flow-error">{error}</p>}
    {!desde || !hasta ? <p className="empty-state">Elegí las fechas del período.</p> : !lista.length ? <p className="empty-state">{tab === 'ausentismo' ? 'Sin ausencias en el período.' : 'Sin datos en el período.'}</p> : (
      <ol className="rank-lista">{lista.map((r, i) => {
        const pc = tab === 'ausentismo' ? pctPresenteItem(r) : pctAsistenciaItem(r)
        const regs = TIPOS.filter(t => t !== 'presente' && (r.contadores[t] || 0) > 0)
        return <li className="rank-item" key={r.id}>
          <span className="rank-num">{i + 1}</span>
          <div className="rank-info"><strong>{r.nombre}</strong><small>{r.cargo}</small>
            {tab === 'ausentismo' && <div className="hb-track"><span className="hb-fill" style={{ width: `${(r.totalAusencias / max) * 100}%`, background: '#d64545' }} /></div>}
            {tab === 'presentismo' && pc >= 0 && <div className="hb-track"><span className="hb-fill" style={{ width: `${pc}%` }} /></div>}
            {tab === 'tipo' ? <div className="rank-detalles">{regs.length ? regs.map(t => <span key={t} className="attach-chip">{LABELS_SHORT[t]} ({r.contadores[t]}): {r.novedades.filter(n => n.tipo === t).map(n => n.fecha.slice(8) + '/' + n.fecha.slice(5, 7)).join(', ')}</span>) : <span className="muted-cell">Sin novedades</span>}</div>
              : regs.length > 0 && <div className="rank-detalles">{regs.map(t => <span key={t} className={`attach-chip ${esFaltaCualquiera(t) ? 'fuerte' : ''}`}>{r.contadores[t]} {LABELS_SHORT[t]}</span>)}</div>}
          </div>
          <div className="rank-total">{tab === 'ausentismo' && <><strong>{r.totalAusencias}</strong><small>faltas</small></>}{pc >= 0 ? <StatusBadge tone={tn(pc)}>{`${pc}%`}</StatusBadge> : <span className="muted-cell">—</span>}</div>
        </li>
      })}</ol>)}
  </section>
}

function Tendencias() {
  const { docentes, config, grupos, anio: anioCtx } = useLive()
  const [anio, setAnio] = useState(anioCtx)
  const [grupo, setGrupo] = useState('')
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [vista, setVista] = useState<'anio' | 'mes'>('anio')
  const [novs, setNovs] = useState<Novedad[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    let vivo = true
    const d = vista === 'mes' ? `${anio}-${String(mes).padStart(2, '0')}-01` : `${anio}-01-01`
    const h = vista === 'mes' ? fmtFecha(new Date(anio, mes, 0)) : `${anio}-12-31`
    novedadesRango(d, h).then(r => { if (vivo) { setNovs(r); setError('') } }).catch(e => vivo && setError(e.message))
    return () => { vivo = false }
  }, [anio, mes, vista])

  const docs = useMemo(() => docentes.filter(d => !grupo || d.grupos.includes(grupo)), [docentes, grupo])
  const ids = useMemo(() => new Set(docs.map(d => d.id)), [docs])

  const porMes = useMemo(() => MESES.map((_, i) => {
    const m = `${anio}-${String(i + 1).padStart(2, '0')}`
    const ini = new Date(anio, i, 1), fin = new Date(anio, i + 1, 0)
    const hab = docs.reduce((s, d) => s + contarDias(config, d.horario, ini, fin), 0)
    const faltas = novs.filter(n => n.mes === m && ids.has(n.docente_id) && esFaltaCualquiera(n.tipo) && !esFeriado(config, n.fecha)).length
    return { m: MESES[i].slice(0, 3), hab, faltas, pct: hab > 0 ? Math.max(0, Math.round(((hab - faltas) / hab) * 100)) : null }
  }), [anio, docs, novs, ids, config])

  const porDia = useMemo(() => {
    const out: { f: string; hab: number; faltas: number; pct: number }[] = []
    const cur = new Date(anio, mes - 1, 1), fin = new Date(anio, mes, 0)
    while (cur <= fin) {
      const dow = cur.getDay(), f = fmtFecha(cur)
      if (dow !== 0 && dow !== 6 && !esFeriado(config, f)) {
        const hab = docs.filter(d => diasConHorario(d.horario).some(x => DIA_IDX[x] === dow)).length
        const faltas = novs.filter(n => n.fecha === f && ids.has(n.docente_id) && esFaltaCualquiera(n.tipo)).length
        out.push({ f, hab, faltas, pct: hab > 0 ? Math.round(((hab - faltas) / hab) * 100) : 100 })
      }
      cur.setDate(cur.getDate() + 1)
    }
    return out
  }, [anio, mes, docs, novs, ids, config])

  const datos = vista === 'anio' ? porMes.map(x => ({ l: x.m, pct: x.pct, extra: `${x.faltas} faltas` })) : porDia.map(x => ({ l: x.f.slice(8), pct: x.pct, extra: `${x.faltas} faltas / ${x.hab}` }))
  const W = 560, H = 220, pad = 34, slot = (W - pad - 10) / Math.max(1, datos.length), bw = Math.min(40, slot - 8)
  const nivel = (p: number | null) => p === null ? '#c9d1dc' : p >= 90 ? '#117a4f' : p >= 75 ? '#d98a0b' : '#d64545'

  return <section className="panel">
    <div className="report-filters inner">
      <label>Vista<select value={vista} onChange={e => setVista(e.target.value as 'anio' | 'mes')}><option value="anio">Todo el año</option><option value="mes">Un mes</option></select></label>
      <label>Año<input type="number" value={anio} onChange={e => setAnio(parseInt(e.target.value) || anio)} /></label>
      {vista === 'mes' && <label>Mes<select value={mes} onChange={e => setMes(parseInt(e.target.value))}>{MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></label>}
      {grupos.length > 0 && <label>Grupo<select value={grupo} onChange={e => setGrupo(e.target.value)}><option value="">Todos</option>{grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}</select></label>}
    </div>
    {error && <p role="alert" className="form-error flow-error">{error}</p>}
    {!docs.length ? <p className="empty-state">Sin docentes para mostrar.</p> : <>
      <div className="chart-body"><svg viewBox={`0 0 ${W} ${H}`} className="bar-chart" role="img" aria-label={`Asistencia ${vista === 'anio' ? 'mensual' : 'diaria'}: ${datos.map(d => `${d.l} ${d.pct ?? 'sin datos'}%`).join(', ')}`}>
        {[100, 75, 50].map(g => { const y = 20 + (H - 60) * (1 - (g - 40) / 60); return <g key={g}><line x1={pad} x2={W - 10} y1={y} y2={y} className="grid" /><text x={pad - 6} y={y + 4} textAnchor="end" className="axis">{g}%</text></g> })}
        {datos.map((d, i) => { const v = d.pct ?? 0; const h = Math.max(2, (H - 60) * ((Math.max(40, v) - 40) / 60)); const x = pad + slot * i + (slot - bw) / 2; const y = 20 + (H - 60) - h
          return <g key={i}><rect x={x} y={y} width={bw} height={h} rx={4} fill={nivel(d.pct)} /><text x={x + bw / 2} y={y - 5} textAnchor="middle" className="bar-value">{d.pct === null ? '' : `${d.pct}`}</text><text x={x + bw / 2} y={H - 14} textAnchor="middle" className="axis">{d.l}</text></g> })}
      </svg></div>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>{vista === 'anio' ? 'Mes' : 'Día'}</th><th>Asistencia</th><th>Detalle</th></tr></thead><tbody>{datos.map((d, i) => <tr key={i}><td>{d.l}</td><td>{d.pct === null ? '—' : `${d.pct}%`}</td><td>{d.extra}</td></tr>)}</tbody></table></div>
    </>}
  </section>
}

function Exportar() {
  const { docentes, anio, fecha } = useLive()
  const [tipo, setTipo] = useState<'dia' | 'mes' | 'anio' | 'docente'>('mes')
  const [dia, setDia] = useState(fecha)
  const [mes, setMes] = useState(hoyStr().slice(0, 7))
  const [an, setAn] = useState(anio)
  const [doc, setDoc] = useState('')
  const [trabajando, setTrabajando] = useState(false)
  const [error, setError] = useState('')

  const ir = async (f: 'xlsx' | 'pdf') => {
    setTrabajando(true); setError('')
    try {
      const [d, h] = tipo === 'dia' ? [dia, dia] : tipo === 'mes' ? rangoDe('mes', '', mes, an, '', '') : [`${an}-01-01`, `${an}-12-31`]
      let novs = await novedadesRango(d, h)
      if (tipo === 'docente') { if (!doc) throw new Error('Elegí un docente.'); novs = novs.filter(n => n.docente_id === doc) }
      novs = novs.filter(n => n.tipo !== 'presente').sort((a, b) => a.fecha.localeCompare(b.fecha))
      const mapa = new Map(docentes.map(x => [x.id, x]))
      const cols = ['Fecha', 'Día', 'Docente', 'Cargo', 'Estado', 'Módulo', 'Comentario']
      const dn = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
      const filas = novs.map(n => { const x = mapa.get(n.docente_id); return [n.fecha, dn[fechaDate(n.fecha).getDay()], x ? nombreMostrar(x) : '(eliminado)', x?.cargo || '', LABELS[n.tipo], n.modulo || '', n.obs || ''] })
      if (!filas.length) throw new Error('No hay novedades en el período elegido.')
      const nombre = `Novedades_${d}_${h}`
      if (f === 'xlsx') exportarExcel(filas, cols, nombre); else exportarPDF('Novedades del personal', `${d} a ${h}`, cols, filas, nombre)
    } catch (e) { setError((e as Error).message) } finally { setTrabajando(false) }
  }
  return <section className="panel">
    <div className="report-filters inner">
      <label>Tipo de reporte<select value={tipo} onChange={e => setTipo(e.target.value as typeof tipo)}><option value="dia">Listado de un día</option><option value="mes">Novedades de un mes</option><option value="anio">Novedades de un año</option><option value="docente">Por docente (año)</option></select></label>
      {tipo === 'dia' && <label>Día<input type="date" value={dia} onChange={e => setDia(e.target.value)} /></label>}
      {tipo === 'mes' && <label>Mes<input type="month" value={mes} onChange={e => setMes(e.target.value)} /></label>}
      {(tipo === 'anio' || tipo === 'docente') && <label>Año<input type="number" value={an} onChange={e => setAn(parseInt(e.target.value) || an)} /></label>}
      {tipo === 'docente' && <label>Docente<select value={doc} onChange={e => setDoc(e.target.value)}><option value="">— Elegí —</option>{docentes.map(d => <option key={d.id} value={d.id}>{nombreMostrar(d)}</option>)}</select></label>}
      <div className="export-buttons"><button disabled={trabajando} onClick={() => ir('xlsx')}><Download size={15} />Excel</button><button disabled={trabajando} onClick={() => ir('pdf')}><Download size={15} />PDF</button></div>
    </div>
    {error && <p role="alert" className="form-error flow-error">{error}</p>}
    <p className="empty-state">Se exportan las novedades (faltas, licencias, etc.) del período elegido.</p>
  </section>
}

/** Exportación semanal de novedades para cargar en CIDI, con registro de las semanas ya cargadas (datos de Supabase). */
function ExportarCidi() {
  const { docentes, config, user, puedeEditar, notify } = useLive()
  const [formato, setFormato] = useState<FormatoCidi | null>(null)
  const [cargadas, setCargadas] = useState<SemanaCargada[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    Promise.all([leerDato<FormatoCidi>('cidi_formato', FORMATO_INICIAL), leerDato<SemanaCargada[]>('cidi_semanas', [])])
      .then(([f, c]) => { setFormato({ ...FORMATO_INICIAL, ...f }); setCargadas(c) })
      .catch(e => setError((e as Error).message))
  }, [])
  const cargarNovedades = useCallback((lunes: string) => novedadesRango(lunes, viernesDe(lunes)), [])
  if (error) return <p role="alert" className="form-error flow-error">{error}</p>
  if (!formato) return <p className="empty-state">Cargando…</p>
  return <PanelCidi personal={docentes} cargarNovedades={cargarNovedades} cicloInicio={config.cicloInicio} formato={formato} cargadas={cargadas}
    guardarSemanas={async s => { await guardarDato('cidi_semanas', s); setCargadas(s) }} puedeMarcar={puedeEditar}
    usuario={user?.nombre || user?.email || 'sin nombre'} notify={notify} />
}

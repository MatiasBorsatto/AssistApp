'use client'

import { useCallback, useEffect, useState } from 'react'
import { Archive, Download, RotateCcw, Trash2, Upload } from 'lucide-react'
import { useLive } from './LiveContext'
import { PageHeading } from '../shared'
import {
  cerrarCiclo, crearGrupo, eliminarBackup, eliminarGrupo, guardarConfig, insertarDocentes, listarBackups, listarCiclosArchivados, renombrarGrupo,
  restaurarBackup, restaurarCiclo, novedadesRango, leerDato, guardarDato, type Backup, type CicloArchivado,
} from '@/lib/repo'
import { FORMATO_INICIAL, type FormatoCidi } from '@/lib/cidi'
import { EditorFormatoCidi } from '../cidi'
import { descargarJSON, exportarExcel, exportarPDF } from '@/lib/export'
import { parsearExcelDocentes } from '@/lib/importar'
import { DIA_NOMBRE, LABELS, fechaDate, fmtFecha, nombreMostrar, type Nivel } from '@/lib/domain'

export function ConfigView() {
  const { puedeEditar } = useLive()
  if (!puedeEditar) return <PageHeading eyebrow="SISTEMA" title="Configuración" description="Solo los administradores pueden modificar la configuración." />
  return <>
    <PageHeading eyebrow="SISTEMA" title="Configuración y datos" description="Ciclo lectivo, feriados, grupos, importación, backups y cierre de ciclo." />
    <CicloFeriados />
    <Grupos />
    <Importar />
    <FormatoCidiSec />
    <Backups />
    <Ciclos />
  </>
}

function Seccion({ titulo, sub, children }: { titulo: string; sub: string; children: React.ReactNode }) {
  return <section className="panel cfg-sec"><div className="panel-header"><div><h2>{titulo}</h2><p>{sub}</p></div></div><div className="cfg-body">{children}</div></section>
}

function CicloFeriados() {
  const { config, anio, recargar, notify } = useLive()
  const [ini, setIni] = useState(config.cicloInicio.replace(/^\d{4}/, String(anio)))
  const [fin, setFin] = useState(config.cicloFin.replace(/^\d{4}/, String(anio)))
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { setIni(config.cicloInicio.replace(/^\d{4}/, String(anio))); setFin(config.cicloFin.replace(/^\d{4}/, String(anio))) }, [config, anio])

  const guardar = async (cfg = { ...config, cicloInicio: ini, cicloFin: fin }, msg = 'Configuración guardada.') => {
    try { await guardarConfig(anio, cfg); notify(msg); await recargar() } catch (e) { setError((e as Error).message) }
  }
  const agregar = () => {
    if (!desde) { setError('Elegí al menos la fecha de inicio.'); return }
    setError('')
    const h = hasta && hasta >= desde ? hasta : desde
    const nuevos = [...config.feriados]
    const cur = fechaDate(desde), f = fechaDate(h)
    let n = 0
    while (cur <= f) { const s = fmtFecha(cur); if (!nuevos.some(x => x.fecha === s)) { nuevos.push({ fecha: s, nombre: nombre.trim() || 'Feriado' }); n++ } cur.setDate(cur.getDate() + 1) }
    setDesde(''); setHasta(''); setNombre('')
    guardar({ ...config, feriados: nuevos }, `${n} día${n !== 1 ? 's' : ''} agregado${n !== 1 ? 's' : ''}.`)
  }
  // Agrupa feriados consecutivos con el mismo nombre
  const grupos = [...config.feriados].sort((a, b) => a.fecha.localeCompare(b.fecha)).reduce<{ nombre: string; fechas: string[] }[]>((acc, f) => {
    const u = acc[acc.length - 1]
    if (u && u.nombre === f.nombre && fechaDate(f.fecha).getTime() <= fechaDate(u.fechas[u.fechas.length - 1]).getTime() + 3 * 86400000) u.fechas.push(f.fecha); else acc.push({ nombre: f.nombre, fechas: [f.fecha] })
    return acc
  }, [])

  return <Seccion titulo={`Ciclo lectivo y feriados ${anio}`} sub="Los feriados no cuentan como días a cumplir en los porcentajes.">
    <div className="form-row"><label>Inicio del ciclo<input type="date" value={ini} onChange={e => setIni(e.target.value)} /></label><label>Fin del ciclo<input type="date" value={fin} onChange={e => setFin(e.target.value)} /></label></div>
    <button className="button primary inline" onClick={() => { if (!ini || !fin) { setError('Completá las fechas del ciclo.'); return } guardar() }}>Guardar ciclo</button>
    <h3 className="cfg-h">Feriados</h3>
    <div className="form-row"><label>Desde<input type="date" value={desde} onChange={e => setDesde(e.target.value)} /></label><label>Hasta (opcional)<input type="date" value={hasta} onChange={e => setHasta(e.target.value)} /></label></div>
    <label className="cfg-label">Nombre<input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Día de la Bandera" /></label>
    <button className="button secondary inline" onClick={agregar}>Agregar feriado</button>
    {error && <p role="alert" className="form-error">{error}</p>}
    {!grupos.length ? <p className="muted-cell">Sin feriados cargados.</p> : <ul className="cfg-lista">{grupos.map(g => (
      <li key={g.fechas[0]}><span>{fechaDate(g.fechas[0]).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}{g.fechas.length > 1 ? ` → ${fechaDate(g.fechas[g.fechas.length - 1]).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}` : ''}</span><strong>{g.nombre}{g.fechas.length > 1 ? ` (${g.fechas.length} días)` : ''}</strong>
        <button className="mini-btn bad" aria-label={`Eliminar ${g.nombre}`} onClick={() => guardar({ ...config, feriados: config.feriados.filter(f => !g.fechas.includes(f.fecha)) }, 'Feriado eliminado.')}><Trash2 size={12} /></button></li>))}</ul>}
  </Seccion>
}

function Grupos() {
  const { grupos, recargar, notify, backup } = useLive()
  const [nombre, setNombre] = useState('')
  const [color, setColor] = useState('#d98a0b')
  const [error, setError] = useState('')
  const ok = async (fn: () => Promise<void>, msg: string) => { try { await fn(); notify(msg); await recargar() } catch (e) { setError((e as Error).message) } }
  return <Seccion titulo="Grupos" sub="Agrupá docentes para filtrar y reportar (ej. por turno o departamento).">
    <div className="form-row"><label>Nombre<input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Ciencias" /></label><label>Color<input type="color" value={color} onChange={e => setColor(e.target.value)} /></label></div>
    <button className="button primary inline" onClick={() => { if (!nombre.trim()) { setError('Poné un nombre al grupo.'); return } setError(''); ok(() => crearGrupo(nombre.trim(), color), 'Grupo creado.').then(() => setNombre('')); backup('Nuevo grupo: ' + nombre) }}>Crear grupo</button>
    {error && <p role="alert" className="form-error">{error}</p>}
    {!grupos.length ? <p className="muted-cell">Todavía no hay grupos.</p> : <ul className="cfg-lista">{grupos.map(g => (
      <li key={g.id}><i className="dot" style={{ background: g.color }} /><strong>{g.nombre}</strong>
        <button className="mini-btn" onClick={() => { const n = window.prompt('Nuevo nombre del grupo:', g.nombre); if (n && n.trim()) ok(() => renombrarGrupo(g.id, n.trim()), 'Grupo renombrado.') }}>Renombrar</button>
        <button className="mini-btn bad" onClick={() => { if (window.confirm(`¿Eliminar el grupo "${g.nombre}"? Los docentes no se eliminan.`)) ok(() => eliminarGrupo(g.id), 'Grupo eliminado.') }}><Trash2 size={12} /></button></li>))}</ul>}
  </Seccion>
}

function Importar() {
  const { anio, recargar, notify, backup } = useLive()
  const [nivel, setNivel] = useState<Nivel>('secundaria')
  const [lista, setLista] = useState<Awaited<ReturnType<typeof parsearExcelDocentes>>['docentes']>([])
  const [error, setError] = useState('')
  const [trabajando, setTrabajando] = useState(false)
  const leer = async (f?: File) => {
    if (!f) return
    setError('')
    try { const r = await parsearExcelDocentes(f, nivel); setLista(r.docentes); if (!r.docentes.length) setError(`No se encontraron docentes. Columnas detectadas: ${r.columnas.slice(0, 6).join(', ') || 'ninguna'}. Usá una columna "Nombre" o "Apellido".`) } catch (e) { setError((e as Error).message) }
  }
  const guardar = async () => {
    setTrabajando(true)
    try { const n = await insertarDocentes(lista.map(d => ({ ...d, nivel })), anio); backup(`Importar docentes (${n})`); notify(`${n} docentes importados.`); setLista([]); await recargar() } catch (e) { setError((e as Error).message) } finally { setTrabajando(false) }
  }
  return <Seccion titulo="Importar docentes desde Excel" sub="Columnas: Nombre, Apellido, Cargo, Materias, Área y horarios (ej. “Lunes entrada”, “Lunes salida”).">
    <label className="cfg-label">Nivel de destino<select value={nivel} onChange={e => setNivel(e.target.value as Nivel)}><option value="secundaria">Secundaria</option><option value="primaria">Primaria</option><option value="inicial">Inicial</option></select></label>
    <label className="cfg-label">Archivo (.xlsx, .xls, .csv)<input type="file" accept=".xlsx,.xls,.csv" onChange={e => leer(e.target.files?.[0])} /></label>
    {error && <p role="alert" className="form-error">{error}</p>}
    {lista.length > 0 && <><p><strong>{lista.length}</strong> docentes listos para importar:</p>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>Nombre</th><th>Cargo</th><th>Materias</th><th>Días con horario</th></tr></thead><tbody>{lista.slice(0, 50).map((d, i) => <tr key={i}><td>{d.apellido ? `${d.apellido}, ` : ''}{d.nombre}</td><td>{d.cargo || '—'}</td><td>{d.materias || '—'}</td><td>{Object.keys(d.horario).join(', ') || '—'}</td></tr>)}</tbody></table></div>
      <button className="button primary inline" disabled={trabajando} onClick={guardar}><Upload size={15} />{trabajando ? 'Importando…' : `Importar ${lista.length} docentes`}</button></>}
  </Seccion>
}

function Backups() {
  const { anio, docentes, recargar, notify, backup } = useLive()
  const [items, setItems] = useState<Backup[] | null>(null)
  const [abierto, setAbierto] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [anioBk, setAnioBk] = useState(anio)
  const cargar = useCallback(async () => { try { setItems(await listarBackups()) } catch (e) { setError((e as Error).message) } }, [])
  useEffect(() => { cargar() }, [cargar])

  const restaurar = async (b: Backup) => {
    if (!window.confirm(`RESTAURAR BACKUP\n\n${b.data.fecha} ${b.data.hora}\nMotivo: ${b.motivo}\nDocentes: ${b.data.empleados.length} · Registros: ${b.data.novedades.length}\n\nEsto REEMPLAZA todos los datos del año ${b.anio}. Antes se guarda un backup del estado actual.\n\n¿Confirmar?`)) return
    try { await restaurarBackup(b); notify('Backup restaurado.'); await Promise.all([cargar(), recargar()]) } catch (e) { setError((e as Error).message) }
  }
  const exportarAnio = async (f: 'xlsx' | 'pdf') => {
    try {
      const novs = (await novedadesRango(`${anioBk}-01-01`, `${anioBk}-12-31`)).sort((a, b) => a.fecha.localeCompare(b.fecha))
      const mapa = new Map(docentes.map(d => [d.id, d]))
      const filas = novs.map(n => [n.fecha, DIA_NOMBRE[fechaDate(n.fecha).getDay()], mapa.get(n.docente_id) ? nombreMostrar(mapa.get(n.docente_id)!) : '(eliminado)', LABELS[n.tipo], n.modulo || ''])
      const cols = ['Fecha', 'Día', 'Docente', 'Estado', 'Módulo']
      if (f === 'xlsx') exportarExcel(filas, cols, `Backup_${anioBk}`); else exportarPDF(`Backup ciclo lectivo ${anioBk}`, `Generado el ${new Date().toLocaleDateString('es-AR')}`, cols, filas, `Backup_${anioBk}`)
    } catch (e) { setError((e as Error).message) }
  }
  const importar = async (file?: File) => {
    if (!file) return
    try {
      const b = JSON.parse(await file.text())
      if (!b.empleados || !b.novedades) throw new Error('El archivo no parece un backup del sistema.')
      const bk: Backup = { id: '', ts: '', motivo: b.motivo || 'Importado', quien: b.quien || 'importado', anio: b.anio || anio, data: { empleados: b.empleados, novedades: b.novedades, fecha: b.fecha || '', hora: b.hora || '' } }
      await restaurar(bk)
    } catch (e) { setError((e as Error).message) }
  }

  return <Seccion titulo="Backups" sub="Se generan automáticamente al modificar datos (últimos 20).">
    <div className="nov-toolbar">
      <button className="button secondary inline" onClick={() => { backup('Backup manual'); notify('Backup programado. Aparecerá en unos segundos.'); setTimeout(cargar, 6000) }}><Archive size={15} />Crear backup ahora</button>
      <label className="cfg-label inline">Importar JSON<input type="file" accept=".json" onChange={e => importar(e.target.files?.[0])} /></label>
    </div>
    <div className="nov-toolbar"><label className="cfg-label inline">Exportar novedades del ciclo<input type="number" value={anioBk} onChange={e => setAnioBk(parseInt(e.target.value) || anioBk)} /></label>
      <button className="mini-btn" onClick={() => exportarAnio('xlsx')}><Download size={12} /> Excel</button><button className="mini-btn" onClick={() => exportarAnio('pdf')}><Download size={12} /> PDF</button></div>
    {error && <p role="alert" className="form-error">{error}</p>}
    {items === null ? <p className="muted-cell">Cargando…</p> : !items.length ? <p className="muted-cell">Sin backups todavía.</p> : <ul className="cfg-lista backups">{items.map(b => (
      <li key={b.id}><div className="bk-info"><strong>{b.data.fecha} {b.data.hora}</strong><small>{b.motivo} · {b.quien} · {b.data.empleados.length} docentes · {b.data.novedades.length} registros</small></div>
        <button className="mini-btn" onClick={() => descargarJSON({ ...b.data, motivo: b.motivo, quien: b.quien, anio: b.anio }, `backup_${b.data.fecha.replace(/\//g, '-')}_${b.data.hora.replace(':', '-')}.json`)}><Download size={12} /> JSON</button>
        <button className="mini-btn ok" onClick={() => restaurar(b)}><RotateCcw size={12} /> Restaurar</button>
        <button className="mini-btn bad" aria-label="Eliminar backup" onClick={async () => { if (window.confirm('¿Eliminar este backup?')) { await eliminarBackup(b.id); cargar() } }}><Trash2 size={12} /></button>
        <button className="mini-btn" aria-expanded={abierto === b.id} onClick={() => setAbierto(abierto === b.id ? null : b.id)}>{abierto === b.id ? 'Ocultar' : 'Detalle'}</button>
        {abierto === b.id && <div className="bk-detalle">{b.data.empleados.filter(e => !(e as { eliminadoEn?: unknown }).eliminadoEn).slice(0, 80).map((e, i) => <span key={i} className="attach-chip">{String(e.apellido || '')} {String(e.nombre || '')}</span>)}</div>}</li>))}</ul>}
  </Seccion>
}

function Ciclos() {
  const { anio, recargar, notify, backup } = useLive()
  const [items, setItems] = useState<CicloArchivado[]>([])
  const [error, setError] = useState('')
  const [cerrar, setCerrar] = useState(new Date().getFullYear())
  const [trabajando, setTrabajando] = useState(false)
  const cargar = useCallback(async () => { try { setItems(await listarCiclosArchivados()) } catch { setItems([]) } }, [])
  useEffect(() => { cargar() }, [cargar])
  const archivar = async () => {
    if (!window.confirm(`¿Archivar el ciclo ${cerrar}? Se guardan todas las novedades y se borran de la base activa. Los docentes y horarios no se tocan.`)) return
    setTrabajando(true)
    try { backup(`Antes de cerrar ciclo ${cerrar}`); const n = await cerrarCiclo(cerrar); notify(`Ciclo ${cerrar} archivado (${n} registros).`); await Promise.all([cargar(), recargar()]) } catch (e) { setError((e as Error).message) } finally { setTrabajando(false) }
  }
  void anio
  return <Seccion titulo="Cierre de ciclo lectivo" sub="Archiva las novedades del año y las quita de la base activa.">
    <div className="nov-toolbar"><label className="cfg-label inline">Ciclo<input type="number" value={cerrar} onChange={e => setCerrar(parseInt(e.target.value) || cerrar)} /></label>
      <button className="button danger inline" disabled={trabajando} onClick={archivar}><Archive size={15} />{trabajando ? 'Archivando…' : 'Archivar y cerrar ciclo'}</button></div>
    {error && <p role="alert" className="form-error">{error}</p>}
    {!items.length ? <p className="muted-cell">No hay ciclos archivados.</p> : <ul className="cfg-lista">{items.map(c => (
      <li key={c.id}><strong>Ciclo {c.anio}</strong><small>{c.data?.totalNovedades ?? 0} registros · archivado el {c.created_at ? new Date(c.created_at).toLocaleDateString('es-AR') : '—'}</small>
        <button className="mini-btn ok" onClick={async () => { if (window.confirm(`¿Restaurar el ciclo ${c.anio}? Se reimportan sus novedades.`)) { try { await restaurarCiclo(c.id); notify('Ciclo restaurado.'); await recargar() } catch (e) { setError((e as Error).message) } } }}><RotateCcw size={12} /> Restaurar</button></li>))}</ul>}
  </Seccion>
}

/** Código de cada tipo de novedad en CIDI, para la exportación semanal (Reportes → Para CIDI). */
function FormatoCidiSec() {
  const { notify } = useLive()
  const [f, setF] = useState<FormatoCidi | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { leerDato<FormatoCidi>('cidi_formato', FORMATO_INICIAL).then(setF).catch(e => setError((e as Error).message)) }, [])
  return <Seccion titulo="Formato para CIDI" sub="Código que usa CIDI para cada tipo de novedad. Pedíselo a quien carga las novedades en CIDI.">
    {error ? <p role="alert" className="form-error flow-error">{error}</p> : !f ? <p className="empty-state">Cargando…</p>
      : <EditorFormatoCidi valor={f} onGuardar={async x => { await guardarDato('cidi_formato', x); setF(x); notify('Formato para CIDI guardado.') }} />}
  </Seccion>
}

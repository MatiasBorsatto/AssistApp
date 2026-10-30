'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Eye, GraduationCap, Pencil, PencilLine, Plus, Search, Trash2, X } from 'lucide-react'
import { useLive, type DocenteDia } from './LiveContext'
import { NovedadModal } from './NovedadModal'
import { PerfilModal } from './PerfilModal'
import { Avatar, PageHeading, StatusBadge } from '../shared'
import {
  actualizarEstudiante, cargarMateriasCarrera, crearEstudiante, estadosMateriasEstudiante, guardarMateriasCarrera, softDeleteDocentes,
  type EstadoMateria, type MateriaCarrera, type MateriasPorCarrera,
} from '@/lib/repo'
import {
  DIAS_KEYS, DIA_ABREV, LABELS_SHORT, TIPO_TONO, esFeriado, fechaDate, hoyStr, nombreMostrar, normalizarFranjas, quitarTildes, sumarDias, uuid,
  type DiaKey, type Horario, type TipoNovedad,
} from '@/lib/domain'

export const CARRERAS = [
  { id: 'enfermeria', label: 'Tecnicatura Superior en Enfermería', tipo: 'Tec. Superior', anios: 3 },
  { id: 'prof_inicial', label: 'Profesorado de Educación Inicial', tipo: 'Profesorado', anios: 4 },
  { id: 'prof_primaria', label: 'Profesorado de Educación Primaria', tipo: 'Profesorado', anios: 4 },
  { id: 'admin', label: 'Tec. Sup. en Administración', tipo: 'Tec. Superior', anios: 3 },
  { id: 'marketing', label: 'Tec. Sup. en Marketing Digital', tipo: 'Tec. Superior', anios: 3 },
  { id: 'software', label: 'Tec. Sup. en Desarrollo de Software', tipo: 'Tec. Superior', anios: 3 },
  { id: 'agropecuaria', label: 'Tec. Sup. en Maq. y Equipos Agropecuarios', tipo: 'Tec. Superior', anios: 3 },
  { id: 'fullstack', label: 'Tec. Univ. en Programación Full Stack', tipo: 'Tec. Universitaria', anios: 3 },
  { id: 'mkt_negocios', label: 'Tec. Univ. en Marketing y Negocios Digitales', tipo: 'Tec. Universitaria', anios: 3 },
  { id: 'prof_quimica', label: 'Profesorado Sec. en Química', tipo: 'Profesorado', anios: 4 },
  { id: 'prof_biologia', label: 'Profesorado Sec. en Biología', tipo: 'Profesorado', anios: 4 },
  { id: 'prof_exactas', label: 'Profesorado Univ. en Cs. Exactas y Naturales', tipo: 'Profesorado', anios: 4 },
  { id: 'lic_admin', label: 'Lic. en Administración de Empresas', tipo: 'Licenciatura', anios: 5 },
  { id: 'lic_higiene', label: 'Lic. en Higiene y Seguridad', tipo: 'Licenciatura', anios: 5 },
]
const tono = (t: string) => { if (!t) return 'success' as const; const x = TIPO_TONO[t as TipoNovedad]; return x === 'neutral' ? 'blue' as const : x }
const resumenHorario = (h: Horario) => (Object.keys(h) as DiaKey[]).filter(k => normalizarFranjas(h[k]).length).map(k => `${DIA_ABREV[DIAS_KEYS.indexOf(k)]} ${normalizarFranjas(h[k]).map(f => `${f.entrada}-${f.salida}`).join(' / ')}`).join(' · ')

export function EstudiantesView() {
  const { estudiantes, fecha, setFecha, config, puedeEditar, puedeVerTodo, cargando, recargar, notify, backup, user, error } = useLive()
  const [carrera, setCarrera] = useState<string | null>(null)
  const [anioTab, setAnioTab] = useState('')
  const [q, setQ] = useState('')
  const [nov, setNov] = useState<DocenteDia | null>(null)
  const [perfil, setPerfil] = useState<DocenteDia | null>(null)
  const [edit, setEdit] = useState<DocenteDia | 'nuevo' | null>(null)
  const [elim, setElim] = useState<DocenteDia | null>(null)
  const [horarios, setHorarios] = useState(false)

  const conteo = useMemo(() => { const c: Record<string, number> = {}; estudiantes.forEach(e => { if (e.area) c[e.area] = (c[e.area] || 0) + 1 }); return c }, [estudiantes])
  const info = CARRERAS.find(c => c.id === carrera)
  const lista = useMemo(() => estudiantes.filter(e => e.area === carrera && (!anioTab || (e.cargo || '').charAt(0) === anioTab)
    && (!q || quitarTildes(`${e.apellido} ${e.nombre}`.toLowerCase()).includes(quitarTildes(q.toLowerCase())))), [estudiantes, carrera, anioTab, q])
  const feriado = esFeriado(config, fecha)
  const ausentes = lista.filter(e => e.estadoHoy && e.estadoHoy !== 'presente' && e.estadoHoy !== 'cambio').length
  const pct = lista.length ? Math.round(((lista.length - ausentes) / lista.length) * 100) : null

  const eliminar = async () => {
    if (!elim) return
    try { await softDeleteDocentes([elim.id], 'estudiantes', true, user?.email || 'admin'); backup(`Eliminar estudiante: ${elim.nombre}`); notify(`${nombreMostrar(elim)} eliminado.`); setElim(null); await recargar() } catch (e) { notify(`Error: ${(e as Error).message}`) }
  }

  if (!carrera) return <>
    <PageHeading eyebrow="ESTUDIANTES" title="Carreras" description="Elegí una carrera para ver y registrar la asistencia de sus estudiantes."
      action={puedeEditar ? <button className="button secondary" onClick={() => setHorarios(true)}><GraduationCap size={16} />Horarios de materias</button> : undefined} />
    {error && <p role="alert" className="form-error flow-error">{error}</p>}
    <div className="carrera-grid">{CARRERAS.map(c => (
      <button key={c.id} className="carrera-card" onClick={() => { setCarrera(c.id); setAnioTab('') }}>
        <span className="carrera-tipo">{c.tipo}</span><strong>{c.label}</strong><small>{conteo[c.id] || 0} estudiante{(conteo[c.id] || 0) !== 1 ? 's' : ''}</small>
      </button>))}
    </div>
    {horarios && <ConfigMaterias onClose={() => setHorarios(false)} />}
  </>

  return <>
    <PageHeading eyebrow="ESTUDIANTES" title={info?.label || 'Carrera'} description="Asistencia diaria de los estudiantes de la carrera."
      action={<div className="heading-actions"><button className="button secondary" onClick={() => setCarrera(null)}>← Carreras</button>
        {puedeEditar && <button className="button primary" onClick={() => setEdit('nuevo')}><Plus size={17} />Nuevo estudiante</button>}</div>} />
    <div className="fecha-nav panel"><button className="icon-button" aria-label="Día anterior" onClick={() => setFecha(sumarDias(fecha, -1))}>‹</button>
      <div className="fecha-centro"><strong>{fechaDate(fecha).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong><input type="date" aria-label="Elegir fecha" value={fecha} onChange={e => e.target.value && setFecha(e.target.value)} /></div>
      <button className="icon-button" aria-label="Día siguiente" onClick={() => setFecha(sumarDias(fecha, 1))}>›</button>
      {fecha !== hoyStr() && <button className="mini-btn" onClick={() => setFecha(hoyStr())}>Hoy</button>}</div>
    {feriado && <div className="feriado-banner" role="status"><strong>{config.feriados.find(f => f.fecha === fecha)?.nombre || 'Feriado'}</strong> — No hay clases.</div>}
    <div className="mini-stats"><div><span>Estudiantes</span><strong>{lista.length}</strong></div><div><span>Ausentes</span><strong className="red-text">{ausentes}</strong></div><div><span>Asistencia</span><strong className="green-text">{pct === null || feriado ? '—' : `${pct}%`}</strong></div></div>
    <section className="panel table-panel">
      <div className="nivel-tabs" role="tablist" aria-label="Año de la carrera">
        {[['', 'Todos los años'], ...Array.from({ length: info?.anios || 3 }, (_, i) => [String(i + 1), `${i + 1}° Año`])].map(([v, l]) => <button key={v} role="tab" aria-selected={anioTab === v} className={anioTab === v ? 'on' : ''} onClick={() => setAnioTab(v)}>{l}</button>)}
      </div>
      <div className="toolbar"><div className="table-search"><Search size={17} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar estudiante..." aria-label="Buscar estudiante" /></div></div>
      <div className="table-scroll"><table><thead><tr><th>ESTUDIANTE</th><th>AÑO</th><th>HORARIO</th><th>ESTADO DEL DÍA</th><th>ACCIONES</th></tr></thead><tbody>
        {cargando && !estudiantes.length && <tr><td colSpan={5} className="empty-state">Cargando…</td></tr>}
        {!cargando && !lista.length && <tr><td colSpan={5} className="empty-state">No hay estudiantes en esta selección.</td></tr>}
        {lista.map(e => <tr key={e.id}>
          <td><div className="person-cell"><Avatar initials={(e.apellido || e.nombre).slice(0, 1).toUpperCase()} small /><strong>{nombreMostrar(e)}</strong></div></td>
          <td>{e.cargo || '—'}</td><td className="muted-cell">{resumenHorario(e.horario) || 'Sin horario'}</td>
          <td><StatusBadge tone={tono(e.estadoHoy)}>{e.estadoHoy ? LABELS_SHORT[e.estadoHoy as TipoNovedad] : 'Presente'}</StatusBadge></td>
          <td><div className="row-actions">
            <button className="mini-btn" aria-label={`Ver historial de ${nombreMostrar(e)}`} onClick={() => setPerfil(e)}><Eye size={13} /></button>
            {puedeVerTodo && <button className="mini-btn ok" aria-label={`Registrar novedad de ${nombreMostrar(e)}`} onClick={() => setNov(e)}><PencilLine size={13} /> {puedeEditar ? 'Registrar' : 'Ver día'}</button>}
            {puedeEditar && <><button className="mini-btn" aria-label={`Editar a ${nombreMostrar(e)}`} onClick={() => setEdit(e)}><Pencil size={13} /></button><button className="mini-btn bad" aria-label={`Eliminar a ${nombreMostrar(e)}`} onClick={() => setElim(e)}><Trash2 size={13} /></button></>}
          </div></td></tr>)}
      </tbody></table></div>
    </section>
    {nov && <NovedadModal docente={nov} fechaInicial={fecha} onClose={() => setNov(null)} />}
    {perfil && <PerfilModal docente={perfil} onClose={() => setPerfil(null)} onRegistrar={puedeEditar ? () => { const d = perfil; setPerfil(null); setNov(d) } : undefined} />}
    {edit && carrera && <EditorEstudiante estudiante={edit === 'nuevo' ? null : edit} carreraId={carrera} onClose={() => setEdit(null)} />}
    {elim && <div className="modal-backdrop" onClick={() => setElim(null)}><div className="modal" role="alertdialog" aria-modal="true" aria-label="Eliminar estudiante" onClick={e => e.stopPropagation()}>
      <div className="modal-header"><div><h2>Eliminar estudiante</h2><p>Se puede recuperar desde la papelera.</p></div></div>
      <div className="modal-body"><p>¿Seguro que querés eliminar a <strong>{nombreMostrar(elim)}</strong>?</p></div>
      <div className="modal-footer"><button className="button secondary" autoFocus onClick={() => setElim(null)}>Cancelar</button><button className="button danger" onClick={eliminar}><Trash2 size={15} />Eliminar</button></div></div></div>}
  </>
}

const OPCIONES: [EstadoMateria, string][] = [['cursa', 'Cursa'], ['virtual', 'Virtual'], ['equiv', 'Equiv.'], ['no', 'No cursa']]

function EditorEstudiante({ estudiante, carreraId, onClose }: { estudiante: DocenteDia | null; carreraId: string; onClose: () => void }) {
  const { anio, recargar, notify, backup } = useLive()
  const info = CARRERAS.find(c => c.id === carreraId)!
  const [nombre, setNombre] = useState(estudiante?.nombre || '')
  const [apellido, setApellido] = useState(estudiante?.apellido || '')
  const [anioCarrera, setAnioCarrera] = useState(parseInt((estudiante?.cargo || '1').charAt(0)) || 1)
  const [notas, setNotas] = useState(estudiante?.notas || '')
  const [mats, setMats] = useState<MateriasPorCarrera>({})
  const [estados, setEstados] = useState<Record<string, EstadoMateria>>({})
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { cargarMateriasCarrera().then(setMats).catch(() => {}); if (estudiante) estadosMateriasEstudiante(estudiante.id).then(setEstados).catch(() => {}) }, [estudiante])
  const materias: MateriaCarrera[] = mats[carreraId]?.[String(anioCarrera)] || []

  const horario = useMemo(() => {
    const h: Record<string, { entrada: string; salida: string; materia?: string }[]> = {}
    materias.forEach(m => {
      const est = estados[m.id] || 'cursa'
      if (est !== 'cursa' && est !== 'virtual') return
      Object.entries(m.horario || {}).forEach(([dia, v]) => { normalizarFranjas(v as never).forEach(f => { (h[dia] ||= []).push({ entrada: f.entrada, salida: f.salida, materia: m.nombre }) }) })
    })
    Object.values(h).forEach(l => l.sort((a, b) => (a.entrada < b.entrada ? -1 : 1)))
    return h as Horario
  }, [materias, estados])

  const guardar = async () => {
    if (!nombre.trim()) { setError('El nombre es obligatorio.'); return }
    setGuardando(true); setError('')
    const todos: Record<string, EstadoMateria> = {}
    materias.forEach(m => { todos[m.id] = estados[m.id] || 'cursa' })
    const datos = { nombre: nombre.trim(), apellido: apellido.trim(), carrera: carreraId, anioCarrera, estados: todos, horario, notas: notas.trim() }
    try {
      if (estudiante) await actualizarEstudiante(estudiante.id, datos, anio); else await crearEstudiante(datos, anio)
      backup(`${estudiante ? 'Editar' : 'Nuevo'} estudiante: ${apellido} ${nombre}`); notify(`${nombre.trim()} ${estudiante ? 'actualizado' : 'agregado'}.`)
      await recargar(); onClose()
    } catch (e) { setError((e as Error).message) } finally { setGuardando(false) }
  }

  return <div className="modal-backdrop"><div className="modal wide" role="dialog" aria-modal="true" aria-label={estudiante ? 'Editar estudiante' : 'Nuevo estudiante'}>
    <div className="modal-header"><div><h2>{estudiante ? 'Editar estudiante' : 'Nuevo estudiante'}</h2><p>{info.label}</p></div><button className="icon-button" aria-label="Cerrar" onClick={onClose}><X size={18} /></button></div>
    <div className="modal-body">
      <div className="form-row"><label>Nombre *<input value={nombre} onChange={e => { setNombre(e.target.value); setError('') }} /></label><label>Apellido<input value={apellido} onChange={e => setApellido(e.target.value)} /></label></div>
      <label>Año de la carrera<select value={anioCarrera} onChange={e => setAnioCarrera(parseInt(e.target.value))}>{Array.from({ length: info.anios }, (_, i) => <option key={i} value={i + 1}>{i + 1}° Año</option>)}</select></label>
      <label>Notas<input value={notas} onChange={e => setNotas(e.target.value)} /></label>
      <fieldset className="horario-editor"><legend>Materias del año</legend>
        {!materias.length ? <p className="muted-cell">No hay materias cargadas para este año. Cargalas desde “Horarios de materias”.</p> : materias.map(m => (
          <div className="mat-item" key={m.id}><div><strong>{m.nombre}</strong><small>{resumenHorario(m.horario || {})}</small></div>
            <div className="segmented" role="group" aria-label={`Estado de ${m.nombre}`}>{OPCIONES.map(([v, l]) => <button type="button" key={v} className={(estados[m.id] || 'cursa') === v ? 'on' : ''} aria-pressed={(estados[m.id] || 'cursa') === v} onClick={() => setEstados(s => ({ ...s, [m.id]: v }))}>{l}</button>)}</div></div>))}
      </fieldset>
      {error && <p role="alert" className="form-error">{error}</p>}
    </div>
    <div className="modal-footer"><span className="footer-spacer" /><button className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary" disabled={guardando} onClick={guardar}><Check size={16} />{guardando ? 'Guardando…' : 'Guardar'}</button></div>
  </div></div>
}

function ConfigMaterias({ onClose }: { onClose: () => void }) {
  const { notify } = useLive()
  const [mats, setMats] = useState<MateriasPorCarrera | null>(null)
  const [carrera, setCarrera] = useState(CARRERAS[0].id)
  const [anioSel, setAnioSel] = useState('1')
  const [error, setError] = useState('')
  useEffect(() => { cargarMateriasCarrera().then(setMats).catch(e => setError(e.message)) }, [])
  const info = CARRERAS.find(c => c.id === carrera)!
  const lista = mats?.[carrera]?.[anioSel] || []
  const set = (l: MateriaCarrera[]) => setMats(m => ({ ...(m || {}), [carrera]: { ...((m || {})[carrera] || {}), [anioSel]: l } }))
  const setHorario = (i: number, dia: DiaKey, campo: 'entrada' | 'salida' | 'activo', v: string | boolean) => set(lista.map((m, j) => {
    if (j !== i) return m
    const f = normalizarFranjas(m.horario?.[dia])[0] || { entrada: '18:00', salida: '19:00' }
    if (campo === 'activo') { const h = { ...(m.horario || {}) }; if (v) h[dia] = [f]; else delete h[dia]; return { ...m, horario: h } }
    return { ...m, horario: { ...(m.horario || {}), [dia]: [{ ...f, [campo]: v as string }] } }
  }))
  const guardar = async () => { try { await guardarMateriasCarrera(mats || {}); notify('Materias y horarios guardados.'); onClose() } catch (e) { setError((e as Error).message) } }
  return <div className="modal-backdrop" onClick={onClose}><div className="modal wide" role="dialog" aria-modal="true" aria-label="Horarios de materias" onClick={e => e.stopPropagation()}>
    <div className="modal-header"><div><h2>Horarios de materias</h2><p>Se usan para armar el horario de cada estudiante.</p></div><button className="icon-button" aria-label="Cerrar" onClick={onClose}><X size={18} /></button></div>
    <div className="modal-body">
      <div className="form-row"><label>Carrera<select value={carrera} onChange={e => { setCarrera(e.target.value); setAnioSel('1') }}>{CARRERAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
        <label>Año<select value={anioSel} onChange={e => setAnioSel(e.target.value)}>{Array.from({ length: info.anios }, (_, i) => <option key={i} value={i + 1}>{i + 1}° Año</option>)}</select></label></div>
      {error && <p role="alert" className="form-error">{error}</p>}
      {mats === null ? <p className="empty-state">Cargando…</p> : <>
        {lista.map((m, i) => <fieldset className="horario-editor" key={m.id}><legend><input aria-label="Nombre de la materia" className="mat-nombre" value={m.nombre} onChange={e => set(lista.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))} /></legend>
          {DIAS_KEYS.filter(d => d !== 'domingo' && d !== 'sabado').map(d => { const f = normalizarFranjas(m.horario?.[d])[0]; return <div className="franja-row" key={d}>
            <label className="check-inline"><input type="checkbox" checked={!!f} onChange={e => setHorario(i, d, 'activo', e.target.checked)} /> {DIA_ABREV[DIAS_KEYS.indexOf(d)]}</label>
            {f && <><input type="time" aria-label="Entrada" value={f.entrada} onChange={e => setHorario(i, d, 'entrada', e.target.value)} /><span>a</span><input type="time" aria-label="Salida" value={f.salida} onChange={e => setHorario(i, d, 'salida', e.target.value)} /></>}</div> })}
          <button className="mini-btn bad" onClick={() => set(lista.filter((_, j) => j !== i))}><Trash2 size={12} /> Quitar materia</button></fieldset>)}
        <button className="button secondary inline" onClick={() => set([...lista, { id: `m_${carrera}_${anioSel}_${uuid().slice(0, 6)}`, nombre: 'Nueva materia', horario: {} }])}><Plus size={15} />Agregar materia</button></>}
    </div>
    <div className="modal-footer"><button className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary" onClick={guardar}><Check size={16} />Guardar</button></div>
  </div></div>
}

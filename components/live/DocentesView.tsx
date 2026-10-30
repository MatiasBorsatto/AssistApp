'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Copy, Eye, Pencil, Plus, RotateCcw, Search, Trash2, X } from 'lucide-react'
import { useLive, type DocenteDia } from './LiveContext'
import { PerfilModal } from './PerfilModal'
import { Avatar, PageHeading, StatusBadge } from '../shared'
import {
  actualizarDocente, cargarDocentesEliminados, copiarDocenteANivel, copiarDocentesAnioAnterior, crearAnioVacio, crearDocente,
  softDeleteDocentes, type DatosDocente,
} from '@/lib/repo'
import {
  DIA_ABREV, DIA_ORDEN, DIAS_KEYS, esCargoReloj, getTipoHs, hsCatedraSemanales, hsSemanales, minDia, nombreMostrar, normalizarFranjas, quitarTildes,
  type Docente, type DiaKey, type Franja, type Horario, type Nivel,
} from '@/lib/domain'

const NIVELES: { v: Nivel; l: string }[] = [{ v: 'secundaria', l: 'Secundaria' }, { v: 'primaria', l: 'Primaria' }, { v: 'inicial', l: 'Inicial' }]
const AREA_LABEL: Record<string, string> = { secundaria: 'Área / Departamento', primaria: 'Grado / Sala', inicial: 'Sala / Turno', estudiantes: 'Carrera / Año' }
const NIVEL_LABEL: Record<string, string> = { secundaria: 'Secundaria', primaria: 'Primaria', inicial: 'Inicial', estudiantes: 'Estudiantes' }

export function DocentesView() {
  const { docentes, grupos, anio, puedeEditar, recargar, backup, notify, user, cargando } = useLive()
  const [q, setQ] = useState('')
  const [nivel, setNivel] = useState<Nivel | ''>('')
  const [verJub, setVerJub] = useState(false)
  const [edit, setEdit] = useState<Docente | 'nuevo' | null>(null)
  const [perfil, setPerfil] = useState<DocenteDia | null>(null)
  const [elim, setElim] = useState<DocenteDia[] | null>(null)
  const [masivo, setMasivo] = useState(false)
  const [papelera, setPapelera] = useState(false)
  const [copiar, setCopiar] = useState<DocenteDia | null>(null)

  const lista = useMemo(() => docentes.filter(d => {
    if ((nivel && d.nivel !== nivel) || (verJub ? !d.jubilado : false)) return false
    return !q || quitarTildes(`${d.apellido} ${d.nombre} ${d.cargo}`.toLowerCase()).includes(quitarTildes(q.toLowerCase()))
  }), [docentes, q, nivel, verJub])

  const quien = user?.email || 'admin'
  const confirmarEliminar = async () => {
    if (!elim) return
    try {
      await Promise.all([...new Set(elim.map(d => d.nivel))].map(n => softDeleteDocentes(elim.filter(d => d.nivel === n).map(d => d.id), n, true, quien)))
      backup(`Eliminar docente${elim.length > 1 ? 's' : ''}: ${elim.length}`)
      notify(`${elim.length} docente${elim.length !== 1 ? 's' : ''} eliminado${elim.length !== 1 ? 's' : ''} (recuperable${elim.length !== 1 ? 's' : ''} desde la papelera).`)
      setElim(null); setMasivo(false); await recargar()
    } catch (e) { notify(`Error: ${(e as Error).message}`) }
  }

  return <>
    <PageHeading eyebrow="ADMINISTRACIÓN" title="Docentes y personal" description="Alta, edición y baja del personal, con sus horarios y grupos."
      action={<div className="heading-actions">
        <button className="button secondary" onClick={() => setPapelera(true)}><Trash2 size={16} />Papelera</button>
        {puedeEditar && <button className="button secondary" onClick={() => setMasivo(true)}><Trash2 size={16} />Eliminar varios</button>}
        {puedeEditar && <button className="button primary" onClick={() => setEdit('nuevo')}><Plus size={17} />Nuevo docente</button>}
      </div>} />
    <AnioNuevo />
    <section className="panel table-panel">
      <div className="toolbar">
        <div className="table-search"><Search size={17} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre o cargo..." aria-label="Buscar docente" /></div>
        <label className="inline-select"><span className="sr-only">Nivel</span><select value={nivel} onChange={e => setNivel(e.target.value as Nivel | '')} aria-label="Filtrar por nivel"><option value="">Todos los niveles</option>{NIVELES.map(n => <option key={n.v} value={n.v}>{n.l}</option>)}</select></label>
        <label className="check-inline"><input type="checkbox" checked={verJub} onChange={e => setVerJub(e.target.checked)} /> Solo jubilados</label>
      </div>
      <div className="table-scroll"><table><thead><tr><th>DOCENTE</th><th>NIVEL</th><th>ÁREA</th><th>HORAS</th><th>DÍAS</th><th>ESTADO</th><th>ACCIONES</th></tr></thead><tbody>
        {cargando && !docentes.length && <tr><td colSpan={7} className="empty-state">Cargando…</td></tr>}
        {!cargando && !lista.length && <tr><td colSpan={7} className="empty-state">No hay docentes que coincidan.</td></tr>}
        {lista.map(d => {
          const tipo = getTipoHs(d)
          const hs = tipo === 'reloj' ? `${Math.floor(hsSemanales(d.horario))} hs reloj` : `${Math.floor(hsCatedraSemanales(d.horario))} hc`
          const dias = (Object.keys(d.horario) as DiaKey[]).filter(k => normalizarFranjas(d.horario[k]).length).sort((a, b) => DIA_ORDEN.indexOf(DIAS_KEYS.indexOf(a)) - DIA_ORDEN.indexOf(DIAS_KEYS.indexOf(b)))
          return <tr key={d.id}>
            <td><div className="person-cell"><Avatar initials={(d.apellido || d.nombre).slice(0, 1).toUpperCase()} small /><div><strong>{nombreMostrar(d)}</strong><span>{d.cargo || '—'}</span></div></div></td>
            <td>{NIVEL_LABEL[d.nivel] || d.nivel}</td><td>{d.area || <span className="muted-cell">—</span>}</td><td className="muted-cell">{hs}</td>
            <td className="muted-cell">{dias.map(k => DIA_ABREV[DIAS_KEYS.indexOf(k)]).join(', ') || 'Sin horario'}</td>
            <td><StatusBadge tone={d.jubilado ? 'blue' : 'success'}>{d.jubilado ? 'Jubilado/a' : 'Activo'}</StatusBadge></td>
            <td><div className="row-actions">
              <button className="mini-btn" aria-label={`Ver perfil de ${nombreMostrar(d)}`} onClick={() => setPerfil(d)}><Eye size={13} /></button>
              {puedeEditar && <><button className="mini-btn" aria-label={`Editar a ${nombreMostrar(d)}`} onClick={() => setEdit(d)}><Pencil size={13} /></button>
                <button className="mini-btn" aria-label={`Copiar a otro nivel a ${nombreMostrar(d)}`} onClick={() => setCopiar(d)}><Copy size={13} /></button>
                <button className="mini-btn bad" aria-label={`Eliminar a ${nombreMostrar(d)}`} onClick={() => setElim([d])}><Trash2 size={13} /></button></>}
            </div></td>
          </tr>
        })}
      </tbody></table></div>
      <div className="pagination"><span>{lista.length} de {docentes.length} docentes · año {anio}</span></div>
    </section>

    {edit && <EditorDocente docente={edit === 'nuevo' ? null : edit} onClose={() => setEdit(null)} onEliminar={d => { setEdit(null); setElim([d as DocenteDia]) }} />}
    {perfil && <PerfilModal docente={perfil} onClose={() => setPerfil(null)} onEditar={() => { const d = perfil; setPerfil(null); setEdit(d) }} />}
    {elim && <div className="modal-backdrop" onClick={() => setElim(null)}><div className="modal" role="alertdialog" aria-modal="true" aria-label="Eliminar docente" onClick={e => e.stopPropagation()}>
      <div className="modal-header"><div><h2>Eliminar docente{elim.length > 1 ? 's' : ''}</h2><p>Se pueden recuperar desde la papelera.</p></div><button className="icon-button" aria-label="Cerrar" onClick={() => setElim(null)}><X size={18} /></button></div>
      <div className="modal-body"><p>¿Seguro que querés eliminar a <strong>{elim.length === 1 ? nombreMostrar(elim[0]) : `${elim.length} docentes`}</strong>?</p></div>
      <div className="modal-footer"><button className="button secondary" autoFocus onClick={() => setElim(null)}>Cancelar</button><button className="button danger" onClick={confirmarEliminar}><Trash2 size={15} />Eliminar</button></div>
    </div></div>}
    {masivo && <EliminarMasivo onClose={() => setMasivo(false)} onConfirmar={ds => setElim(ds)} />}
    {papelera && <Papelera onClose={() => setPapelera(false)} />}
    {copiar && <CopiarNivel docente={copiar} onClose={() => setCopiar(null)} />}
    {grupos.length === 0 ? null : null}
  </>
}

/** Cuando el año elegido no tiene docentes, ofrece copiar los del año anterior. */
function AnioNuevo() {
  const { anio, docentes, cargando, recargar, notify } = useLive()
  const [visible, setVisible] = useState(true)
  const [trabajando, setTrabajando] = useState(false)
  if (cargando || docentes.length || anio <= 2026 || !visible) return null
  const copiar = async () => {
    setTrabajando(true)
    try { const n = await copiarDocentesAnioAnterior(anio); notify(n ? `Se copiaron ${n} docentes de ${anio - 1} a ${anio}.` : `No hay docentes en ${anio - 1} para copiar.`); await recargar() } catch (e) { notify(`Error: ${(e as Error).message}`) } finally { setTrabajando(false) }
  }
  const vacio = async () => { await crearAnioVacio(anio); setVisible(false); await recargar() }
  return <section className="panel anio-nuevo"><div className="panel-header"><div><h2>No hay docentes para {anio}</h2><p>¿Querés copiar los docentes de {anio - 1} (sin faltas)?</p></div></div>
    <div className="anio-acciones"><button className="button primary inline" disabled={trabajando} onClick={copiar}>{trabajando ? 'Copiando…' : 'Sí, copiar docentes'}</button><button className="button secondary inline" onClick={vacio}>Empezar vacío</button></div></section>
}

type Franjas = Record<DiaKey, Franja[]>
const vacioFranjas = (): Franjas => Object.fromEntries(DIAS_KEYS.map(k => [k, []])) as unknown as Franjas

function EditorDocente({ docente, onClose, onEliminar }: { docente: Docente | null; onClose: () => void; onEliminar: (d: Docente) => void }) {
  const { anio, docentes, grupos, recargar, backup, notify } = useLive()
  const nuevo = !docente
  const [nombre, setNombre] = useState(docente?.nombre || '')
  const [apellido, setApellido] = useState(docente?.apellido || (docente ? (docente.nombre.trim().split(/\s+/).length > 1 ? docente.nombre.trim().split(/\s+/).pop()! : '') : ''))
  const [cargo, setCargo] = useState(docente?.cargo || '')
  const [tipoHs, setTipoHs] = useState(docente ? getTipoHs(docente) : 'catedra')
  const [nivel, setNivel] = useState<Nivel>(docente?.nivel || 'secundaria')
  const [area, setArea] = useState(docente?.area || '')
  const [materias, setMaterias] = useState(docente?.materias || '')
  const [notas, setNotas] = useState(docente?.notas || '')
  const [jubilado, setJubilado] = useState(docente?.jubilado || false)
  const [gsel, setGsel] = useState<string[]>(docente?.grupos || [])
  const [fr, setFr] = useState<Franjas>(() => { const b = vacioFranjas(); DIAS_KEYS.forEach(k => { b[k] = normalizarFranjas(docente?.horario?.[k]).map(f => ({ ...f })) }); return b })
  const [error, setError] = useState('')
  const [dup, setDup] = useState<Docente | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [copiaDe, setCopiaDe] = useState<DiaKey | null>(null)

  const totalMin = DIAS_KEYS.reduce((s, k) => s + minDia(fr[k]), 0)
  const previa = tipoHs === 'reloj' ? `${Math.floor(totalMin / 60)} hs reloj` : `${Math.floor(totalMin / 40)} horas cátedra (${Math.floor(totalMin / 60)} hs reloj)`
  const setDia = (k: DiaKey, f: Franja[]) => setFr(p => ({ ...p, [k]: f }))
  const horario: Horario = Object.fromEntries(DIAS_KEYS.filter(k => fr[k].length).map(k => [k, fr[k].filter(f => f.entrada && f.salida)])) as Horario

  const datos = (): DatosDocente => ({ nombre: nombre.trim(), apellido: apellido.trim(), cargo: cargo.trim(), tipoHs, horario, grupos: gsel, materias: materias.trim(), notas: notas.trim(), jubilado, nivel, area: area.trim() })

  const guardar = async (forzar = false) => {
    if (!nombre.trim()) { setError('El nombre es obligatorio.'); return }
    for (const k of DIAS_KEYS) for (const f of fr[k]) if (f.entrada >= f.salida) { setError(`En ${DIA_ABREV[DIAS_KEYS.indexOf(k)]}, la entrada debe ser anterior a la salida.`); return }
    if (nuevo && !forzar) {
      const n = quitarTildes(nombre.trim().toLowerCase()), a = quitarTildes(apellido.trim().toLowerCase())
      const d = docentes.find(x => { const xn = quitarTildes(x.nombre.toLowerCase()), xa = quitarTildes(x.apellido.toLowerCase()); return a && xa ? xn === n && xa === a : xn === n })
      if (d) { setDup(d); return }
    }
    setGuardando(true); setError('')
    try {
      if (nuevo) await crearDocente(datos(), anio); else await actualizarDocente(docente!.id, datos(), anio)
      backup(`${nuevo ? 'Nuevo' : 'Editar'} docente: ${apellido} ${nombre}`)
      notify(`${nombre.trim()} ${nuevo ? 'agregado' : 'actualizado'}.`)
      await recargar(); onClose()
    } catch (e) { setError((e as Error).message) } finally { setGuardando(false) }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal wide" role="dialog" aria-modal="true" aria-label={nuevo ? 'Nuevo docente' : 'Editar docente'}>
        <div className="modal-header"><div><h2>{nuevo ? 'Nuevo docente' : 'Editar docente'}</h2><p>{nuevo ? 'Completá los datos. Los campos con * son obligatorios.' : docente!.nombre}</p></div><button className="icon-button" aria-label="Cerrar" onClick={onClose}><X size={18} /></button></div>
        <div className="modal-body">
          <div className="form-row"><label>Nombre *<input value={nombre} onChange={e => { setNombre(e.target.value); setError('') }} aria-invalid={!nombre.trim() && !!error} /></label><label>Apellido<input value={apellido} onChange={e => setApellido(e.target.value)} /></label></div>
          <div className="form-row"><label>Cargo<input value={cargo} onChange={e => { setCargo(e.target.value); if (nuevo) setTipoHs(esCargoReloj(e.target.value) ? 'reloj' : 'catedra') }} placeholder="Ej. Profesor de Matemática" /></label>
            <label>Tipo de horas<select value={tipoHs} onChange={e => setTipoHs(e.target.value)}><option value="catedra">Horas cátedra (40 min)</option><option value="reloj">Horas reloj</option></select></label></div>
          <div className="form-row"><label>Nivel<select value={nivel} onChange={e => setNivel(e.target.value as Nivel)}>{NIVELES.map(n => <option key={n.v} value={n.v}>{n.l}</option>)}{nivel === 'estudiantes' && <option value="estudiantes">Estudiantes</option>}</select></label>
            <label>{AREA_LABEL[nivel] || 'Área'}<input value={area} onChange={e => setArea(e.target.value)} placeholder={nivel === 'secundaria' ? 'Ej. Ciencias Exactas' : nivel === 'primaria' ? 'Ej. 1° Grado' : 'Ej. Sala Azul'} /></label></div>
          <label>Materias<input value={materias} onChange={e => setMaterias(e.target.value)} /></label>
          <label>Notas<input value={notas} onChange={e => setNotas(e.target.value)} placeholder="Observaciones internas" /></label>
          <label className="check-inline pad"><input type="checkbox" checked={jubilado} onChange={e => setJubilado(e.target.checked)} /> Jubilado/a</label>
          {grupos.length > 0 && <fieldset className="radios"><legend>Grupos</legend>{grupos.map(g => <label key={g.id} className={`grupo-chk ${gsel.includes(g.id) ? 'on' : ''}`}><input type="checkbox" checked={gsel.includes(g.id)} onChange={e => setGsel(s => e.target.checked ? [...s, g.id] : s.filter(x => x !== g.id))} /><i style={{ background: g.color }} />{g.nombre}</label>)}</fieldset>}

          <fieldset className="horario-editor"><legend>Horario semanal</legend>
            {DIA_ORDEN.map(idx => { const k = DIAS_KEYS[idx]; const activo = fr[k].length > 0; return (
              <div className="dia-bloque" key={k}>
                <div className="dia-cab"><label className="check-inline"><input type="checkbox" checked={activo} onChange={e => setDia(k, e.target.checked ? [{ entrada: '08:00', salida: '13:00', materia: '' }] : [])} /> <strong>{DIA_ABREV[idx]}</strong></label>
                  {activo && <><button type="button" className="mini-btn" onClick={() => setDia(k, [...fr[k], { entrada: '08:00', salida: '13:00', materia: '' }])}><Plus size={12} /> franja</button>
                    <button type="button" className="mini-btn" onClick={() => setCopiaDe(copiaDe === k ? null : k)}><Copy size={12} /> Copiar a…</button></>}</div>
                {copiaDe === k && <div className="copiar-dias">{DIAS_KEYS.filter(d => d !== k && d !== 'domingo').map(d => (
                  <label key={d} className="modulo-chip"><input type="checkbox" onChange={e => { if (e.target.checked) setDia(d, fr[k].map(f => ({ ...f }))) }} /> {DIA_ABREV[DIAS_KEYS.indexOf(d)]}</label>))}
                  <button type="button" className="mini-btn ok" onClick={() => { setCopiaDe(null); notify('Horario copiado.') }}>Listo</button></div>}
                {activo && fr[k].map((f, i) => (
                  <div className="franja-row" key={i}>
                    <input type="time" aria-label="Entrada" value={f.entrada} onChange={e => setDia(k, fr[k].map((x, j) => j === i ? { ...x, entrada: e.target.value } : x))} />
                    <span>a</span>
                    <input type="time" aria-label="Salida" value={f.salida} onChange={e => setDia(k, fr[k].map((x, j) => j === i ? { ...x, salida: e.target.value } : x))} />
                    <input type="text" aria-label="Materia" placeholder="Materia (opcional)" value={f.materia || ''} onChange={e => setDia(k, fr[k].map((x, j) => j === i ? { ...x, materia: e.target.value } : x))} />
                    {fr[k].length > 1 && <button type="button" className="mini-btn bad" aria-label="Quitar franja" onClick={() => setDia(k, fr[k].filter((_, j) => j !== i))}>−</button>}
                  </div>))}
              </div>) })}
            <p className="hs-preview">Total semanal: <strong>{previa}</strong></p>
          </fieldset>
          {error && <p role="alert" className="form-error">{error}</p>}
        </div>
        <div className="modal-footer">
          {!nuevo && <button className="button danger-outline" onClick={() => onEliminar(docente!)}><Trash2 size={15} />Eliminar</button>}
          <span className="footer-spacer" />
          <button className="button secondary" onClick={onClose}>Cancelar</button>
          <button className="button primary" disabled={guardando} onClick={() => guardar()}><Check size={16} />{guardando ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>
      {dup && <div className="modal-backdrop" onClick={() => setDup(null)}><div className="modal" role="alertdialog" aria-modal="true" aria-label="Docente duplicado" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><div><h2>Ya existe un docente con ese nombre</h2><p>{nombreMostrar(dup)}{dup.cargo ? ` · ${dup.cargo}` : ''}</p></div></div>
        <div className="modal-body"><p>¿Qué querés hacer?</p></div>
        <div className="modal-footer"><button className="button secondary" onClick={() => setDup(null)}>Cancelar</button><button className="button secondary" onClick={() => { setDup(null); guardar(true) }}>Guardar igual</button></div>
      </div></div>}
    </div>
  )
}

function EliminarMasivo({ onClose, onConfirmar }: { onClose: () => void; onConfirmar: (d: DocenteDia[]) => void }) {
  const { docentes } = useLive()
  const [sel, setSel] = useState<string[]>([])
  const [q, setQ] = useState('')
  const lista = docentes.filter(d => !q || quitarTildes(`${d.apellido} ${d.nombre}`.toLowerCase()).includes(quitarTildes(q.toLowerCase())))
  return <div className="modal-backdrop" onClick={onClose}><div className="modal wide" role="dialog" aria-modal="true" aria-label="Eliminar varios docentes" onClick={e => e.stopPropagation()}>
    <div className="modal-header"><div><h2>Eliminar varios docentes</h2><p>Elegí los docentes a mover a la papelera.</p></div><button className="icon-button" aria-label="Cerrar" onClick={onClose}><X size={18} /></button></div>
    <div className="modal-body">
      <div className="nov-toolbar"><label>Buscar<input value={q} onChange={e => setQ(e.target.value)} placeholder="Nombre…" /></label>
        <label className="check-inline"><input type="checkbox" checked={lista.length > 0 && lista.every(d => sel.includes(d.id))} onChange={e => setSel(e.target.checked ? [...new Set([...sel, ...lista.map(d => d.id)])] : sel.filter(id => !lista.some(d => d.id === id)))} /> Seleccionar todos</label></div>
      <div className="mas-lista">{lista.map(d => <label className="mas-item" key={d.id}><input type="checkbox" checked={sel.includes(d.id)} onChange={e => setSel(s => e.target.checked ? [...s, d.id] : s.filter(x => x !== d.id))} /><span><strong>{nombreMostrar(d)}</strong><small>{d.cargo || '—'}</small></span></label>)}</div>
    </div>
    <div className="modal-footer"><span className="muted-cell">{sel.length} seleccionado{sel.length !== 1 ? 's' : ''}</span><span className="footer-spacer" /><button className="button secondary" onClick={onClose}>Cancelar</button>
      <button className="button danger" disabled={!sel.length} onClick={() => onConfirmar(docentes.filter(d => sel.includes(d.id)))}><Trash2 size={15} />Eliminar seleccionados</button></div>
  </div></div>
}

function Papelera({ onClose }: { onClose: () => void }) {
  const { anio, recargar, notify, user, backup } = useLive()
  const [items, setItems] = useState<Docente[] | null>(null)
  const [error, setError] = useState('')
  const cargar = async () => { try { setItems(await cargarDocentesEliminados(anio)) } catch (e) { setError((e as Error).message) } }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargar() }, [])
  const restaurar = async (d: Docente) => {
    try {
      const niv = Object.keys(d.eliminadoEn || {}).filter(n => d.eliminadoEn![n])
      await Promise.all(niv.map(n => softDeleteDocentes([d.id], n, false, user?.email || 'admin')))
      backup(`Restaurar docente: ${d.nombre}`); notify(`${nombreMostrar(d)} fue restaurado.`)
      await cargar(); await recargar()
    } catch (e) { setError((e as Error).message) }
  }
  return <div className="modal-backdrop" onClick={onClose}><div className="modal" role="dialog" aria-modal="true" aria-label="Papelera" onClick={e => e.stopPropagation()}>
    <div className="modal-header"><div><h2>Papelera</h2><p>Docentes eliminados del año {anio}.</p></div><button className="icon-button" aria-label="Cerrar" onClick={onClose}><X size={18} /></button></div>
    <div className="modal-body">
      {error && <p role="alert" className="form-error">{error}</p>}
      {items === null ? <p className="empty-state">Cargando…</p> : !items.length ? <p className="empty-state">La papelera está vacía.</p> : items.map(d => (
        <div className="pap-row" key={d.id}><div><strong>{nombreMostrar(d)}</strong><small>{d.cargo || '—'} · {Object.keys(d.eliminadoEn || {}).filter(n => d.eliminadoEn![n]).map(n => NIVEL_LABEL[n] || n).join(', ')}</small></div>
          <button className="mini-btn ok" onClick={() => restaurar(d)}><RotateCcw size={12} /> Restaurar</button></div>))}
    </div>
    <div className="modal-footer"><button className="button secondary" onClick={onClose}>Cerrar</button></div>
  </div></div>
}

function CopiarNivel({ docente, onClose }: { docente: DocenteDia; onClose: () => void }) {
  const { anio, recargar, notify, backup } = useLive()
  const [error, setError] = useState('')
  const copiar = async (n: Nivel) => {
    try { await copiarDocenteANivel(docente, n, anio); backup(`Copiar ${docente.nombre} a ${n}`); notify(`${nombreMostrar(docente)} copiado a ${NIVEL_LABEL[n]}.`); await recargar(); onClose() } catch (e) { setError((e as Error).message) }
  }
  return <div className="modal-backdrop" onClick={onClose}><div className="modal" role="dialog" aria-modal="true" aria-label="Copiar a otro nivel" onClick={e => e.stopPropagation()}>
    <div className="modal-header"><div><h2>Copiar a otro nivel</h2><p>{nombreMostrar(docente)} · las novedades no se copian.</p></div><button className="icon-button" aria-label="Cerrar" onClick={onClose}><X size={18} /></button></div>
    <div className="modal-body copiar-niveles">{NIVELES.filter(n => n.v !== docente.nivel).map(n => <button key={n.v} className="button secondary" onClick={() => copiar(n.v)}>Crear copia en {n.l}</button>)}{error && <p role="alert" className="form-error">{error}</p>}</div>
    <div className="modal-footer"><button className="button secondary" onClick={onClose}>Cancelar</button></div>
  </div></div>
}

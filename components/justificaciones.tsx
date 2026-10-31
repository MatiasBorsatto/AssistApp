'use client'

import { useMemo, useState } from 'react'
import { Check, CheckCircle2, ImageIcon, Paperclip, Pencil, Plus, Search, Trash2, X, XCircle } from 'lucide-react'
import { Avatar, PageHeading, StatusBadge } from './shared'
import { RowMenu } from './views'
import { SubirImagen, type Adjunto } from './subir-imagen'
import { useDemoBus } from '@/lib/demo-bus'
import { courses, type Justification } from '@/lib/data'
import { CONFIG_INICIAL } from '@/lib/fichaje'
import { diasHabilesTxt, rangoCorto } from '@/lib/fechas'
import type { Role } from '@/lib/roles'

type Notify = (m?: string) => void
type Estado = Justification['status']
export const tonoEstado = (s: string) => (s === 'Aprobado' ? 'success' : s === 'Rechazado' ? 'danger' : 'warning')
const MOTIVOS_PERSONAL = ['Enfermedad', 'Licencia médica', 'Trámite personal', 'Duelo', 'Comisión de servicio', 'Capacitación', 'Otro motivo']
const MOTIVOS_ALUMNO = ['Enfermedad', 'Control médico', 'Trámite familiar', 'Duelo familiar', 'Problema de transporte', 'Otro motivo']
const iniciales = (n: string) => n.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
const hoy = () => new Date().toISOString().slice(0, 10)

/** Quién ve cada justificación: Administración revisa las del personal y el Preceptor las de los alumnos. */
export const visiblesPara = (role: Role, items: Justification[]) => items.filter(j => j.ambito === (role === 'Preceptor' ? 'alumno' : 'personal'))

export function JustificationsView({ role, items, onAdd, onResolve, onEdit, onDelete, onNotify }: {
  role: Role
  items: Justification[]
  onAdd: (j: Omit<Justification, 'id' | 'status'>) => void
  onResolve: (id: number, status: 'Aprobado' | 'Rechazado', respuesta?: string) => void
  onEdit: (id: number, patch: Omit<Justification, 'id' | 'initials'>) => void
  onDelete: (id: number) => void
  onNotify: Notify
}) {
  const esPreceptor = role === 'Preceptor'
  const ambito: Justification['ambito'] = esPreceptor ? 'alumno' : 'personal'
  const bus = useDemoBus()
  const personal = (bus?.config ?? CONFIG_INICIAL).personal
  const lista = useMemo(() => visiblesPara(role, items), [role, items])

  const [filtro, setFiltro] = useState<'' | Estado>('')
  const [q, setQ] = useState('')
  const [detalle, setDetalle] = useState<Justification | null>(null)
  const [rechazando, setRechazando] = useState<Justification | null>(null)
  const [respuesta, setRespuesta] = useState('')
  const [borrando, setBorrando] = useState<Justification | null>(null)
  const [form, setForm] = useState<{ modo: 'nueva' | 'editar'; id?: number } | null>(null)

  const cuenta = (s: Estado) => lista.filter(j => j.status === s).length
  const mostrar = lista.filter(j => (!filtro || j.status === filtro) && (!q || `${j.name} ${j.reason} ${j.curso ?? ''}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => (a.status === 'Pendiente' ? 0 : 1) - (b.status === 'Pendiente' ? 0 : 1) || b.desde.localeCompare(a.desde))

  const resolver = (j: Justification, estado: 'Aprobado' | 'Rechazado', resp?: string) => {
    onResolve(j.id, estado, resp)
    const ok = estado === 'Aprobado'
    const para: Role[] | null = j.ambito === 'alumno' ? (j.name === 'Tomás Ríos' ? ['Alumno'] : null) : (j.name === 'María González' ? ['Profesor'] : null)
    if (para) bus?.push({ para, title: `Tu justificación fue ${ok ? 'aprobada' : 'rechazada'}`, msg: `${j.reason} (${rangoCorto(j.desde, j.hasta)}).${!ok && resp ? ` Motivo: ${resp}` : ''}`, tone: ok ? 'success' : 'warning' })
    onNotify(`Justificación de ${j.name} ${ok ? 'aprobada' : 'rechazada'}. Se le avisó ${j.ambito === 'alumno' ? 'al alumno' : 'a la persona'}.`)
  }
  const confirmarRechazo = () => { if (rechazando) { resolver(rechazando, 'Rechazado', respuesta.trim() || undefined); setRechazando(null); setRespuesta(''); setDetalle(null) } }

  const editando = form?.modo === 'editar' ? items.find(j => j.id === form.id) : undefined
  const personas = esPreceptor ? Object.entries(courses).flatMap(([c, l]) => l.map(a => ({ nombre: a.name, curso: c }))) : personal.map(p => ({ nombre: p.nombre, curso: undefined as string | undefined }))

  return <>
    <PageHeading eyebrow="REVISIÓN" title="Justificaciones"
      description={esPreceptor ? 'Los alumnos envían sus justificaciones desde su perfil. Revisalas y decidí si aprobarlas o rechazarlas.' : 'Justificaciones del personal. Revisalas y decidí si aprobarlas o rechazarlas; la persona recibe el aviso.'}
      action={<button className="button primary" onClick={() => setForm({ modo: 'nueva' })}><Plus size={17} />{esPreceptor ? 'Cargar una justificación' : 'Cargar licencia o ausencia'}</button>} />

    <div className="filtros-estado" role="group" aria-label="Filtrar por estado">
      {([['', 'Todas', lista.length, 'blue'], ['Pendiente', 'Para revisar', cuenta('Pendiente'), 'warning'], ['Aprobado', 'Aprobadas', cuenta('Aprobado'), 'success'], ['Rechazado', 'Rechazadas', cuenta('Rechazado'), 'danger']] as const).map(([v, l, n, t]) => (
        <button key={l} className={`filtro-tile ${t} ${filtro === v ? 'on' : ''}`} aria-pressed={filtro === v} onClick={() => setFiltro(v as '' | Estado)}><strong>{n}</strong><span>{l}</span></button>))}
    </div>

    <section className="panel table-panel">
      <div className="toolbar"><div className="table-search"><Search size={17} /><input value={q} onChange={e => setQ(e.target.value)} placeholder={esPreceptor ? 'Buscar por alumno, curso o motivo…' : 'Buscar por persona o motivo…'} aria-label="Buscar justificaciones" /></div></div>
      {mostrar.length === 0 ? <div className="vacio"><CheckCircle2 size={30} /><strong>{lista.length === 0 ? 'Todavía no hay justificaciones' : 'No hay justificaciones con ese filtro'}</strong><p>{lista.length === 0 ? (esPreceptor ? 'Cuando un alumno envíe una, aparece acá para que la revises.' : 'Cargá una con el botón de arriba.') : 'Probá cambiar el filtro o la búsqueda.'}</p></div> : (
        <div className="table-scroll"><table><thead><tr><th>{esPreceptor ? 'ALUMNO' : 'PERSONA'}</th><th>PERÍODO</th><th>MOTIVO</th><th>DOCUMENTO</th><th>ESTADO</th><th>QUÉ HACER</th></tr></thead><tbody>
          {mostrar.map(j => <tr key={j.id} className={j.status === 'Pendiente' ? 'fila-pendiente' : ''}>
            <td><button className="link-persona" onClick={() => setDetalle(j)} aria-label={`Ver el detalle de ${j.name}`}><Avatar initials={j.initials} small /><span><strong>{j.name}</strong>{j.curso && <small>{j.curso}</small>}</span></button></td>
            <td><strong className="periodo">{rangoCorto(j.desde, j.hasta)}</strong><small className="muted-cell blq">{diasHabilesTxt(j.desde, j.hasta)}</small></td>
            <td>{j.reason}</td>
            <td>{j.imagen ? <button className="miniatura" onClick={() => setDetalle(j)} aria-label="Ver la imagen adjunta"><img src={j.imagen} alt="" /><span><ImageIcon size={12} /> Ver foto</span></button> : j.attachment ? <span className="attach-chip"><Paperclip size={12} />{j.attachment}</span> : <span className="muted-cell">Sin adjunto</span>}</td>
            <td><StatusBadge tone={tonoEstado(j.status)}>{j.status === 'Pendiente' ? 'Para revisar' : j.status}</StatusBadge></td>
            <td><div className="row-actions">
              {j.status === 'Pendiente' ? <><button className="mini-btn ok" onClick={() => resolver(j, 'Aprobado')}><Check size={13} /> Aprobar</button><button className="mini-btn bad" onClick={() => { setRechazando(j); setRespuesta('') }}><X size={13} /> Rechazar</button></> : <button className="mini-btn" onClick={() => setDetalle(j)}>Ver detalle</button>}
              <RowMenu label={`Más acciones para ${j.name}`} onDetail={() => setDetalle(j)} onEdit={() => setForm({ modo: 'editar', id: j.id })} onDelete={() => setBorrando(j)} /></div></td></tr>)}
        </tbody></table></div>)}
    </section>

    {form && <FormJustificacion key={form.id ?? 'nueva'} modo={form.modo} base={editando} ambito={ambito} personas={personas} motivos={esPreceptor ? MOTIVOS_ALUMNO : MOTIVOS_PERSONAL}
      onClose={() => setForm(null)}
      onSave={d => {
        if (form.modo === 'editar' && editando) { const { initials: _i, ...resto } = d; void _i; onEdit(editando.id, resto); onNotify('La justificación fue actualizada.') }
        else { const { status: _s, ...resto } = d; void _s; onAdd({ ...resto, origin: esPreceptor ? 'Preceptoría' : 'Administración' }); onNotify('Justificación cargada. Quedó para revisar.') }
        setForm(null)
      }} />}

    {detalle && <div className="modal-backdrop" onClick={() => setDetalle(null)}><div className="modal wide" role="dialog" aria-modal="true" aria-label="Detalle de la justificación" onClick={e => e.stopPropagation()}>
      <div className="modal-header"><div><h2>{detalle.name}</h2><p>{detalle.curso ? `${detalle.curso} · ` : ''}Enviada por: {detalle.origin}</p></div><button className="icon-button" aria-label="Cerrar" onClick={() => setDetalle(null)}><X size={18} /></button></div>
      <div className="modal-body detail-list">
        <div><span>Estado</span><StatusBadge tone={tonoEstado(detalle.status)}>{detalle.status === 'Pendiente' ? 'Para revisar' : detalle.status}</StatusBadge></div>
        <div><span>Período</span><strong>{rangoCorto(detalle.desde, detalle.hasta)} · {diasHabilesTxt(detalle.desde, detalle.hasta)}</strong></div>
        <div><span>Motivo</span><strong>{detalle.reason}</strong></div>
        {detalle.comentario && <div><span>Comentario</span><strong>{detalle.comentario}</strong></div>}
        {detalle.respuesta && <div><span>Respuesta</span><strong>{detalle.respuesta}</strong></div>}
        <div className="detalle-adjunto"><span>Documentación</span>{detalle.imagen
          ? <a href={detalle.imagen} target="_blank" rel="noreferrer" aria-label="Abrir la imagen en tamaño completo"><img src={detalle.imagen} alt={`Certificado adjunto de ${detalle.name}`} /></a>
          : <strong>{detalle.attachment ?? 'Sin documentación adjunta'}</strong>}</div>
      </div>
      <div className="modal-footer">
        <button className="button danger-outline" onClick={() => { const j = detalle; setDetalle(null); setBorrando(j) }}><Trash2 size={15} />Eliminar</button><span className="footer-spacer" />
        {detalle.status === 'Pendiente' ? <>
          <button className="button danger-outline" onClick={() => { setRechazando(detalle); setRespuesta('') }}><XCircle size={16} />Rechazar</button>
          <button className="button primary" onClick={() => { resolver(detalle, 'Aprobado'); setDetalle(null) }}><CheckCircle2 size={16} />Aprobar</button></> : <>
          <button className="button secondary" onClick={() => setDetalle(null)}>Cerrar</button>
          <button className="button primary" onClick={() => { const j = detalle; setDetalle(null); setForm({ modo: 'editar', id: j.id }) }}><Pencil size={15} />Editar</button></>}
      </div>
    </div></div>}

    {rechazando && <div className="modal-backdrop" onClick={() => setRechazando(null)}><div className="modal" role="dialog" aria-modal="true" aria-label="Rechazar justificación" onClick={e => e.stopPropagation()}>
      <div className="modal-header"><div><h2>Rechazar justificación</h2><p>{rechazando.name} · {rangoCorto(rechazando.desde, rechazando.hasta)}</p></div><button className="icon-button" aria-label="Cerrar" onClick={() => setRechazando(null)}><X size={18} /></button></div>
      <div className="modal-body"><label>¿Por qué se rechaza? (opcional)<textarea rows={3} value={respuesta} onChange={e => setRespuesta(e.target.value)} placeholder="Ej. Falta el certificado médico. Traelo y la volvemos a revisar." /></label>
        <p className="ayuda-form">Este mensaje le llega a {rechazando.ambito === 'alumno' ? 'al alumno' : 'la persona'} junto con el aviso.</p></div>
      <div className="modal-footer"><button className="button secondary" autoFocus onClick={() => setRechazando(null)}>Cancelar</button><button className="button danger" onClick={confirmarRechazo}><XCircle size={16} />Rechazar y avisar</button></div>
    </div></div>}

    {borrando && <div className="modal-backdrop" onClick={() => setBorrando(null)}><div className="modal" role="alertdialog" aria-modal="true" aria-label="Eliminar justificación" onClick={e => e.stopPropagation()}>
      <div className="modal-header"><div><h2>Eliminar justificación</h2><p>Esta acción no se puede deshacer.</p></div><button className="icon-button" aria-label="Cerrar" onClick={() => setBorrando(null)}><X size={18} /></button></div>
      <div className="modal-body"><p>¿Seguro que querés eliminar la justificación de <strong>{borrando.name}</strong> ({borrando.reason}, {rangoCorto(borrando.desde, borrando.hasta)})?</p></div>
      <div className="modal-footer"><button className="button secondary" autoFocus onClick={() => setBorrando(null)}>Cancelar</button><button className="button danger" onClick={() => { onDelete(borrando.id); onNotify('La justificación fue eliminada.'); setBorrando(null) }}><Trash2 size={15} />Eliminar</button></div>
    </div></div>}
  </>
}

function FormJustificacion({ modo, base, ambito, personas, motivos, onClose, onSave }: {
  modo: 'nueva' | 'editar'; base?: Justification; ambito: Justification['ambito']; personas: { nombre: string; curso?: string }[]; motivos: string[]
  onClose: () => void; onSave: (d: Omit<Justification, 'id'>) => void
}) {
  const [persona, setPersona] = useState(base?.name ?? '')
  const [otra, setOtra] = useState('')
  const [motivo, setMotivo] = useState(base ? (motivos.includes(base.reason) ? base.reason : 'Otro motivo') : '')
  const [otroMotivo, setOtroMotivo] = useState(base && !motivos.includes(base.reason) ? base.reason : '')
  const [desde, setDesde] = useState(base?.desde ?? hoy())
  const [hasta, setHasta] = useState(base?.hasta ?? hoy())
  const [estado, setEstado] = useState<Estado>(base?.status ?? 'Pendiente')
  const [comentario, setComentario] = useState(base?.comentario ?? '')
  const [adj, setAdj] = useState<Adjunto>({ imagen: base?.imagen, nombre: base?.imagen ? 'Imagen adjunta' : base?.attachment })
  const [errores, setErrores] = useState<Record<string, string>>({})

  const guardar = () => {
    const nombre = persona === '__otra' ? otra.trim() : persona
    const m = motivo === 'Otro motivo' ? otroMotivo.trim() : motivo
    const e: Record<string, string> = {}
    if (!nombre) e.persona = persona === '__otra' ? 'Escribí el nombre.' : 'Elegí a quién corresponde.'
    if (!m) e.motivo = motivo === 'Otro motivo' ? 'Contanos el motivo.' : 'Elegí un motivo.'
    if (!desde) e.desde = 'Indicá el día de comienzo.'
    if (!hasta) e.hasta = 'Indicá el día de finalización.'
    else if (desde && hasta < desde) e.hasta = 'La finalización no puede ser anterior al comienzo.'
    setErrores(e)
    if (Object.keys(e).length) return
    const sel = personas.find(p => p.nombre === nombre)
    onSave({ name: nombre, initials: iniciales(nombre), desde, hasta, reason: m, origin: base?.origin ?? '', ambito, curso: sel?.curso ?? base?.curso, status: estado, comentario: comentario.trim() || undefined,
      imagen: adj.imagen, attachment: adj.imagen ? undefined : adj.nombre, respuesta: base?.respuesta })
  }

  return <div className="modal-backdrop" onClick={onClose}><div className="modal wide" role="dialog" aria-modal="true" aria-label={modo === 'nueva' ? 'Cargar justificación' : 'Editar justificación'} onClick={e => e.stopPropagation()}>
    <div className="modal-header"><div><h2>{modo === 'nueva' ? (ambito === 'alumno' ? 'Cargar una justificación' : 'Cargar licencia o ausencia') : 'Editar justificación'}</h2><p>Los campos con * son obligatorios.</p></div><button className="icon-button" aria-label="Cerrar" onClick={onClose}><X size={18} /></button></div>
    <div className="modal-body">
      <label>{ambito === 'alumno' ? 'Alumno' : 'Persona'} *
        <select value={persona} onChange={e => { setPersona(e.target.value); setErrores({}) }} aria-invalid={!!errores.persona}>
          <option value="">Elegí una opción…</option>{personas.map(p => <option key={p.nombre} value={p.nombre}>{p.nombre}{p.curso ? ` · ${p.curso}` : ''}</option>)}
          {base && !personas.some(p => p.nombre === base.name) && <option value={base.name}>{base.name}</option>}
          <option value="__otra">Otra persona…</option></select>
        {errores.persona && <span role="alert" className="field-error">{errores.persona}</span>}</label>
      {persona === '__otra' && <label>Nombre completo *<input value={otra} onChange={e => setOtra(e.target.value)} placeholder="Ej. Ana Martínez" /></label>}

      <fieldset className="rango-fechas"><legend>¿Qué días? *</legend>
        <div className="form-row">
          <label>Día de comienzo<input type="date" value={desde} onChange={e => { setDesde(e.target.value); if (hasta < e.target.value) setHasta(e.target.value); setErrores({}) }} aria-invalid={!!errores.desde} />{errores.desde && <span role="alert" className="field-error">{errores.desde}</span>}</label>
          <label>Día de finalización<input type="date" value={hasta} min={desde} onChange={e => { setHasta(e.target.value); setErrores({}) }} aria-invalid={!!errores.hasta} />{errores.hasta && <span role="alert" className="field-error">{errores.hasta}</span>}</label>
        </div>
        {desde && hasta >= desde && <p className="resumen-rango">{rangoCorto(desde, hasta)} · {diasHabilesTxt(desde, hasta)}</p>}
      </fieldset>

      <label>Motivo *
        <select value={motivo} onChange={e => { setMotivo(e.target.value); setErrores({}) }} aria-invalid={!!errores.motivo}><option value="">Elegí un motivo…</option>{motivos.map(m => <option key={m}>{m}</option>)}</select>
        {errores.motivo && <span role="alert" className="field-error">{errores.motivo}</span>}</label>
      {motivo === 'Otro motivo' && <label>Contanos el motivo *<input value={otroMotivo} onChange={e => setOtroMotivo(e.target.value)} /></label>}
      <label>Comentario (opcional)<input value={comentario} onChange={e => setComentario(e.target.value)} placeholder="Algo que quieras aclarar" /></label>
      {modo === 'editar' && <label>Estado<select value={estado} onChange={e => setEstado(e.target.value as Estado)}><option value="Pendiente">Para revisar</option><option>Aprobado</option><option>Rechazado</option></select></label>}
      <div className="subir-wrap"><SubirImagen value={adj} onChange={setAdj} /></div>
    </div>
    <div className="modal-footer"><button className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary" onClick={guardar}><Check size={16} />{modo === 'nueva' ? 'Cargar' : 'Guardar cambios'}</button></div>
  </div></div>
}

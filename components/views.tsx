'use client'

import { useEffect, useState } from 'react'
import {
  AlertCircle, Bell, Check, CheckCircle2, Clock3, Download, FileText, Filter,
  Eye, MoreHorizontal, Printer, Paperclip, Pencil, Plus, Trash2, QrCode, Search, Send, ShieldCheck, UsersRound, X, XCircle, Zap,
} from 'lucide-react'
import { Avatar, Kebab, PageHeading, StatCard, StatusBadge } from './shared'
import {
  alumnoNotifications, courses, personalHistory, type AppUser, type Justification, type Tone,
} from '@/lib/data'
import type { Role } from '@/lib/roles'
import { useDemoBus } from '@/lib/demo-bus'
import { aplicaTardanza, CONFIG_INICIAL } from '@/lib/fichaje'
import { exportarExcel, exportarPDF } from '@/lib/export'

type Notify = (message?: string) => void

/* ───────────── Panel general (Administrador) ───────────── */
export function AdminPanel({ justifications, onGo }: { justifications: Justification[]; onGo: (id: 'justificaciones' | 'gestion-asistencia') => void }) {
  const pending = justifications.filter(j => j.status === 'Pendiente')
  return <>
    <PageHeading eyebrow="RESUMEN GENERAL" title="Buenos días, Sofía" description="Resumen de asistencia institucional del jueves 24 de octubre de 2024." />
    <div className="stats-grid">
      <StatCard label="Total de usuarios" value="148" change="+4.2%" detail="vs. mes anterior" icon={UsersRound} tone="blue" />
      <StatCard label="Presentes hoy" value="132" change="89.2%" detail="del total" icon={CheckCircle2} tone="green" />
      <StatCard label="Ausentes hoy" value="11" change="7.4%" detail="del total" icon={XCircle} tone="red" />
      <StatCard label="Llegadas tarde" value="5" change="3.4%" detail="del total" icon={Clock3} tone="amber" />
    </div>
    <section className="panel">
      <div className="panel-header"><div><h2>Justificaciones pendientes</h2><p>Requieren revisión</p></div><button className="text-button" onClick={() => onGo('justificaciones')}>Ver todas</button></div>
      <div className="pending-list">
        {pending.length === 0 && <p className="empty-state">No hay justificaciones pendientes.</p>}
        {pending.map(j => <div className="pending-item" key={j.id}><Avatar initials={j.initials} small /><div><strong>{j.name}</strong><span>{j.date} · {j.reason}</span></div><button className="review-button" onClick={() => onGo('justificaciones')}>Revisar</button></div>)}
      </div>
      <div className="panel-footer"><AlertCircle size={16} /> <span>Hay <strong>{pending.length} solicitudes</strong> pendientes en total</span></div>
    </section>
  </>
}

/* ───────────── Gestionar asistencia ───────────── */
type Mark = 'Presente' | 'Ausente' | 'Tardanza'
const markTone: Record<Mark, Tone> = { Presente: 'success', Ausente: 'danger', Tardanza: 'warning' }

/** Preceptor: el caso de uso incluye «Validar curso y sección» antes de poder cargar asistencia. */
export function PreceptorAttendance({ onNotify }: { onNotify: Notify }) {
  const bus = useDemoBus()
  const [course, setCourse] = useState('')
  const [validated, setValidated] = useState('')
  const [error, setError] = useState('')
  const [marks, setMarks] = useState<Record<string, Mark>>({})

  const validate = () => {
    if (!course) { setError('Seleccioná un curso y sección para continuar.'); return }
    setError('')
    setValidated(course)
    setMarks(Object.fromEntries(courses[course].map(s => [s.id, 'Presente' as Mark])))
  }
  const students = validated ? courses[validated] : []
  const count = (m: Mark) => Object.values(marks).filter(v => v === m).length

  return <>
    <PageHeading eyebrow="CONTROL DIARIO" title="Gestionar asistencia" description="Elegí el curso y sección, y registrá la asistencia del día." />
    <section className="panel flow-panel">
      <div className="panel-header"><div><h2>1. Validar curso y sección</h2><p>Paso obligatorio antes de cargar asistencia</p></div>{validated && <StatusBadge tone="success">{`Validado: ${validated}`}</StatusBadge>}</div>
      <div className="flow-body">
        <label>Curso y sección
          <select value={course} onChange={e => { setCourse(e.target.value); setError('') }} aria-describedby="course-error">
            <option value="">Seleccionar…</option>
            {Object.keys(courses).map(c => <option key={c}>{c}</option>)}
          </select>
        </label>
        <button className="button primary inline" onClick={validate}><ShieldCheck size={16} />Validar</button>
      </div>
      {error && <p id="course-error" role="alert" className="form-error flow-error">{error}</p>}
    </section>

    <section className={`panel table-panel ${validated ? '' : 'disabled-panel'}`}>
      <div className="panel-header"><div><h2>2. Asistencia de {validated || 'curso'}</h2><p>{validated ? `${students.length} alumnos · ${count('Presente')} presentes · ${count('Ausente')} ausentes · ${count('Tardanza')} tardanzas` : 'Validá un curso para habilitar la carga'}</p></div>
        <button className="button primary inline" disabled={!validated} onClick={() => {
          students.forEach(s => { const m = marks[s.id]; if (s.id === 'AL-04021' && (m === 'Ausente' || m === 'Tardanza')) bus?.push({ para: ['Alumno'], title: m === 'Ausente' ? 'Inasistencia registrada' : 'Tardanza registrada', msg: m === 'Ausente' ? 'Se registró tu inasistencia de hoy. Podés justificarla en preceptoría.' : 'Se registró tu llegada tarde de hoy.', tone: 'warning' }) })
          onNotify(`Asistencia de ${validated} guardada correctamente.`)
        }}><Check size={16} />Guardar asistencia</button></div>
      <div className="table-scroll"><table><thead><tr><th>ALUMNO</th><th>LEGAJO</th><th>ESTADO</th><th>MARCAR</th></tr></thead><tbody>
        {students.map(s => <tr key={s.id}><td><div className="person-cell"><Avatar initials={s.initials} small /><strong>{s.name}</strong></div></td><td className="muted-cell">{s.id}</td>
          <td><StatusBadge tone={markTone[marks[s.id] ?? 'Presente']}>{marks[s.id] ?? 'Presente'}</StatusBadge></td>
          <td><div className="segmented" role="group" aria-label={`Estado de ${s.name}`}>{(['Presente', 'Tardanza', 'Ausente'] as Mark[]).map(m => <button key={m} className={marks[s.id] === m ? 'on' : ''} aria-pressed={marks[s.id] === m} onClick={() => setMarks(p => ({ ...p, [s.id]: m }))}>{m}</button>)}</div></td></tr>)}
        {!validated && <tr><td colSpan={4} className="empty-state">Seleccioná y validá un curso para ver la nómina.</td></tr>}
      </tbody></table></div>
    </section>
  </>
}

/** Administrador: gestión de asistencia del personal. Los fichajes por QR aparecen solos. */
export function AdminAttendance({ onNotify }: { onNotify: Notify }) {
  const bus = useDemoBus()
  const personal = (bus?.config ?? CONFIG_INICIAL).personal
  const base: Record<string, { entry: string; status: Mark; legajo: string }> = {
    maria: { entry: '—', status: 'Ausente', legajo: 'AG-00125' }, carlos: { entry: '08:16', status: 'Tardanza', legajo: 'AG-00098' },
    ana: { entry: '—', status: 'Ausente', legajo: 'AG-00141' }, laura: { entry: '07:50', status: 'Presente', legajo: 'PR-00012' }, sofia: { entry: '07:55', status: 'Presente', legajo: 'AD-00042' },
  }
  const [manual, setManual] = useState<Record<string, Mark>>({})
  const [q, setQ] = useState('')
  const rows = personal.map(p => {
    const b = base[p.id] ?? { entry: '—', status: 'Ausente' as Mark, legajo: p.id }
    const f = bus?.fichajes[p.id]
    return { id: p.id, name: p.nombre, initials: p.iniciales, role: p.tipo === 'docente' ? 'Profesor' : p.tipo === 'preceptor' ? 'Preceptor' : 'Administrativo', legajo: b.legajo,
      entry: f ? f.hora : b.entry, status: manual[p.id] ?? (f ? (f.estado as Mark) : b.status), tardanza: aplicaTardanza(p.tipo), porQr: !!f, pendiente: !!f?.pendiente }
  })
  const shown = rows.filter(r => r.name.toLowerCase().includes(q.toLowerCase()) || r.legajo.toLowerCase().includes(q.toLowerCase()))
  return <>
    <PageHeading eyebrow="CONTROL DIARIO" title="Gestionar asistencia" description="Revisá los fichajes del día y corregí el estado de cualquier persona." />
    <section className="panel table-panel">
      <div className="toolbar"><div className="table-search"><Search size={17} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre o legajo..." aria-label="Buscar" /></div></div>
      <div className="table-scroll"><table><thead><tr><th>USUARIO</th><th>LEGAJO</th><th>ROL</th><th>ENTRADA</th><th>ESTADO</th><th>CORREGIR</th></tr></thead><tbody>
        {shown.map(r => <tr key={r.id}><td><div className="person-cell"><Avatar initials={r.initials} small /><strong>{r.name}</strong></div></td><td className="muted-cell">{r.legajo}</td><td>{r.role}</td>
          <td>{r.entry}{r.porQr && <span className="attach-chip qr-chip">por QR</span>}{r.pendiente && <span className="attach-chip pend-chip">pendiente de validar</span>}</td><td><StatusBadge tone={markTone[r.status]}>{r.status}</StatusBadge></td>
          <td>{r.pendiente && <button className="mini-btn ok confirmar" onClick={() => { const f = bus?.fichajes[r.id]; if (f) bus?.registrarFichaje({ ...f, pendiente: false }); onNotify(`Fichaje de ${r.name} confirmado.`) }}><Check size={12} /> Confirmar fichaje</button>}<div className="segmented">{((r.tardanza ? ['Presente', 'Tardanza', 'Ausente'] : ['Presente', 'Ausente']) as Mark[]).map(m => <button key={m} className={r.status === m ? 'on' : ''} aria-pressed={r.status === m} onClick={() => { setManual(p => ({ ...p, [r.id]: m })); onNotify(`Asistencia de ${r.name} actualizada a ${m}.`) }}>{m}</button>)}</div></td></tr>)}
      </tbody></table></div>
    </section>
  </>
}

/* ───────────── Historial ───────────── */
export function HistoryView({ role, onNotify }: { role: Role; onNotify: Notify }) {
  const personal = role === 'Profesor' || role === 'Alumno'
  const bus = useDemoBus()
  const fichajeHoy = role === 'Profesor' ? bus?.fichajes['maria'] : undefined
  const [who, setWho] = useState('Todos')
  const [estadoF, setEstadoF] = useState('')
  const people = ['Todos', 'María González', 'Carlos Rodríguez', 'Ana Martínez', 'Tomás Ríos']
  const title = personal ? 'Mi historial de asistencia' : role === 'Preceptor' ? 'Historial personal y completo' : 'Historial de asistencia'
  const hoyTxt = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
  const base = fichajeHoy ? [{ date: `${hoyTxt} (hoy)`, entry: fichajeHoy.hora, exit: '—', status: fichajeHoy.estado, tone: (fichajeHoy.estado === 'Presente' ? 'success' : 'warning') as Tone, note: fichajeHoy.estado === 'Tardanza' ? `Tardanza de ${fichajeHoy.minutosTarde} min · fichaje por QR` : 'Fichaje por QR' }, ...personalHistory] : personalHistory
  const all = base.map((r, i) => ({ ...r, who: people[1 + (i % 4)] }))
  const rows = (personal ? all : all.filter(r => who === 'Todos' || r.who === who)).filter(r => !estadoF || r.status === estadoF)
  const presentes = personalHistory.filter(r => r.status === 'Presente').length
  return <>
    <PageHeading eyebrow="CONSULTA" title={title} description={personal ? 'Todas tus marcaciones, tardanzas e inasistencias.' : 'Consultá el historial de cualquier persona o el registro completo.'}
      action={role === 'Alumno' ? <button className="button primary" onClick={() => { exportarPDF('Resumen de asistencias', 'Tomás Ríos · 4° B · octubre 2024', ['Fecha', 'Entrada', 'Salida', 'Estado', 'Observación'], personalHistory.map(r => [r.date, r.entry, r.exit, r.status, r.note]), 'resumen-asistencias'); onNotify('Resumen de asistencias descargado (resumen-asistencias.pdf).') }}><Download size={16} />Descargar resumen</button> : undefined} />
    {personal && <div className="mini-stats"><div><span>Presentes</span><strong className="green-text">{presentes}</strong><CheckCircle2 size={19} /></div><div><span>Tardanzas</span><strong className="amber-text">1</strong><Clock3 size={19} /></div><div><span>Inasistencias</span><strong className="red-text">1</strong><XCircle size={19} /></div></div>}
    <section className="panel table-panel">
      {!personal && <div className="toolbar"><label className="inline-select">Persona<select value={who} onChange={e => setWho(e.target.value)}>{people.map(p => <option key={p}>{p}</option>)}</select></label><label className="inline-select">Estado<select value={estadoF} onChange={e => setEstadoF(e.target.value)}><option value="">Todos</option><option>Presente</option><option>Tardanza</option><option>Ausente</option></select></label></div>}
      <div className="table-scroll"><table><thead><tr>{!personal && <th>PERSONA</th>}<th>FECHA</th><th>ENTRADA</th><th>SALIDA</th><th>ESTADO</th><th>OBSERVACIÓN</th></tr></thead><tbody>
        {rows.map((r, i) => <tr key={i}>{!personal && <td><strong>{r.who}</strong></td>}<td>{r.date}</td><td>{r.entry}</td><td>{r.exit}</td><td><StatusBadge tone={r.tone}>{r.status}</StatusBadge></td><td className="muted-cell">{r.note}</td></tr>)}
      </tbody></table></div>
    </section>
  </>
}

/* ───────────── Justificaciones ───────────── */
export function JustificationsView({ role, items, onAdd, onResolve, onEdit, onDelete, onNotify }: {
  role: Role
  items: Justification[]
  onAdd: (j: Omit<Justification, 'id' | 'status'>) => void
  onResolve: (id: number, status: 'Aprobado' | 'Rechazado') => void
  onEdit: (id: number, patch: Omit<Justification, 'id' | 'initials'>) => void
  onDelete: (id: number) => void
  onNotify: Notify
}) {
  const isAdmin = role === 'Administrador'
  const bus = useDemoBus()
  const resolver = (j: Justification, estado: 'Aprobado' | 'Rechazado') => {
    onResolve(j.id, estado)
    if (j.name === 'María González') bus?.push({ para: ['Profesor'], title: `Justificación ${estado === 'Aprobado' ? 'aprobada' : 'rechazada'}`, msg: `Tu justificación por "${j.reason}" (${j.date}) fue ${estado === 'Aprobado' ? 'aprobada' : 'rechazada'}.`, tone: estado === 'Aprobado' ? 'success' : 'warning' })
    onNotify(isAdmin ? `Justificación ${estado === 'Aprobado' ? 'aprobada' : 'rechazada'}. Se notificó a ${j.name}.` : `Justificación ${estado === 'Aprobado' ? 'aprobada' : 'rechazada'}.`)
  }
  const [detail, setDetail] = useState<Justification | null>(null)
  const [editing, setEditing] = useState<Justification | null>(null)
  const [draft, setDraft] = useState<Omit<Justification, 'id' | 'initials'>>({ name: '', date: '', reason: '', origin: '', status: 'Pendiente' })
  const [editError, setEditError] = useState('')
  const [deleting, setDeleting] = useState<Justification | null>(null)

  const startEdit = (j: Justification) => { setEditing(j); setDraft({ name: j.name, date: j.date, reason: j.reason, origin: j.origin, status: j.status, attachment: j.attachment }); setEditError('') }
  const patchDraft = (p: Partial<typeof draft>) => { setDraft(d => ({ ...d, ...p })); setEditError('') }
  const saveEdit = () => {
    if (!editing) return
    if (!draft.name.trim() || !draft.date.trim() || !draft.reason.trim() || !draft.origin.trim()) { setEditError('Completá persona, fecha, motivo y origen.'); return }
    onEdit(editing.id, { ...draft, name: draft.name.trim(), date: draft.date.trim(), reason: draft.reason.trim(), origin: draft.origin.trim() })
    onNotify('La justificación fue actualizada.')
    setEditing(null)
  }
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [reason, setReason] = useState('')
  const [file, setFile] = useState('')
  const [error, setError] = useState('')
  const stat = (s: string) => items.filter(i => i.status === s).length

  const submit = () => {
    if (!name.trim() || !reason.trim()) { setError('Completá el nombre y el motivo de la falta.'); return }
    onAdd({ name: name.trim(), initials: name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase(), date: '24 oct.', reason: reason.trim(), origin: isAdmin ? 'Administración' : 'Preceptoría', attachment: file || undefined })
    setOpen(false); setName(''); setReason(''); setFile(''); setError('')
    onNotify('La justificación fue registrada y quedó pendiente de revisión.')
  }
  const tone = (s: string) => s === 'Aprobado' ? 'success' : s === 'Rechazado' ? 'danger' : 'warning'

  return <>
    <PageHeading eyebrow="REVISIÓN" title="Justificaciones" description={isAdmin ? 'Solicitá y gestioná justificaciones; la resolución se notifica a la persona.' : 'Gestioná las justificaciones y adjuntá la documentación respaldatoria.'}
      action={<button className="button primary" onClick={() => setOpen(true)}><Plus size={17} />{isAdmin ? 'Solicitar justificación' : 'Nueva justificación'}</button>} />
    <div className="mini-stats"><div><span>Pendientes</span><strong className="amber-text">{stat('Pendiente')}</strong><AlertCircle size={19} /></div><div><span>Aprobadas</span><strong className="green-text">{stat('Aprobado')}</strong><CheckCircle2 size={19} /></div><div><span>Rechazadas</span><strong className="red-text">{stat('Rechazado')}</strong><XCircle size={19} /></div></div>
    <section className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>PERSONA</th><th>FECHA</th><th>ORIGEN</th><th>MOTIVO</th><th>DOCUMENTO</th><th>ESTADO</th><th>ACCIONES</th></tr></thead><tbody>
      {items.map(j => <tr key={j.id}><td><div className="person-cell"><Avatar initials={j.initials} small /><strong>{j.name}</strong></div></td><td>{j.date}</td><td className="muted-cell">{j.origin}</td><td>{j.reason}</td>
        <td>{j.attachment ? <span className="attach-chip"><Paperclip size={12} />{j.attachment}</span> : <span className="muted-cell">—</span>}</td>
        <td><StatusBadge tone={tone(j.status)}>{j.status}</StatusBadge></td>
        <td><div className="row-actions">{j.status === 'Pendiente' && <><button className="mini-btn ok" onClick={() => resolver(j, 'Aprobado')}>Aprobar</button><button className="mini-btn bad" onClick={() => resolver(j, 'Rechazado')}>Rechazar</button></>}
          <RowMenu label={`Acciones de ${j.name}`} onDetail={() => setDetail(j)} onEdit={() => startEdit(j)} onDelete={() => setDeleting(j)} /></div></td></tr>)}
    </tbody></table></div></section>

    {open && <div className="modal-backdrop" onClick={() => setOpen(false)}><div className="modal" role="dialog" aria-modal="true" aria-label="Nueva justificación" onClick={e => e.stopPropagation()}>
      <div className="modal-header"><div><h2>{isAdmin ? 'Solicitar justificación' : 'Nueva justificación'}</h2><p>Los campos con * son obligatorios.</p></div><button className="icon-button" aria-label="Cerrar" onClick={() => setOpen(false)}><X size={18} /></button></div>
      <div className="modal-body">
        <label>Persona *<input value={name} onChange={e => { setName(e.target.value); setError('') }} placeholder="Ej. Ana Martínez" /></label>
        <label>Motivo *<input value={reason} onChange={e => { setReason(e.target.value); setError('') }} placeholder="Ej. Licencia médica" /></label>
        {!isAdmin && <label>Adjuntar documentación / certificado<input type="file" onChange={e => setFile(e.target.files?.[0]?.name ?? '')} /></label>}
        {error && <p role="alert" className="form-error">{error}</p>}
      </div>
      <div className="modal-footer"><button className="button secondary" onClick={() => setOpen(false)}>Cancelar</button><button className="button primary" onClick={submit}><Check size={16} />Registrar</button></div>
    </div></div>}
    {detail && <div className="modal-backdrop" onClick={() => setDetail(null)}><div className="modal" role="dialog" aria-modal="true" aria-label="Detalle de la justificación" onClick={e => e.stopPropagation()}>
      <div className="modal-header"><div><h2>Detalle de la justificación</h2><p>Solicitud #{detail.id}</p></div><button className="icon-button" aria-label="Cerrar" onClick={() => setDetail(null)}><X size={18} /></button></div>
      <div className="modal-body detail-list">
        <div><span>Persona</span><strong>{detail.name}</strong></div>
        <div><span>Fecha de la falta</span><strong>{detail.date}</strong></div>
        <div><span>Motivo</span><strong>{detail.reason}</strong></div>
        <div><span>Origen</span><strong>{detail.origin}</strong></div>
        <div><span>Documentación</span><strong>{detail.attachment ?? 'Sin documentación adjunta'}</strong></div>
        <div><span>Estado</span><StatusBadge tone={tone(detail.status)}>{detail.status}</StatusBadge></div>
      </div>
      <div className="modal-footer"><button className="button danger-outline" onClick={() => { const j = detail; setDetail(null); setDeleting(j) }}><Trash2 size={15} />Eliminar</button><span className="footer-spacer" /><button className="button secondary" onClick={() => setDetail(null)}>Cerrar</button><button className="button primary" onClick={() => { const j = detail; setDetail(null); startEdit(j) }}><Pencil size={15} />Editar</button></div>
    </div></div>}

    {editing && <div className="modal-backdrop" onClick={() => setEditing(null)}><div className="modal" role="dialog" aria-modal="true" aria-label="Editar justificación" onClick={e => e.stopPropagation()}>
      <div className="modal-header"><div><h2>Editar justificación</h2><p>{editing.name} · Los campos con * son obligatorios.</p></div><button className="icon-button" aria-label="Cerrar" onClick={() => setEditing(null)}><X size={18} /></button></div>
      <div className="modal-body">
        <label>Persona *<input value={draft.name} onChange={e => patchDraft({ name: e.target.value })} /></label>
        <div className="form-row">
          <label>Fecha de la falta *<input value={draft.date} onChange={e => patchDraft({ date: e.target.value })} /></label>
          <label>Estado *<select value={draft.status} onChange={e => patchDraft({ status: e.target.value as Justification['status'] })}><option>Pendiente</option><option>Aprobado</option><option>Rechazado</option></select></label>
        </div>
        <label>Motivo *<input value={draft.reason} onChange={e => patchDraft({ reason: e.target.value })} /></label>
        <label>Origen *<select value={draft.origin} onChange={e => patchDraft({ origin: e.target.value })}>{[...new Set(['Aviso temprano', 'Preceptoría', 'Administración', draft.origin])].map(o => <option key={o}>{o}</option>)}</select></label>
        <label>Documentación
          {draft.attachment && <span className="attach-edit"><span className="attach-chip"><Paperclip size={12} />{draft.attachment}</span><button type="button" className="mini-btn bad" onClick={() => patchDraft({ attachment: undefined })}>Quitar</button></span>}
          <input type="file" onChange={e => { const f = e.target.files?.[0]?.name; if (f) patchDraft({ attachment: f }) }} />
        </label>
        {editError && <p role="alert" className="form-error">{editError}</p>}
      </div>
      <div className="modal-footer"><button className="button secondary" onClick={() => setEditing(null)}>Cancelar</button><button className="button primary" onClick={saveEdit}><Check size={16} />Guardar cambios</button></div>
    </div></div>}

    {deleting && <div className="modal-backdrop" onClick={() => setDeleting(null)}><div className="modal" role="alertdialog" aria-modal="true" aria-label="Eliminar justificación" onClick={e => e.stopPropagation()}>
      <div className="modal-header"><div><h2>Eliminar justificación</h2><p>Esta acción no se puede deshacer.</p></div><button className="icon-button" aria-label="Cerrar" onClick={() => setDeleting(null)}><X size={18} /></button></div>
      <div className="modal-body"><p>¿Seguro que querés eliminar la justificación de <strong>{deleting.name}</strong> ({deleting.reason}, {deleting.date})?</p></div>
      <div className="modal-footer"><button className="button secondary" onClick={() => setDeleting(null)}>Cancelar</button><button className="button danger" onClick={() => { onDelete(deleting.id); onNotify('La justificación fue eliminada.'); setDeleting(null) }}><Trash2 size={15} />Eliminar</button></div>
    </div></div>}
  </>
}

/** Menú de tres puntos con Ver detalle / Editar / Eliminar. Posición fija para que la tabla no lo recorte. */
function RowMenu({ label, onDetail, onEdit, onDelete, extra }: { label: string; onDetail: () => void; onEdit: () => void; onDelete: () => void; extra?: { label: string; onClick: () => void } }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (pos) { setPos(null); return }
    const r = e.currentTarget.getBoundingClientRect()
    setPos({ top: Math.min(r.bottom + 4, window.innerHeight - 140), left: Math.max(8, r.right - 170) })
  }
  const run = (fn: () => void) => () => { setPos(null); fn() }
  return <>
    <button className="kebab" aria-label={label} aria-haspopup="menu" aria-expanded={!!pos} onClick={toggle}><MoreHorizontal size={18} /></button>
    {pos && <>
      <button className="menu-overlay" aria-label="Cerrar menú" onClick={() => setPos(null)} />
      <div className="row-menu" role="menu" style={{ top: pos.top, left: pos.left }} onKeyDown={e => e.key === 'Escape' && setPos(null)}>
        <button role="menuitem" onClick={run(onDetail)}><Eye size={15} />Ver detalle</button>
        <button role="menuitem" onClick={run(onEdit)}><Pencil size={15} />Editar</button>
        {extra && <button role="menuitem" onClick={run(extra.onClick)}><Check size={15} />{extra.label}</button>}
        <button role="menuitem" className="danger" onClick={run(onDelete)}><Trash2 size={15} />Eliminar</button>
      </div>
    </>}
  </>
}

/* ───────────── Administrar usuarios ───────────── */
export function UsersView({ users, onAdd, onUpdate, onDelete, onNotify }: {
  users: AppUser[]; onAdd: (u: AppUser) => void; onUpdate: (id: string, patch: Partial<AppUser>) => void; onDelete: (id: string) => void; onNotify: Notify
}) {
  const [detailU, setDetailU] = useState<AppUser | null>(null)
  const [editU, setEditU] = useState<AppUser | null>(null)
  const [draftU, setDraftU] = useState({ name: '', email: '', role: 'Profesor', area: '' })
  const [errU, setErrU] = useState<Record<string, string>>({})
  const [delU, setDelU] = useState<AppUser | null>(null)
  const startEditU = (u: AppUser) => { setEditU(u); setDraftU({ name: u.name, email: u.email, role: u.role, area: u.area }); setErrU({}) }
  const saveEditU = () => {
    const e: Record<string, string> = {}
    if (!draftU.name.trim()) e.name = 'Ingresá el nombre completo.'
    if (!/^\S+@\S+\.\S+$/.test(draftU.email)) e.email = 'Ingresá un correo electrónico válido.'
    else if (users.some(x => x.email === draftU.email && x.id !== editU!.id)) e.email = 'Ya existe un usuario con ese correo.'
    if (!draftU.area.trim()) e.area = 'Indicá el área o curso.'
    setErrU(e)
    if (Object.keys(e).length) return
    onUpdate(editU!.id, { name: draftU.name.trim(), email: draftU.email, role: draftU.role as AppUser['role'], area: draftU.area.trim(), initials: draftU.name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() })
    onNotify('Los datos del usuario fueron actualizados.')
    setEditU(null)
  }
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [f, setF] = useState({ name: '', dni: '', email: '', role: 'Profesor', area: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const shown = users.filter(u => u.name.toLowerCase().includes(q.toLowerCase()) || u.id.toLowerCase().includes(q.toLowerCase()))

  // Caso de uso incluido: «Validar datos de usuario»
  const validate = () => {
    const e: Record<string, string> = {}
    if (!f.name.trim()) e.name = 'Ingresá el nombre completo.'
    if (!/^\d{7,8}$/.test(f.dni)) e.dni = 'El DNI debe tener 7 u 8 dígitos.'
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Ingresá un correo electrónico válido.'
    if (!f.area.trim()) e.area = 'Indicá el área o curso.'
    if (users.some(u => u.email === f.email)) e.email = 'Ya existe un usuario con ese correo.'
    setErrors(e)
    return Object.keys(e).length === 0
  }
  const save = () => {
    if (!validate()) return
    const initials = f.name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    onAdd({ id: `NU-${f.dni.slice(-5)}`, name: f.name.trim(), initials, role: f.role as AppUser['role'], area: f.area.trim(), email: f.email, active: true })
    setOpen(false); setF({ name: '', dni: '', email: '', role: 'Profesor', area: '' }); setErrors({})
    onNotify(`${f.name.trim()} fue dado de alta tras validar sus datos.`)
  }
  const field = (k: keyof typeof f, label: string, ph: string) => <label>{label} *<input value={f[k]} aria-invalid={!!errors[k]} onChange={e => setF({ ...f, [k]: e.target.value })} placeholder={ph} />{errors[k] && <span role="alert" className="field-error">{errors[k]}</span>}</label>

  return <>
    <PageHeading eyebrow="ADMINISTRACIÓN" title="Administrar usuarios" description="Alta, baja y modificación de profesores, preceptores y alumnos." action={<button className="button primary" onClick={() => setOpen(true)}><Plus size={17} />Nuevo usuario</button>} />
    <section className="panel table-panel">
      <div className="toolbar"><div className="table-search"><Search size={17} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre o legajo..." aria-label="Buscar" /></div></div>
      <div className="table-scroll"><table><thead><tr><th>LEGAJO</th><th>USUARIO</th><th>ROL</th><th>ÁREA / CURSO</th><th>ESTADO</th><th></th></tr></thead><tbody>
        {shown.map(u => <tr key={u.id}><td className="muted-cell">{u.id}</td><td><div className="person-cell"><Avatar initials={u.initials} small /><div><strong>{u.name}</strong><span>{u.email}</span></div></div></td><td>{u.role}</td><td>{u.area}</td><td><StatusBadge tone={u.active ? 'success' : 'danger'}>{u.active ? 'Activo' : 'Inactivo'}</StatusBadge></td><td><RowMenu label={`Acciones de ${u.name}`} onDetail={() => setDetailU(u)} onEdit={() => startEditU(u)} onDelete={() => setDelU(u)} extra={{ label: u.active ? 'Desactivar' : 'Activar', onClick: () => { onUpdate(u.id, { active: !u.active }); onNotify(`${u.name} fue ${u.active ? 'desactivado' : 'activado'}.`) } }} /></td></tr>)}
      </tbody></table></div>
    </section>
    {open && <div className="modal-backdrop" onClick={() => setOpen(false)}><div className="modal" role="dialog" aria-modal="true" aria-label="Nuevo usuario" onClick={e => e.stopPropagation()}>
      <div className="modal-header"><div><h2>Nuevo usuario</h2><p>Se validan los datos antes de crear la cuenta.</p></div><button className="icon-button" aria-label="Cerrar" onClick={() => setOpen(false)}><X size={18} /></button></div>
      <div className="modal-body">
        {field('name', 'Nombre completo', 'Ej. María González')}
        <div className="form-row">{field('dni', 'DNI', '12345678')}<label>Rol *<select value={f.role} onChange={e => setF({ ...f, role: e.target.value })}><option>Profesor</option><option>Preceptor</option><option>Alumno</option><option>Administrador</option></select></label></div>
        {field('email', 'Correo institucional', 'nombre@escuelamodelo.edu.ar')}
        {field('area', 'Área o curso', 'Ej. Nivel Secundario / 4° B')}
      </div>
      <div className="modal-footer"><button className="button secondary" onClick={() => setOpen(false)}>Cancelar</button><button className="button primary" onClick={save}><Check size={16} />Validar y guardar</button></div>
    </div></div>}
    {detailU && <div className="modal-backdrop" onClick={() => setDetailU(null)}><div className="modal" role="dialog" aria-modal="true" aria-label="Detalle del usuario" onClick={e => e.stopPropagation()}>
      <div className="modal-header"><div><h2>Detalle del usuario</h2><p>Legajo {detailU.id}</p></div><button className="icon-button" aria-label="Cerrar" onClick={() => setDetailU(null)}><X size={18} /></button></div>
      <div className="modal-body detail-list">
        <div><span>Nombre</span><strong>{detailU.name}</strong></div><div><span>Correo</span><strong>{detailU.email}</strong></div>
        <div><span>Rol</span><strong>{detailU.role}</strong></div><div><span>Área / curso</span><strong>{detailU.area}</strong></div>
        <div><span>Estado</span><StatusBadge tone={detailU.active ? 'success' : 'danger'}>{detailU.active ? 'Activo' : 'Inactivo'}</StatusBadge></div>
      </div>
      <div className="modal-footer"><button className="button danger-outline" onClick={() => { const u = detailU; setDetailU(null); setDelU(u) }}><Trash2 size={15} />Eliminar</button><span className="footer-spacer" /><button className="button secondary" onClick={() => setDetailU(null)}>Cerrar</button><button className="button primary" onClick={() => { const u = detailU; setDetailU(null); startEditU(u) }}><Pencil size={15} />Editar</button></div>
    </div></div>}
    {editU && <div className="modal-backdrop" onClick={() => setEditU(null)}><div className="modal" role="dialog" aria-modal="true" aria-label="Editar usuario" onClick={e => e.stopPropagation()}>
      <div className="modal-header"><div><h2>Editar usuario</h2><p>Legajo {editU.id} · Los campos con * son obligatorios.</p></div><button className="icon-button" aria-label="Cerrar" onClick={() => setEditU(null)}><X size={18} /></button></div>
      <div className="modal-body">
        <label>Nombre completo *<input value={draftU.name} onChange={e => setDraftU({ ...draftU, name: e.target.value })} />{errU.name && <span role="alert" className="field-error">{errU.name}</span>}</label>
        <label>Correo institucional *<input value={draftU.email} onChange={e => setDraftU({ ...draftU, email: e.target.value })} />{errU.email && <span role="alert" className="field-error">{errU.email}</span>}</label>
        <div className="form-row"><label>Rol *<select value={draftU.role} onChange={e => setDraftU({ ...draftU, role: e.target.value })}><option>Profesor</option><option>Preceptor</option><option>Alumno</option><option>Administrador</option></select></label>
          <label>Área o curso *<input value={draftU.area} onChange={e => setDraftU({ ...draftU, area: e.target.value })} />{errU.area && <span role="alert" className="field-error">{errU.area}</span>}</label></div>
      </div>
      <div className="modal-footer"><button className="button secondary" onClick={() => setEditU(null)}>Cancelar</button><button className="button primary" onClick={saveEditU}><Check size={16} />Guardar cambios</button></div>
    </div></div>}
    {delU && <div className="modal-backdrop" onClick={() => setDelU(null)}><div className="modal" role="alertdialog" aria-modal="true" aria-label="Eliminar usuario" onClick={e => e.stopPropagation()}>
      <div className="modal-header"><div><h2>Eliminar usuario</h2><p>Esta acción no se puede deshacer.</p></div><button className="icon-button" aria-label="Cerrar" onClick={() => setDelU(null)}><X size={18} /></button></div>
      <div className="modal-body"><p>¿Seguro que querés eliminar a <strong>{delU.name}</strong> ({delU.role})?</p></div>
      <div className="modal-footer"><button className="button secondary" autoFocus onClick={() => setDelU(null)}>Cancelar</button><button className="button danger" onClick={() => { onDelete(delU.id); onNotify(`${delU.name} fue eliminado.`); setDelU(null) }}><Trash2 size={15} />Eliminar</button></div>
    </div></div>}
  </>
}

/* ───────────── Reportes ───────────── */
type Period = 'Esta semana' | 'Este mes' | 'Último trimestre'

const periodData: Record<Period, { labels: string[]; attendance: number[]; kpi: { att: number; abs: number; late: number; pend: number; prev: [number, number, number, number] }; motives: [string, number][] }> = {
  'Esta semana': { labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'], attendance: [92, 90, 86, 91, 94], kpi: { att: 90.6, abs: 7.4, late: 3.4, pend: 5, prev: [89.8, 8.1, 3.9, 7] }, motives: [['Enfermedad', 14], ['Trámite personal', 6], ['Licencia médica', 5], ['Otros', 3]] },
  'Este mes': { labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'], attendance: [93, 90, 89, 91], kpi: { att: 91.4, abs: 6.9, late: 3.1, pend: 5, prev: [90.2, 7.8, 3.6, 9] }, motives: [['Enfermedad', 61], ['Trámite personal', 34], ['Licencia médica', 27], ['Otros', 14]] },
  'Último trimestre': { labels: ['Ago', 'Sep', 'Oct'], attendance: [89, 92, 91], kpi: { att: 90.7, abs: 7.2, late: 3.5, pend: 5, prev: [88.9, 8.3, 4.0, 12] }, motives: [['Enfermedad', 168], ['Trámite personal', 92], ['Licencia médica', 71], ['Otros', 40]] },
}
const rankings: Record<'inst' | 'curso', [string, number][]> = {
  inst: [['Nivel Secundario', 9.8], ['Nivel Primario', 6.4], ['Administración', 4.9], ['Nivel Inicial', 3.2]],
  curso: [['5° A', 10.2], ['4° B', 7.5], ['4° A', 4.1]],
}
const distColors = ['#d98a0b', '#4b5d78', '#d64545']
const motiveColors = ['#d98a0b', '#4b5d78', '#d64545', '#8a96a8']

function Delta({ value, prev, invert = false, unit = '%' }: { value: number; prev: number; invert?: boolean; unit?: string }) {
  const diff = +(value - prev).toFixed(1)
  const good = invert ? diff <= 0 : diff >= 0
  return <small className={good ? 'delta good' : 'delta bad'}>{diff > 0 ? '▲ +' : diff < 0 ? '▼ ' : '= '}{diff}{unit} <span>vs. período anterior</span></small>
}

function ChartCard({ title, subtitle, table, children }: { title: string; subtitle: string; table: React.ReactNode; children: React.ReactNode }) {
  const [asTable, setAsTable] = useState(false)
  return <section className="panel chart-card">
    <div className="panel-header"><div><h2>{title}</h2><p>{subtitle}</p></div><button className="text-button" aria-pressed={asTable} onClick={() => setAsTable(v => !v)}>{asTable ? 'Ver gráfico' : 'Ver como tabla'}</button></div>
    <div className="chart-body">{asTable ? table : children}</div>
  </section>
}

export function ReportsView({ role, onNotify }: { role: Role; onNotify: Notify }) {
  const isPreceptor = role === 'Preceptor'
  const [tab, setTab] = useState<'resumen' | 'generar'>('resumen')
  const [period, setPeriod] = useState<Period>('Este mes')
  const scopes = isPreceptor ? ['Todos mis cursos', ...Object.keys(courses)] : ['Toda la institución', 'Nivel Primario', 'Nivel Secundario']
  const [scope, setScope] = useState(scopes[0])
  const [generated, setGenerated] = useState(false)

  const d = periodData[period]
  // El alcance seleccionado modifica levemente los valores para el prototipo
  const factor = scope === scopes[0] ? 0 : (scope.length % 5) - 2
  const att = d.attendance.map(v => Math.max(60, Math.min(99, v + factor)))
  const kpi = { att: +(d.kpi.att + factor * 0.4).toFixed(1), abs: +(d.kpi.abs - factor * 0.3).toFixed(1), late: +(d.kpi.late - factor * 0.1).toFixed(1), pend: d.kpi.pend }
  const ranking = rankings[isPreceptor ? 'curso' : 'inst'].filter(([n]) => scope === scopes[0] || n === scope || !isPreceptor)
  const maxRank = Math.max(...ranking.map(r => r[1]))
  // Tres partes excluyentes que suman 100: a horario + tardanza + ausente
  const prevOnTime = +(100 - d.kpi.prev[1] - d.kpi.prev[2]).toFixed(1)
  const dist: [string, number, number, boolean][] = [
    ['Presente a horario', +(100 - kpi.abs - kpi.late).toFixed(1), prevOnTime, false],
    ['Con tardanza', kpi.late, d.kpi.prev[2], true],
    ['Ausente', kpi.abs, d.kpi.prev[1], true],
  ]
  const totalMotives = d.motives.reduce((a, m) => a + m[1], 0)

  const filasReporte = (): (string | number)[][] => [
    ...dist.map(([n, v]): (string | number)[] => ['Distribución de registros', n, `${v}%`]),
    ...d.labels.map((l, i): (string | number)[] => ['Tendencia de asistencia', l, `${att[i]}%`]),
    ...ranking.map(([n, v]): (string | number)[] => [isPreceptor ? 'Ausentismo por curso' : 'Ausentismo por área', n, `${v}%`]),
    ...d.motives.map(([n, v]): (string | number)[] => ['Faltas por motivo', n, v]),
  ]
  const colsReporte = ['Sección', 'Concepto', 'Valor']
  const exportar = (f: 'xlsx' | 'pdf') => {
    const nombre = `Reporte_${period.replace(/\s+/g, '_')}_${scope.replace(/\s+/g, '_')}`
    if (f === 'xlsx') exportarExcel(filasReporte(), colsReporte, nombre); else exportarPDF('Reporte de asistencia', `${period} · ${scope}`, colsReporte, filasReporte(), nombre)
    onNotify(`Reporte (${period} · ${scope}) exportado a ${f === 'xlsx' ? 'Excel' : 'PDF'}.`)
  }
  const exportBtns = <div className="export-buttons"><button onClick={() => exportar('pdf')}><Download size={15} />PDF</button><button onClick={() => exportar('xlsx')}><Download size={15} />Excel</button></div>

  // Gráfico de barras SVG con valores visibles (no depende solo del color)
  const W = 520, H = 220, pad = 34, bw = Math.min(54, (W - pad * 2) / att.length - 18)
  return <>
    <PageHeading eyebrow="INFORMACIÓN Y ANÁLISIS" title="Reportes de asistencia" description={isPreceptor ? 'Analizá la asistencia de tus cursos y exportá informes.' : 'Analizá la asistencia institucional y exportá informes.'} action={exportBtns} />

    <div className="report-filters">
      <label>Período<select value={period} onChange={e => setPeriod(e.target.value as Period)}>{(Object.keys(periodData) as Period[]).map(p => <option key={p}>{p}</option>)}</select></label>
      <label>{isPreceptor ? 'Curso y sección' : 'Área'}<select value={scope} onChange={e => setScope(e.target.value)}>{scopes.map(sc => <option key={sc}>{sc}</option>)}</select></label>
      <div className="tabs" role="tablist" aria-label="Vista de reportes">
        <button role="tab" aria-selected={tab === 'resumen'} className={tab === 'resumen' ? 'on' : ''} onClick={() => setTab('resumen')}>Resumen</button>
        <button role="tab" aria-selected={tab === 'generar'} className={tab === 'generar' ? 'on' : ''} onClick={() => setTab('generar')}>Generar reporte</button>
      </div>
    </div>

    {tab === 'resumen' && <>
      <div className="kpi-layout">
        <section className="kpi-card kpi-wide" aria-label="Distribución de registros del período">
          <span>Distribución de registros · {period}</span>
          <div className="dist-row" role="img" aria-label={`Distribución de registros: ${dist.map(([n, v]) => `${n} ${v}%`).join(', ')}`}>
            <svg viewBox="0 0 120 120" className="dist-pie" aria-hidden="true">
              {dist.map(([n, v], i) => { const before = dist.slice(0, i).reduce((acc, x) => acc + x[1], 0); return <circle key={n} cx="60" cy="60" r="36" fill="none" stroke={distColors[i]} strokeWidth="34" pathLength="100" strokeDasharray={`${Math.max(v - 0.6, 0)} ${100 - Math.max(v - 0.6, 0)}`} strokeDashoffset={-before} transform="rotate(-90 60 60)" /> })}
            </svg>
            <ul className="dist-legend">{dist.map(([n, v, prev, invert], i) => <li key={n}><i style={{ background: distColors[i] }} /><span>{n}</span><strong>{v}%</strong><Delta value={v} prev={prev} invert={invert} /></li>)}</ul>
          </div>
        </section>
        <div className="kpi-card"><span>Justificaciones pendientes</span><strong>{kpi.pend}</strong><Delta value={kpi.pend} prev={d.kpi.prev[3]} invert unit="" /></div>
      </div>

      <ChartCard title="Tendencia de asistencia" subtitle={`${period} · ${scope}`}
        table={<table className="data-table"><thead><tr><th>Período</th><th>Asistencia</th></tr></thead><tbody>{d.labels.map((l, i) => <tr key={l}><td>{l}</td><td>{att[i]}%</td></tr>)}</tbody></table>}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Asistencia por período: ${d.labels.map((l, i) => `${l} ${att[i]}%`).join(', ')}`} className="bar-chart">
          {[100, 75, 50].map(g => { const y = 20 + (H - 60) * (1 - (g - 40) / 60); return <g key={g}><line x1={pad} x2={W - 10} y1={y} y2={y} className="grid" /><text x={pad - 6} y={y + 4} textAnchor="end" className="axis">{g}%</text></g> })}
          {att.map((v, i) => { const slot = (W - pad - 10) / att.length; const x = pad + slot * i + (slot - bw) / 2; const h = (H - 60) * ((v - 40) / 60); const y = 20 + (H - 60) - h; return <g key={d.labels[i]}>
            <rect x={x} y={y} width={bw} height={h} rx={5} className="bar" />
            <text x={x + bw / 2} y={y - 6} textAnchor="middle" className="bar-value">{v}%</text>
            <text x={x + bw / 2} y={H - 14} textAnchor="middle" className="axis">{d.labels[i]}</text></g> })}
        </svg>
      </ChartCard>

      <div className="chart-pair">
        <ChartCard title="Faltas por motivo" subtitle={`${totalMotives} faltas en el período`}
          table={<table className="data-table"><thead><tr><th>Motivo</th><th>Faltas</th><th>%</th></tr></thead><tbody>{d.motives.map(([n, v]) => <tr key={n}><td>{n}</td><td>{v}</td><td>{Math.round((v / totalMotives) * 100)}%</td></tr>)}</tbody></table>}>
          <div className="stack" role="img" aria-label={`Faltas por motivo: ${d.motives.map(([n, v]) => `${n} ${v}`).join(', ')}`}>{d.motives.map(([n, v], i) => <span key={n} style={{ width: `${(v / totalMotives) * 100}%`, background: motiveColors[i] }} />)}</div>
          <ul className="legend-list">{d.motives.map(([n, v], i) => <li key={n}><i style={{ background: motiveColors[i] }} /><span>{n}</span><strong>{v}</strong><em>{Math.round((v / totalMotives) * 100)}%</em></li>)}</ul>
        </ChartCard>

        <ChartCard title={isPreceptor ? 'Ausentismo por curso' : 'Ausentismo por área'} subtitle="Porcentaje de ausencias sobre el total"
          table={<table className="data-table"><thead><tr><th>{isPreceptor ? 'Curso' : 'Área'}</th><th>Ausentismo</th></tr></thead><tbody>{ranking.map(([n, v]) => <tr key={n}><td>{n}</td><td>{v}%</td></tr>)}</tbody></table>}>
          <ul className="hbars" aria-label="Ranking de ausentismo">{ranking.slice().sort((a, b) => b[1] - a[1]).map(([n, v]) => <li key={n}><span className="hb-label">{n}</span><span className="hb-track"><span className="hb-fill" style={{ width: `${(v / maxRank) * 100}%` }} /></span><strong>{v}%</strong></li>)}</ul>
        </ChartCard>
      </div>
    </>}

    {tab === 'generar' && <div className="report-layout">
      <section className="panel report-form"><div className="panel-header"><div><h2>Configurar reporte</h2><p>Usa el período y {isPreceptor ? 'el curso' : 'el área'} elegidos arriba</p></div></div>
        <label>Tipo de reporte<select><option>Reporte general de asistencia</option><option>Reporte individual</option><option>{isPreceptor ? 'Reporte por curso' : 'Reporte por área'}</option></select></label>
        <div className="form-row"><label>Desde<input type="text" defaultValue="01/10/2024" /></label><label>Hasta<input type="text" defaultValue="24/10/2024" /></label></div>
        <button className="button primary full" onClick={() => { setGenerated(true); onNotify('Reporte generado correctamente.') }}><FileText size={17} />Generar reporte</button>
      </section>
      <section className="panel report-preview"><div className="panel-header"><div><h2>Vista previa</h2><p>{generated ? `${period} · ${scope}` : 'Generá un reporte para verlo acá'}</p></div>{exportBtns}</div>
        {generated ? <div className="preview-sheet"><div className="preview-head"><div className="brand-mark small-mark"><ShieldCheck size={14} /></div><div><strong>ASISTAPP</strong><span>Escuela Modelo · Octubre 2024</span></div><FileText size={22} /></div><h3>Reporte de asistencia</h3><p>{period} · {scope}</p><div className="preview-metrics"><div><span>Asistencia promedio</span><strong>{kpi.att}%</strong></div><div><span>Ausentismo</span><strong>{kpi.abs}%</strong></div><div><span>Tardanzas</span><strong>{kpi.late}%</strong></div></div><div className="preview-lines"><i /><i /><i /><i /></div></div> : <p className="empty-state">Todavía no se generó ningún reporte.</p>}
      </section>
    </div>}
  </>
}

/* ───────────── Profesor: aviso temprano de inasistencia ───────────── */
export function EarlyNotice({ onNotify }: { onNotify: Notify }) {
  const bus = useDemoBus()
  const [reason, setReason] = useState('Enfermedad')
  const [date, setDate] = useState('25/10/2024')
  const [comment, setComment] = useState('')
  const [file, setFile] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState<{ reason: string; date: string; file: string }[]>([])
  const medical = reason === 'Enfermedad' || reason === 'Licencia médica'

  const send = () => {
    if (!date.trim()) { setError('Completá la fecha de la inasistencia.'); return }
    setSent(p => [{ reason, date, file }, ...p]); setError(''); setComment(''); setFile('')
    bus?.addJustification({ name: 'María González', initials: 'MG', date, reason, origin: 'Aviso temprano', attachment: file || undefined })
    bus?.push({ para: ['Administrador', 'Preceptor'], title: 'Nuevo aviso de inasistencia', msg: `María González avisó una inasistencia (${reason}) para el ${date}.`, tone: 'warning' })
    onNotify('Aviso enviado a secretaría y dirección.')
  }
  return <>
    <PageHeading eyebrow="AVISO TEMPRANO" title="Aviso de inasistencia" description="Avisá con anticipación para que la dirección pueda organizar la cobertura." />
    <div className="report-layout">
      <section className="panel report-form"><div className="panel-header"><div><h2>Nuevo aviso</h2><p>Los campos con * son obligatorios</p></div></div>
        <label>Motivo *<select value={reason} onChange={e => setReason(e.target.value)}><option>Enfermedad</option><option>Licencia médica</option><option>Trámite personal</option><option>Fuerza mayor</option></select></label>
        <label>Fecha de inasistencia *<input value={date} onChange={e => { setDate(e.target.value); setError('') }} placeholder="DD/MM/AAAA" aria-invalid={!!error} /></label>
        <label>Comentario<input value={comment} onChange={e => setComment(e.target.value)} placeholder="Opcional" /></label>
        {medical && <label>Adjuntar certificado médico<input type="file" onChange={e => setFile(e.target.files?.[0]?.name ?? '')} /></label>}
        {error && <p role="alert" className="form-error flow-error">{error}</p>}
        <button className="button primary full" onClick={send}><Send size={16} />Enviar aviso</button>
      </section>
      <section className="panel report-preview"><div className="panel-header"><div><h2>Avisos enviados</h2><p>Quedan registrados para su justificación</p></div></div>
        {sent.length === 0 ? <p className="empty-state">Todavía no enviaste avisos.</p> : <div className="pending-list">{sent.map((s, i) => <div className="pending-item" key={i}><div className="notification-icon success"><CheckCircle2 size={18} /></div><div><strong>{s.reason} · {s.date}</strong><span>{s.file ? `Certificado: ${s.file}` : 'Sin certificado adjunto'}</span></div><StatusBadge tone="warning">Pendiente</StatusBadge></div>)}</div>}
      </section>
    </div>
  </>
}

/* ───────────── Alumno: notificaciones ───────────── */
export function AlumnoNotifications({ extra = [] }: { extra?: { title: string; msg: string; time: string; tone: Tone }[] }) {
  return <>
    <PageHeading eyebrow="CENTRO DE AVISOS" title="Notificaciones" description="Avisos de inasistencia y tardanza registrados a tu nombre." />
    <section className="panel notifications-panel">{[...extra, ...alumnoNotifications].map((n, i) => <div className="notification-row unread" key={`${i}-${n.title}`}>
      <div className={`notification-icon ${n.tone}`}>{n.tone === 'success' ? <CheckCircle2 size={19} /> : n.title.startsWith('Tard') ? <Clock3 size={19} /> : <Bell size={19} />}</div>
      <div className="notification-copy"><strong>{n.title}</strong><p>{n.msg}</p><span>{n.time}</span></div></div>)}</section>
  </>
}

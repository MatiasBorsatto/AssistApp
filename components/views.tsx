'use client'

import { useEffect, useState } from 'react'
import {
  AlertCircle, Bell, Check, CheckCircle2, Clock3, Download, FileSpreadsheet, FileText, Filter,
  Eye, MoreHorizontal, Printer, Paperclip, Pencil, Plus, Trash2, QrCode, Search, Send, ShieldCheck, UsersRound, X, XCircle, Zap,
} from 'lucide-react'
import { Avatar, Kebab, PageHeading, StatCard, StatusBadge } from './shared'
import {
  alumnoNotifications, courses, mesActual, personalHistory, type AppUser, type Justification, type Tone,
} from '@/lib/data'
import type { Role } from '@/lib/roles'
import { useDemoBus } from '@/lib/demo-bus'
import { rangoCorto } from '@/lib/fechas'
import { aplicaTardanza, CONFIG_INICIAL } from '@/lib/fichaje'
import { exportarExcelMulti, exportarPDFMulti } from '@/lib/export'
import { exportarPDF } from '@/lib/export'

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
        {pending.map(j => <div className="pending-item" key={j.id}><Avatar initials={j.initials} small /><div><strong>{j.name}</strong><span>{rangoCorto(j.desde, j.hasta)} · {j.reason}</span></div><button className="review-button" onClick={() => onGo('justificaciones')}>Revisar</button></div>)}
      </div>
      <div className="panel-footer"><AlertCircle size={16} /> <span>Hay <strong>{pending.length} solicitudes</strong> pendientes en total</span></div>
    </section>
  </>
}

/* ───────────── Gestionar asistencia ───────────── */
type Mark = 'Presente' | 'Ausente' | 'Tardanza'
const markTone: Record<Mark, Tone> = { Presente: 'success', Ausente: 'danger', Tardanza: 'warning' }

/**
 * Selector de estado con confirmación: la opción elegida no cuenta hasta tocar «Confirmar».
 * Una vez confirmada queda fija y sólo se cambia tocando «Editar».
 */
function MarkPicker({ name, value, options, sugerido, onConfirm }: { name: string; value?: Mark; options: Mark[]; sugerido?: Mark; onConfirm: (m: Mark) => void }) {
  const [editando, setEditando] = useState(!value)
  const [draft, setDraft] = useState<Mark | undefined>(value ?? sugerido)
  if (!editando && value) return <div className="mark-picker"><span className="mark-fijo"><Check size={13} />Confirmado</span>
    <button className="mini-btn" onClick={() => { setDraft(value); setEditando(true) }} aria-label={`Editar el estado de ${name}`}><Pencil size={12} />Editar</button></div>
  return <div className="mark-picker">
    <div className="segmented" role="group" aria-label={`Estado de ${name}`}>{options.map(m => <button key={m} className={draft === m ? 'on' : ''} aria-pressed={draft === m} onClick={() => setDraft(m)}>{m}</button>)}</div>
    <button className="mini-btn ok" disabled={!draft} onClick={() => { if (draft) { onConfirm(draft); setEditando(false) } }} aria-label={`Confirmar el estado de ${name}`}><Check size={12} />Confirmar</button>
    {value && <button className="mini-btn" onClick={() => setEditando(false)} aria-label={`Cancelar la edición de ${name}`}><X size={12} />Cancelar</button>}
  </div>
}

/** Aviso de cierre automático + estado del envío. */
function EnvioAviso({ enviada, cambios, pendientes }: { enviada: string; cambios: boolean; pendientes: number }) {
  return <p className="envio-aviso" role="status">
    {enviada && !cambios ? <><CheckCircle2 size={15} />Asistencia enviada a las {enviada}. Si editás algún estado, tendrás que volver a enviarla.</>
      : <><Clock3 size={15} />{pendientes ? `Faltan confirmar ${pendientes}. ` : ''}{enviada ? 'Hay cambios sin enviar. ' : ''}Si no la enviás, al finalizar el día (23:59) se registra automáticamente con los estados confirmados.</>}
  </p>
}
const horaAhora = () => new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

/** Preceptor: el caso de uso incluye «Validar curso y sección» antes de poder cargar asistencia. */
export function PreceptorAttendance({ onNotify }: { onNotify: Notify }) {
  const bus = useDemoBus()
  const [course, setCourse] = useState('')
  const [validated, setValidated] = useState('')
  const [error, setError] = useState('')
  /** Sólo los estados confirmados */
  const [marks, setMarks] = useState<Record<string, Mark>>({})
  const [enviada, setEnviada] = useState('')
  const [cambios, setCambios] = useState(false)

  const validate = () => {
    if (!course) { setError('Seleccioná un curso y sección para continuar.'); return }
    setError('')
    setValidated(course)
    setMarks({}); setEnviada(''); setCambios(false)
  }
  const students = validated ? courses[validated] : []
  const count = (m: Mark) => Object.values(marks).filter(v => v === m).length
  const pendientes = students.filter(s => !marks[s.id]).length
  const enviar = () => {
    students.forEach(s => { const m = marks[s.id]; if (s.id === 'AL-04021' && (m === 'Ausente' || m === 'Tardanza')) bus?.push({ para: ['Alumno'], title: m === 'Ausente' ? 'Inasistencia registrada' : 'Tardanza registrada', msg: m === 'Ausente' ? 'Se registró tu inasistencia de hoy. Podés justificarla en preceptoría.' : 'Se registró tu llegada tarde de hoy.', tone: 'warning' }) })
    setEnviada(horaAhora()); setCambios(false)
    onNotify(`Asistencia de ${validated} enviada correctamente.`)
  }

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
        <button className="button primary inline" disabled={!validated || pendientes > 0 || (!!enviada && !cambios)} title={pendientes ? 'Confirmá el estado de todos los alumnos para poder enviarla' : undefined} onClick={enviar}><Send size={16} />{enviada && cambios ? 'Reenviar asistencia' : 'Enviar asistencia'}</button></div>
      {validated && <EnvioAviso enviada={enviada} cambios={cambios} pendientes={pendientes} />}
      <div className="table-scroll"><table><thead><tr><th>ALUMNO</th><th>LEGAJO</th><th>ESTADO</th><th>MARCAR</th></tr></thead><tbody>
        {students.map(s => <tr key={`${validated}-${s.id}`}><td><div className="person-cell"><Avatar initials={s.initials} small /><strong>{s.name}</strong></div></td><td className="muted-cell">{s.id}</td>
          <td>{marks[s.id] ? <StatusBadge tone={markTone[marks[s.id]]}>{marks[s.id]}</StatusBadge> : <span className="attach-chip pend-chip">Sin confirmar</span>}</td>
          <td><MarkPicker name={s.name} value={marks[s.id]} sugerido="Presente" options={['Presente', 'Tardanza', 'Ausente']} onConfirm={m => { setMarks(p => ({ ...p, [s.id]: m })); setCambios(true) }} /></td></tr>)}
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
  const [enviada, setEnviada] = useState('')
  const [cambios, setCambios] = useState(false)
  const [q, setQ] = useState('')
  const rows = personal.map(p => {
    const b = base[p.id] ?? { entry: '—', status: 'Ausente' as Mark, legajo: p.id }
    const f = bus?.fichajes[p.id]
    return { id: p.id, name: p.nombre, initials: p.iniciales, role: p.tipo === 'docente' ? 'Profesor' : p.tipo === 'preceptor' ? 'Preceptor' : 'Administrativo', legajo: b.legajo,
      entry: f ? f.hora : b.entry, status: manual[p.id] ?? (f ? (f.estado as Mark) : b.status), tardanza: aplicaTardanza(p.tipo), porQr: !!f, pendiente: !!f?.pendiente }
  })
  const [tipo, setTipo] = useState('')
  const porTipo = rows.filter(r => !tipo || r.role === tipo)
  const shown = porTipo.filter(r => r.name.toLowerCase().includes(q.toLowerCase()) || r.legajo.toLowerCase().includes(q.toLowerCase()))
  const hoyIso = new Date().toISOString().slice(0, 10)
  const descargar = (formato: 'xlsx' | 'pdf') => {
    const cols = ['Persona', 'Legajo', 'Rol', 'Cargo', 'Entrada', 'Estado', 'Cómo se registró']
    const filas = porTipo.map(r => [r.name, r.legajo, r.role, personal.find(p => p.id === r.id)?.cargo ?? '', r.entry, r.status, r.porQr ? (r.pendiente ? 'Fichaje por QR (por confirmar)' : 'Fichaje por QR') : manual[r.id] ? 'Corregido a mano' : 'Registro del día'])
    const nombre = `Asistencia_${tipo ? `${tipo}_` : ''}${hoyIso}`
    if (formato === 'xlsx') exportarExcelMulti([{ nombre: 'Asistencia del día', columnas: cols, filas }], nombre)
    else exportarPDFMulti({ titulo: 'Asistencia del día', lineas: [`Fecha: ${new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`, ...(tipo ? [`Tipo de persona: ${tipo}`] : []), `${porTipo.filter(r => r.status === 'Presente').length} presentes · ${porTipo.filter(r => r.status === 'Tardanza').length} con tardanza · ${porTipo.filter(r => r.status === 'Ausente').length} ausentes`], secciones: [{ titulo: 'Detalle por persona', columnas: cols, filas: filas.map(f => f.map(String)) }] }, nombre)
    onNotify(`Listado descargado (${formato === 'xlsx' ? 'Excel' : 'PDF'}) con el nombre de cada persona.`)
  }
  return <>
    <PageHeading eyebrow="CONTROL DIARIO" title="Asistencia de hoy" description="Revisá los fichajes del día y corregí el estado de cualquier persona tocando Presente, Tardanza o Ausente."
      action={<div className="descargas"><span>Descargar el listado:</span><button className="button secondary" onClick={() => descargar('xlsx')}><FileSpreadsheet size={16} />Excel</button><button className="button secondary" onClick={() => descargar('pdf')}><FileText size={16} />PDF</button>
        <button className="button primary" disabled={!!enviada && !cambios} onClick={() => { setEnviada(horaAhora()); setCambios(false); onNotify('Asistencia del día enviada y registrada.') }}><Send size={16} />{enviada && cambios ? 'Reenviar asistencia' : 'Enviar asistencia'}</button></div>} />
    <EnvioAviso enviada={enviada} cambios={cambios} pendientes={0} />
    <section className="panel table-panel">
      <div className="toolbar"><div className="table-search"><Search size={17} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre o legajo..." aria-label="Buscar" /></div>
        <TipoFilter value={tipo} onChange={setTipo} opciones={['Profesor', 'Preceptor', 'Administrativo']} roles={rows.map(r => r.role)} /></div>
      <div className="table-scroll"><table><thead><tr><th>USUARIO</th><th>LEGAJO</th><th>ROL</th><th>ENTRADA</th><th>ESTADO</th><th>CORREGIR</th></tr></thead><tbody>
        {!shown.length && <tr><td colSpan={6} className="empty-state">No hay personas que coincidan con el filtro.</td></tr>}
        {shown.map(r => <tr key={r.id}><td><div className="person-cell"><Avatar initials={r.initials} small /><strong>{r.name}</strong></div></td><td className="muted-cell">{r.legajo}</td><td>{r.role}</td>
          <td>{r.entry}{r.porQr && <span className="attach-chip qr-chip">por QR</span>}{r.pendiente && <span className="attach-chip pend-chip">pendiente de validar</span>}</td><td><StatusBadge tone={markTone[r.status]}>{r.status}</StatusBadge></td>
          <td>{r.pendiente && <button className="mini-btn ok confirmar" onClick={() => { const f = bus?.fichajes[r.id]; if (f) bus?.registrarFichaje({ ...f, pendiente: false }); onNotify(`Fichaje de ${r.name} confirmado.`) }}><Check size={12} /> Confirmar fichaje</button>}<MarkPicker name={r.name} value={r.status} options={r.tardanza ? ['Presente', 'Tardanza', 'Ausente'] : ['Presente', 'Ausente']} onConfirm={m => { setManual(p => ({ ...p, [r.id]: m })); setCambios(true); onNotify(`Asistencia de ${r.name} confirmada como ${m}.`) }} /></td></tr>)}
      </tbody></table></div>
    </section>
  </>
}

/** Filtro por tipo de persona (profesor, preceptor, etc.), con la cantidad de cada uno. */
function TipoFilter({ value, onChange, opciones, roles }: { value: string; onChange: (v: string) => void; opciones: string[]; roles: string[] }) {
  return <label className="inline-select">Tipo<select value={value} onChange={e => onChange(e.target.value)}>
    <option value="">Todos ({roles.length})</option>
    {opciones.map(o => <option key={o} value={o}>{o} ({roles.filter(r => r === o).length})</option>)}
  </select></label>
}

/* ───────────── Historial ───────────── */
export function HistoryView({ role, onNotify }: { role: Role; onNotify: Notify }) {
  const personal = role === 'Profesor' || role === 'Alumno'
  const bus = useDemoBus()
  const fichajeHoy = role === 'Profesor' ? bus?.fichajes['maria'] : undefined
  const [who, setWho] = useState('Todos')
  const [estadoF, setEstadoF] = useState('')
  /** Curso (preceptor) o cargo (administrador) */
  const [grupoF, setGrupoF] = useState('')
  const esPreceptor = role === 'Preceptor'
  const grupoLabel = esPreceptor ? 'Curso' : 'Cargo'
  // El preceptor ve a los alumnos de sus cursos; el administrador, al personal y a los alumnos.
  const alumnos = Object.entries(courses).flatMap(([curso, l]) => l.map(a => ({ name: a.name, grupo: curso })))
  const cargoDe = { docente: 'Profesor', preceptor: 'Preceptor', administrativo: 'Administrativo' } as Record<string, string>
  const sujetos = esPreceptor ? alumnos : [...(bus?.config ?? CONFIG_INICIAL).personal.map(p => ({ name: p.nombre, grupo: cargoDe[p.tipo] ?? 'Personal' })), ...alumnos.map(a => ({ name: a.name, grupo: 'Alumno' }))]
  const grupos = [...new Set(sujetos.map(s => s.grupo))]
  const people = ['Todos', ...sujetos.filter(s => !grupoF || s.grupo === grupoF).map(s => s.name)]
  const title = personal ? 'Mi historial de asistencia' : role === 'Preceptor' ? 'Historial personal y completo' : 'Historial de asistencia'
  const hoyTxt = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
  const base = fichajeHoy ? [{ date: `${hoyTxt} (hoy)`, entry: fichajeHoy.hora, exit: '—', status: fichajeHoy.estado, tone: (fichajeHoy.estado === 'Presente' ? 'success' : 'warning') as Tone, note: fichajeHoy.estado === 'Tardanza' ? `Tardanza de ${fichajeHoy.minutosTarde} min · fichaje por QR` : 'Fichaje por QR' }, ...personalHistory] : personalHistory
  const all = personal ? base.map(r => ({ ...r, who: '', grupo: '' }))
    : sujetos.flatMap((s, j) => base.map((r, i) => ({ ...base[(i + j) % base.length], date: r.date, who: s.name, grupo: s.grupo })))
  const rows = all.filter(r => personal || ((who === 'Todos' || r.who === who) && (!grupoF || r.grupo === grupoF))).filter(r => !estadoF || r.status === estadoF)
  const presentes = personalHistory.filter(r => r.status === 'Presente').length
  return <>
    <PageHeading eyebrow="CONSULTA" title={title} description={personal ? 'Todas tus marcaciones, tardanzas e inasistencias.' : 'Consultá el historial de cualquier persona o el registro completo.'}
      action={role === 'Alumno' ? <button className="button primary" onClick={() => { exportarPDF('Resumen de asistencias', `Tomás Ríos · 4° B · ${mesActual()}`, ['Fecha', 'Entrada', 'Salida', 'Estado', 'Observación'], personalHistory.map(r => [r.date, r.entry, r.exit, r.status, r.note]), 'resumen-asistencias'); onNotify('Resumen de asistencias descargado (resumen-asistencias.pdf).') }}><Download size={16} />Descargar resumen</button> : undefined} />
    {personal && <div className="mini-stats"><div><span>Presentes</span><strong className="green-text">{presentes}</strong><CheckCircle2 size={19} /></div><div><span>Tardanzas</span><strong className="amber-text">1</strong><Clock3 size={19} /></div><div><span>Inasistencias</span><strong className="red-text">1</strong><XCircle size={19} /></div></div>}
    <section className="panel table-panel">
      {!personal && <div className="toolbar">
        <label className="inline-select">{grupoLabel}<select value={grupoF} onChange={e => { const g = e.target.value; setGrupoF(g); if (g && !sujetos.some(s => s.name === who && s.grupo === g)) setWho('Todos') }}><option value="">Todos</option>{grupos.map(g => <option key={g}>{g}</option>)}</select></label>
        <label className="inline-select">{esPreceptor ? 'Alumno' : 'Persona'}<select value={who} onChange={e => setWho(e.target.value)}>{people.map(p => <option key={p}>{p}</option>)}</select></label>
        <label className="inline-select">Estado<select value={estadoF} onChange={e => setEstadoF(e.target.value)}><option value="">Todos</option><option>Presente</option><option>Tardanza</option><option>Ausente</option></select></label></div>}
      <div className="table-scroll"><table><thead><tr>{!personal && <><th>{esPreceptor ? 'ALUMNO' : 'PERSONA'}</th><th>{grupoLabel.toUpperCase()}</th></>}<th>FECHA</th><th>ENTRADA</th><th>SALIDA</th><th>ESTADO</th><th>OBSERVACIÓN</th></tr></thead><tbody>
        {!rows.length && <tr><td colSpan={7} className="empty-state">No hay registros que coincidan con los filtros.</td></tr>}
        {rows.map((r, i) => <tr key={i}>{!personal && <><td><strong>{r.who}</strong></td><td>{r.grupo}</td></>}<td>{r.date}</td><td>{r.entry}</td><td>{r.exit}</td><td><StatusBadge tone={r.tone}>{r.status}</StatusBadge></td><td className="muted-cell">{r.note}</td></tr>)}
      </tbody></table></div>
    </section>
  </>
}

/** Menú de tres puntos con Ver detalle / Editar / Eliminar. Posición fija para que la tabla no lo recorte. */
export function RowMenu({ label, onDetail, onEdit, onDelete, extra }: { label: string; onDetail: () => void; onEdit: () => void; onDelete: () => void; extra?: { label: string; onClick: () => void } }) {
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
  const [tipo, setTipo] = useState('')
  const shown = users.filter(u => (!tipo || u.role === tipo) && (u.name.toLowerCase().includes(q.toLowerCase()) || u.id.toLowerCase().includes(q.toLowerCase())))

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
    onNotify(`Se dio de alta a ${f.name.trim()} tras validar sus datos.`)
  }
  const field = (k: keyof typeof f, label: string, ph: string) => <label>{label} *<input value={f[k]} aria-invalid={!!errors[k]} onChange={e => setF({ ...f, [k]: e.target.value })} placeholder={ph} />{errors[k] && <span role="alert" className="field-error">{errors[k]}</span>}</label>

  return <>
    <PageHeading eyebrow="ADMINISTRACIÓN" title="Administrar usuarios" description="Alta, baja y modificación de profesores, preceptores y alumnos." action={<button className="button primary" onClick={() => setOpen(true)}><Plus size={17} />Nuevo usuario</button>} />
    <section className="panel table-panel">
      <div className="toolbar"><div className="table-search"><Search size={17} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre o legajo..." aria-label="Buscar" /></div>
        <TipoFilter value={tipo} onChange={setTipo} opciones={['Profesor', 'Preceptor', 'Alumno', 'Administrador']} roles={users.map(u => u.role)} /></div>
      <div className="table-scroll"><table><thead><tr><th>LEGAJO</th><th>USUARIO</th><th>ROL</th><th>ÁREA / CURSO</th><th>ESTADO</th><th></th></tr></thead><tbody>
        {!shown.length && <tr><td colSpan={6} className="empty-state">No hay personas que coincidan con el filtro.</td></tr>}
        {shown.map(u => <tr key={u.id}><td className="muted-cell">{u.id}</td><td><div className="person-cell"><Avatar initials={u.initials} small /><div><strong>{u.name}</strong><span>{u.email}</span></div></div></td><td>{u.role}</td><td>{u.area}</td><td><StatusBadge tone={u.active ? 'success' : 'danger'}>{u.active ? 'Activo' : 'Inactivo'}</StatusBadge></td><td><RowMenu label={`Acciones de ${u.name}`} onDetail={() => setDetailU(u)} onEdit={() => startEditU(u)} onDelete={() => setDelU(u)} extra={{ label: u.active ? 'Desactivar' : 'Activar', onClick: () => { onUpdate(u.id, { active: !u.active }); onNotify(`Se ${u.active ? 'desactivó' : 'activó'} a ${u.name}.`) } }} /></td></tr>)}
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
      <div className="modal-footer"><button className="button secondary" autoFocus onClick={() => setDelU(null)}>Cancelar</button><button className="button danger" onClick={() => { onDelete(delU.id); onNotify(`Se eliminó a ${delU.name}.`); setDelU(null) }}><Trash2 size={15} />Eliminar</button></div>
    </div></div>}
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

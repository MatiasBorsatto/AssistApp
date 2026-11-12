'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, ArrowRight, CalendarDays, CheckCircle2, ClipboardCheck, Clock3, FileCheck2, FileText, History, Lightbulb, MailWarning, QrCode, Send, Settings2, X, XCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PageHeading, StatusBadge } from './shared'
import { aIso, tipoDia } from '@/lib/calendario'
import { construirReporte } from '@/lib/demo-report'
import { useDemoBus } from '@/lib/demo-bus'
import { CONFIG_INICIAL, DIAS, etiquetaPeriodo, franjasDelDia, type DiaSemana } from '@/lib/fichaje'
import { personalHistory } from '@/lib/data'
import { rangoCorto } from '@/lib/fechas'
import { roles, type Role, type ViewId } from '@/lib/roles'

const PRIMEROS_PASOS: Record<Role, string[]> = {
  Administrador: ['Revisá las justificaciones que están “Para revisar”.', 'Mirá la asistencia de hoy y corregí lo que haga falta.', 'En Configuración definís los horarios, el calendario y el código QR.'],
  Preceptor: ['Tocá “Pasar lista”, elegí el curso y marcá a cada alumno.', 'Revisá las justificaciones que te envían los alumnos.', 'Descargá el reporte del curso cuando lo necesites.'],
  Profesor: ['Al llegar a la escuela, tocá “Fichar entrada” y escaneá el código de la puerta.', 'Si no podés ir, usá “Avisar que no voy”.', 'En el calendario ves los feriados y tus ausencias.'],
  Alumno: ['Si faltaste, tocá “Justificar una falta” y sacale una foto al certificado.', 'Tu preceptora la revisa y te avisa acá.', 'En “Mi asistencia” podés descargar un resumen.'],
}

function Accion({ icono: Icono, titulo, texto, boton, onClick, cuenta, destacada = false, tono = 'ambar' }: { icono: LucideIcon; titulo: string; texto: string; boton: string; onClick: () => void; cuenta?: number; destacada?: boolean; tono?: 'ambar' | 'azul' | 'verde' }) {
  return <button type="button" className={`accion ${destacada ? 'destacada' : ''} ${tono}`} onClick={onClick}>
    <span className="accion-icono"><Icono size={22} />{cuenta !== undefined && cuenta > 0 && <b className="accion-cuenta" aria-label={`${cuenta} pendientes`}>{cuenta}</b>}</span>
    <span className="accion-texto"><strong>{titulo}</strong><small>{texto}</small></span>
    <span className="accion-go">{boton}<ArrowRight size={15} /></span>
  </button>
}

function saludo() { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches' }

/** Pantalla de inicio de cada perfil: qué pasó hoy y qué conviene hacer ahora, con botones grandes. */
export function InicioView({ role, go, sinLeer }: { role: Role; go: (id: ViewId) => void; sinLeer: number }) {
  const bus = useDemoBus()
  const config = bus?.config ?? CONFIG_INICIAL
  const justs = bus?.justificaciones ?? []
  const fichajes = bus?.fichajes ?? {}
  const cfg = roles[role]
  const hoy = new Date().toISOString().slice(0, 10)
  const dia = tipoDia(config, hoy)
  const [tip, setTip] = useState(false)
  useEffect(() => { try { setTip(localStorage.getItem(`asistapp-tip-${role}`) !== 'off') } catch { setTip(true) } }, [role])
  const cerrarTip = () => { setTip(false); try { localStorage.setItem(`asistapp-tip-${role}`, 'off') } catch { /* sin almacenamiento */ } }
  const nombre = cfg.user.split(' ')[0]
  const fecha = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
  const estadoDia = dia.tipo === 'clase' ? 'Hoy hay clases' : dia.tipo === 'feriado' ? `Hoy es feriado: ${dia.nombre}` : dia.tipo === 'finde' ? 'Hoy es fin de semana' : 'Hoy está fuera del ciclo lectivo'

  const revisarPersonal = justs.filter(j => j.ambito === 'personal' && j.status === 'Pendiente').length
  const revisarAlumnos = justs.filter(j => j.ambito === 'alumno' && j.status === 'Pendiente').length
  const pendientesFichaje = Object.values(fichajes).filter(f => f.pendiente).length
  const wd = new Date().getDay()
  const diaId: DiaSemana = wd >= 1 && wd <= 5 ? DIAS[wd - 1].id : 'lunes'
  const maria = config.personal.find(p => p.id === 'maria')!

  let cuerpo: React.ReactNode = null
  if (role === 'Administrador') {
    const rep = construirReporte({ role, config, justificaciones: justs, fichajes, periodo: 'Este mes', alcance: 'Toda la institución', hoy })
    const hechos = Object.values(fichajes)
    cuerpo = <>
      <div className="inicio-kpis">
        <div className="mini-kpi"><span>Asistencia del mes</span><strong>{String(rep.kpi.asistencia).replace('.', ',')}%</strong></div>
        <div className="mini-kpi"><span>Ausentismo</span><strong>{String(rep.kpi.ausentismo).replace('.', ',')}%</strong></div>
        <div className="mini-kpi"><span>Tardanzas</span><strong>{String(rep.kpi.tardanzas).replace('.', ',')}%</strong></div>
        <div className="mini-kpi"><span>Personas</span><strong>{config.personal.length}</strong></div>
      </div>
      <h2 className="inicio-h">¿Qué querés hacer?</h2>
      <div className="acciones">
        <Accion destacada icono={FileCheck2} titulo="Revisar justificaciones" texto={revisarPersonal ? `Hay ${revisarPersonal} esperando tu decisión.` : 'No hay nada pendiente. ¡Todo al día!'} boton="Revisar" cuenta={revisarPersonal} onClick={() => go('justificaciones')} />
        <Accion icono={ClipboardCheck} titulo="Ver la asistencia de hoy" texto={pendientesFichaje ? `${pendientesFichaje} fichaje${pendientesFichaje > 1 ? 's' : ''} para confirmar.` : 'Revisá quién llegó y corregí lo necesario.'} boton="Abrir" cuenta={pendientesFichaje} onClick={() => go('gestion-asistencia')} />
        <Accion icono={FileText} titulo="Descargar un reporte" texto="Excel o PDF con nombres y fechas." boton="Ir a reportes" tono="azul" onClick={() => go('reportes')} />
        <Accion icono={Settings2} titulo="Configurar la escuela" texto="Horarios, tolerancia, calendario y código QR." boton="Configurar" tono="azul" onClick={() => go('configuracion')} />
      </div>
      <section className="panel inicio-hoy"><div className="panel-header"><div><h2>Fichajes de hoy</h2><p>Se actualizan solos cuando alguien escanea el código</p></div></div>
        {hechos.length === 0 ? <p className="empty-state">Todavía nadie fichó hoy.</p> : <ul className="fich-lista">{hechos.map(f => <li key={f.personaId}><strong>{config.personal.find(p => p.id === f.personaId)?.nombre ?? f.personaId}</strong><span>{f.hora}</span><StatusBadge tone={f.estado === 'Presente' ? 'success' : 'warning'}>{f.estado}</StatusBadge>{f.pendiente && <StatusBadge tone="blue">Por confirmar</StatusBadge>}</li>)}</ul>}
      </section>
    </>
  } else if (role === 'Preceptor') {
    cuerpo = <>
      <h2 className="inicio-h">¿Qué querés hacer?</h2>
      <div className="acciones">
        <Accion destacada icono={ClipboardCheck} titulo="Pasar lista" texto="Elegí el curso y marcá a cada alumno." boton="Empezar" onClick={() => go('gestion-asistencia')} />
        <Accion icono={FileCheck2} titulo="Justificaciones de alumnos" texto={revisarAlumnos ? `Hay ${revisarAlumnos} para revisar, con foto del certificado.` : 'No hay ninguna pendiente.'} boton="Revisar" cuenta={revisarAlumnos} onClick={() => go('justificaciones')} />
        <Accion icono={FileText} titulo="Reporte del curso" texto="Asistencia alumno por alumno, en Excel o PDF." boton="Ir a reportes" tono="azul" onClick={() => go('reportes')} />
        <Accion icono={QrCode} titulo="Fichar mi entrada" texto="Escaneá el código QR de la puerta." boton="Fichar" tono="verde" onClick={() => go('fichar')} />
      </div></>
  } else if (role === 'Profesor') {
    const clases = franjasDelDia(config, maria, diaId, aIso(new Date()))
    const f = fichajes['maria']
    const avisos = justs.filter(j => j.name === 'María González' && j.origin === 'Aviso temprano')
    cuerpo = <>
      <section className={`panel estado-fichaje ${f ? (f.estado === 'Presente' ? 'ok' : 'tarde') : ''}`}>
        <div>{f ? <CheckCircle2 size={26} /> : <Clock3 size={26} />}</div>
        <div><strong>{f ? `Ya fichaste a las ${f.hora}` : 'Todavía no fichaste hoy'}</strong>
          <span>{f ? (f.estado === 'Presente' ? 'Tu asistencia quedó registrada a horario.' : `Quedó registrada con ${f.minutosTarde} minutos de tardanza.`) : dia.tipo === 'clase' ? 'Cuando llegues, tocá “Fichar entrada”.' : estadoDia + '.'}</span></div>
        {!f && dia.tipo === 'clase' && <button className="button primary" onClick={() => go('registrar-qr')}><QrCode size={16} />Fichar entrada</button>}
      </section>
      <section className="panel inicio-hoy"><div className="panel-header"><div><h2>Tus clases de hoy</h2><p>{dia.tipo === 'clase' ? 'Según el horario cargado por administración' : estadoDia}</p></div></div>
        {clases.length === 0 || dia.tipo !== 'clase' ? <p className="empty-state">{dia.tipo === 'clase' ? 'Hoy no tenés clases.' : 'Hoy no hay clases.'}</p> : <ul className="fich-lista">{clases.map(c => <li key={c.entrada}><strong>{c.materia}</strong><span>{c.entrada} a {c.salida}{etiquetaPeriodo(c) ? ` · ${etiquetaPeriodo(c)}` : ''}</span></li>)}</ul>}
      </section>
      <h2 className="inicio-h">¿Qué querés hacer?</h2>
      <div className="acciones">
        <Accion icono={MailWarning} titulo="Avisar que no voy" texto="Indicá los días y el motivo. Administración lo recibe al instante." boton="Avisar" onClick={() => go('aviso')} />
        <Accion icono={History} titulo="Mi historial" texto="Tus asistencias, tardanzas y ausencias." boton="Ver" tono="azul" onClick={() => go('historial')} />
        <Accion icono={CalendarDays} titulo="Calendario" texto={avisos.length ? `Tenés ${avisos.length} aviso${avisos.length > 1 ? 's' : ''} cargado${avisos.length > 1 ? 's' : ''}.` : 'Feriados y días de clases.'} boton="Abrir" tono="azul" onClick={() => go('calendario')} />
      </div></>
  } else {
    const mias = justs.filter(j => j.name === 'Tomás Ríos' && j.ambito === 'alumno')
    const enRev = mias.filter(j => j.status === 'Pendiente').length
    const presentes = personalHistory.filter(r => r.status === 'Presente').length
    const pct = Math.round((presentes / personalHistory.length) * 100)
    const ultima = mias.filter(j => j.status !== 'Pendiente').sort((a, b) => b.id - a.id)[0]
    cuerpo = <>
      <div className="inicio-kpis">
        <div className="mini-kpi"><span>Mi asistencia</span><strong>{pct}%</strong></div>
        <div className="mini-kpi"><span>Justificaciones en revisión</span><strong>{enRev}</strong></div>
        <div className="mini-kpi"><span>Avisos sin leer</span><strong>{sinLeer}</strong></div>
      </div>
      {ultima && <div className={`aviso-resp ${ultima.status === 'Aprobado' ? 'ok' : 'mal'}`} role="status">{ultima.status === 'Aprobado' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}<div><strong>Tu justificación por “{ultima.reason}” ({rangoCorto(ultima.desde, ultima.hasta)}) fue {ultima.status === 'Aprobado' ? 'aprobada' : 'rechazada'}.</strong>{ultima.respuesta && <span>{ultima.respuesta}</span>}</div></div>}
      <h2 className="inicio-h">¿Qué querés hacer?</h2>
      <div className="acciones">
        <Accion destacada icono={Send} titulo="Justificar una falta" texto="Enviale a tu preceptora el motivo y la foto del certificado." boton="Justificar" onClick={() => go('justificar')} />
        <Accion icono={History} titulo="Ver mi asistencia" texto="Tus presentes, tardanzas y faltas. Descargá el resumen." boton="Ver" tono="azul" onClick={() => go('historial')} />
        <Accion icono={AlertCircle} titulo="Mis avisos" texto={sinLeer ? `Tenés ${sinLeer} sin leer.` : 'No tenés avisos nuevos.'} boton="Abrir" cuenta={sinLeer} tono="azul" onClick={() => go('notificaciones')} />
      </div></>
  }

  return <>
    <PageHeading eyebrow={fecha.toUpperCase()} title={`${saludo()}, ${nombre}`} description={`${estadoDia}. ${cfg.detail}.`} />
    {tip && <aside className="tip" aria-label="Primeros pasos"><Lightbulb size={20} /><div><strong>Primeros pasos</strong><ol>{PRIMEROS_PASOS[role].map(t => <li key={t}>{t}</li>)}</ol></div><button className="icon-button" aria-label="Cerrar los primeros pasos" onClick={cerrarTip}><X size={16} /></button></aside>}
    {cuerpo}
  </>
}

'use client'

import { useState } from 'react'
import { Check, CheckCircle2, FileText, Send } from 'lucide-react'
import { PageHeading, StatusBadge } from './shared'
import { SubirImagen, type Adjunto } from './subir-imagen'
import { tonoEstado } from './justificaciones'
import { useDemoBus } from '@/lib/demo-bus'
import { diasHabilesTxt, rangoCorto } from '@/lib/fechas'

const MOTIVOS = ['Enfermedad', 'Control médico', 'Trámite familiar', 'Duelo familiar', 'Problema de transporte', 'Otro motivo']
const hoy = () => new Date().toISOString().slice(0, 10)
const PRECEPTORA = 'Laura Benítez'

/** El alumno justifica una inasistencia: la envía directo a su preceptora, con foto del certificado si la tiene. */
export function JustificarView({ onNotify }: { onNotify: (m?: string) => void }) {
  const bus = useDemoBus()
  const [desde, setDesde] = useState(hoy())
  const [hasta, setHasta] = useState(hoy())
  const [motivo, setMotivo] = useState('')
  const [otro, setOtro] = useState('')
  const [comentario, setComentario] = useState('')
  const [adj, setAdj] = useState<Adjunto>({})
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [enviada, setEnviada] = useState<{ desde: string; hasta: string } | null>(null)
  const mias = (bus?.justificaciones ?? []).filter(j => j.name === 'Tomás Ríos' && j.ambito === 'alumno').sort((a, b) => b.id - a.id)

  const enviar = () => {
    const m = motivo === 'Otro motivo' ? otro.trim() : motivo
    const e: Record<string, string> = {}
    if (!desde) e.desde = 'Indicá el primer día que faltaste.'
    if (!hasta) e.hasta = 'Indicá el último día que faltaste.'
    else if (desde && hasta < desde) e.hasta = 'El último día no puede ser anterior al primero.'
    if (!m) e.motivo = motivo === 'Otro motivo' ? 'Contanos el motivo.' : 'Elegí el motivo.'
    setErrores(e)
    if (Object.keys(e).length) return
    bus?.addJustification({ name: 'Tomás Ríos', initials: 'TR', desde, hasta, reason: m, origin: 'Alumno', ambito: 'alumno', curso: '4° B', comentario: comentario.trim() || undefined, imagen: adj.imagen, attachment: adj.imagen ? undefined : adj.nombre })
    bus?.push({ para: ['Preceptor'], title: 'Nueva justificación de un alumno', msg: `Tomás Ríos (4° B) envió una justificación por "${m}": ${rangoCorto(desde, hasta)}${adj.imagen ? ' Adjuntó una imagen.' : ''}`, tone: 'blue' })
    setEnviada({ desde, hasta }); onNotify(`Justificación enviada a ${PRECEPTORA}.`)
    setMotivo(''); setOtro(''); setComentario(''); setAdj({}); setDesde(hoy()); setHasta(hoy())
  }

  return <>
    <PageHeading eyebrow="MIS INASISTENCIAS" title="Justificar una inasistencia" description={`Contale a tu preceptora ${PRECEPTORA} por qué faltaste. Ella la revisa y te avisa si la aprueba.`} />
    {enviada && <div className="aviso-exito" role="status"><CheckCircle2 size={22} /><div><strong>¡Enviada!</strong><span>{PRECEPTORA} ya recibió tu justificación del {rangoCorto(enviada.desde, enviada.hasta)} Te avisamos acá apenas la revise.</span></div></div>}
    <div className="report-layout">
      <section className="panel report-form form-guiado"><div className="panel-header"><div><h2>Nueva justificación</h2><p>Son 3 pasos. Los campos con * son obligatorios.</p></div></div>
        <div className="paso"><span className="paso-n">1</span><div className="paso-c">
          <fieldset className="rango-fechas"><legend>¿Qué días faltaste? *</legend>
            <div className="form-row">
              <label>Primer día<input type="date" value={desde} max={hoy()} onChange={e => { setDesde(e.target.value); if (hasta < e.target.value) setHasta(e.target.value); setErrores({}) }} aria-invalid={!!errores.desde} />{errores.desde && <span role="alert" className="field-error">{errores.desde}</span>}</label>
              <label>Último día<input type="date" value={hasta} min={desde} max={hoy()} onChange={e => { setHasta(e.target.value); setErrores({}) }} aria-invalid={!!errores.hasta} />{errores.hasta && <span role="alert" className="field-error">{errores.hasta}</span>}</label>
            </div>
            {desde && hasta >= desde && <p className="resumen-rango">{rangoCorto(desde, hasta)} · {diasHabilesTxt(desde, hasta)}</p>}
          </fieldset></div></div>
        <div className="paso"><span className="paso-n">2</span><div className="paso-c">
          <label>¿Por qué faltaste? *<select value={motivo} onChange={e => { setMotivo(e.target.value); setErrores({}) }} aria-invalid={!!errores.motivo}><option value="">Elegí un motivo…</option>{MOTIVOS.map(m => <option key={m}>{m}</option>)}</select>{errores.motivo && <span role="alert" className="field-error">{errores.motivo}</span>}</label>
          {motivo === 'Otro motivo' && <label>Contanos el motivo *<input value={otro} onChange={e => setOtro(e.target.value)} /></label>}
          <label>Algo más que quieras aclarar (opcional)<input value={comentario} onChange={e => setComentario(e.target.value)} placeholder="Ej. Tenía turno con el pediatra" /></label></div></div>
        <div className="paso"><span className="paso-n">3</span><div className="paso-c">
          <SubirImagen value={adj} onChange={setAdj} etiqueta="Foto del certificado o comprobante" ayuda="Sacale una foto al papel o elegí una imagen de tu galería. Ayuda a que la aprueben." /></div></div>
        <div className="form-envio"><button className="button primary full" onClick={enviar}><Send size={16} />Enviar a {PRECEPTORA}</button></div>
      </section>

      <section className="panel report-preview"><div className="panel-header"><div><h2>Mis justificaciones</h2><p>Mirá en qué estado está cada una</p></div></div>
        {mias.length === 0 ? <div className="vacio"><FileText size={28} /><strong>Todavía no enviaste ninguna</strong><p>Cuando justifiques una falta, la vas a ver acá.</p></div> : <div className="mis-just">{mias.map(j => <article className="mi-just" key={j.id}>
          <div className="mi-just-top"><strong>{j.reason}</strong><StatusBadge tone={tonoEstado(j.status)}>{j.status === 'Pendiente' ? 'En revisión' : j.status}</StatusBadge></div>
          <span className="muted-cell">{rangoCorto(j.desde, j.hasta)} · {diasHabilesTxt(j.desde, j.hasta)}</span>
          {j.imagen && <img src={j.imagen} alt="Certificado que enviaste" className="mi-just-img" />}
          {j.status === 'Aprobado' && <p className="resp ok"><Check size={14} /> Tu preceptora la aprobó.</p>}
          {j.status === 'Rechazado' && <p className="resp mal">No fue aprobada{j.respuesta ? `: ${j.respuesta}` : '.'} Podés enviar una nueva con el comprobante.</p>}
          {j.status === 'Pendiente' && <p className="resp">{PRECEPTORA} todavía no la revisó.</p>}
        </article>)}</div>}
      </section>
    </div>
  </>
}

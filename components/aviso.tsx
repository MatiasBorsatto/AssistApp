'use client'

import { useState } from 'react'
import { Check, Clock3, Send } from 'lucide-react'
import { PageHeading, StatusBadge } from './shared'
import { SubirImagen, type Adjunto } from './subir-imagen'
import { tonoEstado } from './justificaciones'
import { useDemoBus } from '@/lib/demo-bus'
import { diasHabilesTxt, rangoCorto } from '@/lib/fechas'

const MOTIVOS = ['Enfermedad', 'Licencia médica', 'Trámite personal', 'Duelo', 'Capacitación', 'Fuerza mayor']
const hoy = () => new Date().toISOString().slice(0, 10)

/** Aviso temprano del Profesor: indica desde qué día hasta qué día no va a asistir. */
export function EarlyNotice({ onNotify }: { onNotify: (m?: string) => void }) {
  const bus = useDemoBus()
  const [motivo, setMotivo] = useState('')
  const [desde, setDesde] = useState(hoy())
  const [hasta, setHasta] = useState(hoy())
  const [comentario, setComentario] = useState('')
  const [adj, setAdj] = useState<Adjunto>({})
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [enviado, setEnviado] = useState(false)
  const mios = (bus?.justificaciones ?? []).filter(j => j.name === 'María González' && j.origin === 'Aviso temprano')
  const medico = motivo === 'Enfermedad' || motivo === 'Licencia médica'

  const enviar = () => {
    const e: Record<string, string> = {}
    if (!motivo) e.motivo = 'Elegí el motivo de tu ausencia.'
    if (!desde) e.desde = 'Indicá el día de comienzo.'
    if (!hasta) e.hasta = 'Indicá el día de finalización.'
    else if (desde && hasta < desde) e.hasta = 'La finalización no puede ser anterior al comienzo.'
    setErrores(e)
    if (Object.keys(e).length) return
    bus?.addJustification({ name: 'María González', initials: 'MG', desde, hasta, reason: motivo, origin: 'Aviso temprano', ambito: 'personal', comentario: comentario.trim() || undefined, imagen: adj.imagen, attachment: adj.imagen ? undefined : adj.nombre })
    bus?.push({ para: ['Administrador'], title: 'Nuevo aviso de inasistencia', msg: `María González avisó que no asistirá (${motivo}): ${rangoCorto(desde, hasta)}.`, tone: 'warning' })
    onNotify('Aviso enviado a administración.')
    setEnviado(true); setMotivo(''); setComentario(''); setAdj({}); setDesde(hoy()); setHasta(hoy())
  }

  return <>
    <PageHeading eyebrow="AVISO TEMPRANO" title="Avisar que no voy a asistir" description="Contanos qué días vas a faltar. Administración recibe el aviso al instante y puede organizar la cobertura." />
    <div className="report-layout">
      <section className="panel report-form form-guiado"><div className="panel-header"><div><h2>Nuevo aviso</h2><p>Completá estos pasos. Los campos con * son obligatorios.</p></div></div>
        <div className="paso"><span className="paso-n">1</span><div className="paso-c">
          <fieldset className="rango-fechas"><legend>¿Qué días no vas a ir? *</legend>
            <div className="form-row">
              <label>Día de comienzo<input type="date" value={desde} onChange={e => { setDesde(e.target.value); if (hasta < e.target.value) setHasta(e.target.value); setErrores({}) }} aria-invalid={!!errores.desde} />{errores.desde && <span role="alert" className="field-error">{errores.desde}</span>}</label>
              <label>Día de finalización<input type="date" value={hasta} min={desde} onChange={e => { setHasta(e.target.value); setErrores({}) }} aria-invalid={!!errores.hasta} />{errores.hasta && <span role="alert" className="field-error">{errores.hasta}</span>}</label>
            </div>
            {desde && hasta >= desde && <p className="resumen-rango">{rangoCorto(desde, hasta)} · {diasHabilesTxt(desde, hasta)}</p>}
          </fieldset></div></div>
        <div className="paso"><span className="paso-n">2</span><div className="paso-c">
          <label>¿Cuál es el motivo? *<select value={motivo} onChange={e => { setMotivo(e.target.value); setErrores({}); setEnviado(false) }} aria-invalid={!!errores.motivo}><option value="">Elegí un motivo…</option>{MOTIVOS.map(m => <option key={m}>{m}</option>)}</select>{errores.motivo && <span role="alert" className="field-error">{errores.motivo}</span>}</label>
          <label>Comentario (opcional)<input value={comentario} onChange={e => setComentario(e.target.value)} placeholder="Algo que administración deba saber" /></label></div></div>
        <div className="paso"><span className="paso-n">3</span><div className="paso-c">
          <SubirImagen value={adj} onChange={setAdj} etiqueta={medico ? 'Certificado médico (recomendado)' : 'Certificado o comprobante (opcional)'} /></div></div>
        <div className="form-envio"><button className="button primary full" onClick={enviar}><Send size={16} />Enviar aviso a administración</button>
          {enviado && <p className="enviado-ok" role="status"><Check size={14} /> ¡Listo! Tu aviso ya está en administración.</p>}</div>
      </section>
      <section className="panel report-preview"><div className="panel-header"><div><h2>Mis avisos</h2><p>Acá ves si administración los aprobó</p></div></div>
        {mios.length === 0 ? <div className="vacio"><Clock3 size={28} /><strong>Todavía no enviaste avisos</strong><p>Cuando envíes uno, lo vas a ver acá con su estado.</p></div> : <div className="pending-list">{mios.map(j => <div className="pending-item" key={j.id}>
          <div><strong>{j.reason} · {rangoCorto(j.desde, j.hasta)}</strong><span>{diasHabilesTxt(j.desde, j.hasta)}{j.respuesta ? ` · ${j.respuesta}` : ''}</span></div>
          <StatusBadge tone={tonoEstado(j.status)}>{j.status === 'Pendiente' ? 'Para revisar' : j.status}</StatusBadge></div>)}</div>}
      </section>
    </div>
  </>
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { Camera, Check, CheckCircle2, Clock3, Info, X, XCircle, Zap } from 'lucide-react'
import { PageHeading } from './shared'
import { MENSAJE_CAMARA, VisorCamara, type ErrorCamara } from './camara'
import { clasificarQr } from '@/lib/qr-scan'
import { useDemoBus } from '@/lib/demo-bus'
import { CONFIG_INICIAL, DIAS, TIPO_LABEL, UBICACIONES, aplicaTardanza, evaluarFichaje, franjasDelDia, personaDePerfil, sumarMin, type DiaSemana, type QrLeido, type RedSim, type ResultadoFichaje } from '@/lib/fichaje'
import type { Role } from '@/lib/roles'

/** Hoy como día de la semana de la demo (si es fin de semana, se simula un lunes). */
const diaHoy = (): DiaSemana => { const i = new Date().getDay(); return i >= 1 && i <= 5 ? DIAS[i - 1].id : 'lunes' }

/**
 * Fichaje por QR. El sistema decide solo, con las reglas de Configuración:
 * horario de la persona, tolerancia de tardanza, ventana de fichaje, perímetro y redes Wi-Fi autorizadas.
 * Los controles de "condiciones del dispositivo" existen sólo para poder simular el celular en la demostración.
 */
export function FicharView({ role, onNotify }: { role: Role; onNotify: (m: string) => void }) {
  const bus = useDemoBus()
  const config = bus?.config ?? CONFIG_INICIAL
  const persona = config.personal.find(p => p.id === personaDePerfil(role)) ?? config.personal[0]
  const { reglas } = config

  const [dia, setDia] = useState<DiaSemana>(diaHoy())
  const franjasDe = (d: DiaSemana) => franjasDelDia(config, persona, d)
  const franjas = franjasDe(dia)
  const franja = franjas[0]
  const [hora, setHora] = useState(() => (franja ? sumarMin(franja.entrada, 2) : '08:00'))
  const [ubic, setUbic] = useState('dentro')
  const [redSel, setRedSel] = useState('wifi:0')
  const [res, setRes] = useState<ResultadoFichaje | null>(null)
  const [validando, setValidando] = useState(false)
  const [qr, setQr] = useState<QrLeido>('vigente')
  const [camara, setCamara] = useState(false)
  const [errorCamara, setErrorCamara] = useState<ErrorCamara | null>(null)
  const [leido, setLeido] = useState<{ texto: string; clase: QrLeido } | null>(null)

  // Al cambiar de día o de persona, se propone una hora cercana a la entrada
  useEffect(() => { setHora(franja ? sumarMin(franja.entrada, 2) : '08:00'); setRes(null) }, [dia, persona.id, franja?.entrada, config]) // eslint-disable-line react-hooks/exhaustive-deps

  const redes: { v: string; label: string; red: RedSim }[] = useMemo(() => [
    ...reglas.redes.map((n, i) => ({ v: `wifi:${i}`, label: `${n} (red de la escuela)`, red: { kind: 'wifi' as const, nombre: n } })),
    { v: 'otra', label: 'CASA-WIFI (red desconocida)', red: { kind: 'wifi' as const, nombre: 'CASA-WIFI' } },
    { v: 'datos', label: 'Sin Wi-Fi (datos móviles)', red: { kind: 'datos' as const, nombre: 'Datos móviles' } },
  ], [reglas.redes])
  const redActual = redes.find(r => r.v === redSel) ?? redes[0]

  const escanear = (qrOverride?: QrLeido) => {
    if (validando) return
    const r = evaluarFichaje({ persona, franjas, dia, hora, metros: UBICACIONES.find(u => u.id === ubic)!.metros, red: redActual.red, reglas, qr: qrOverride ?? qr })
    setRes(null); setValidando(true)
    // En la demo la espera se acorta; el tiempo real validado se informa en el resultado.
    setTimeout(() => { setValidando(false); setRes(r); aplicar(r) }, r.estado === 'pendiente' ? 1500 : 500)
  }
  const abrirCamara = () => { if (validando || camara) return; setErrorCamara(null); setLeido(null); setRes(null); setCamara(true) }
  /** La cámara real encontró un QR: se compara con el código de la escuela y se sigue con las mismas validaciones. */
  const alLeer = (texto: string) => {
    const clase = clasificarQr(texto, reglas)
    setCamara(false); setLeido({ texto, clase }); setQr(clase)
    escanear(clase)
  }
  const aplicar = (r: ResultadoFichaje) => {
    if (r.estado === 'pendiente') {
      const hoy = new Date().toISOString().slice(0, 10)
      bus?.registrarFichaje({ personaId: persona.id, fecha: hoy, hora, estado: r.asistencia!, minutosTarde: r.minutosTarde, pendiente: true })
      bus?.push({ para: (['Administrador'] as Role[]).filter(x => x !== role), title: 'Fichaje pendiente de validar', msg: `${persona.nombre} fichó a las ${hora} pero no se pudo validar el GPS a tiempo. Confirmalo en Gestionar asistencia.`, tone: 'blue' })
      onNotify(`No se pudo validar a tiempo: tu fichaje quedó guardado con la hora ${hora} y se confirma después.`)
    } else if (r.estado === 'registrado') {
      const hoy = new Date().toISOString().slice(0, 10)
      bus?.registrarFichaje({ personaId: persona.id, fecha: hoy, hora, estado: r.asistencia!, minutosTarde: r.minutosTarde })
      if (r.asistencia === 'Tardanza') {
        bus?.push({ para: (['Administrador', 'Preceptor', 'Profesor'] as Role[]).filter(x => x !== role && x !== 'Profesor'), title: 'Alerta de tardanza', msg: `${persona.nombre} registró su entrada a las ${hora}: ${r.minutosTarde} min después de su horario (${r.entrada}).`, tone: 'warning' })
        onNotify(`Asistencia registrada con tardanza (${r.minutosTarde} min). Se generó una alerta.`)
      } else onNotify(`Asistencia registrada a las ${hora}.`)
    } else if (r.estado === 'rechazado') onNotify('No se pudo registrar: revisá ubicación y red Wi-Fi.')
    else onNotify(r.horario.detalle)
  }

  const filas: [string, string, boolean | null][] = [
    ['Ubicación GPS', res ? res.geo.detalle : `Se valida contra el perímetro de ${reglas.radio} m`, res ? res.geo.ok : null],
    ['Red Wi-Fi', res ? res.wifi.detalle : 'Se valida contra las redes autorizadas', res ? res.wifi.ok : null],
    ['Horario habilitado', res ? res.horario.detalle : franja ? `${persona.tipo === 'docente' ? `Primera clase ${franja.entrada} (${franja.materia})` : `Entrada ${franja.entrada}`} · se puede fichar desde las ${sumarMin(franja.entrada, -reglas.minutosAntes)}` : persona.tipo === 'docente' ? 'Sin clases este día' : 'Sin horario este día', res ? res.horario.ok : null],
  ]

  return <>
    <PageHeading eyebrow="CONTROL DIARIO" title="Registrar asistencia" description="Escaneá el código QR institucional para fichar tu entrada. El sistema compara la hora con tu horario." />
    <div className="attendance-grid">
      <section className="panel qr-panel"><div className="panel-header"><div><h2>Escanear código QR</h2><p>{persona.nombre} · {persona.cargo} · desde tu celular</p></div><span className="live-pill"><i />Activo</span></div>
        {camara ? <VisorCamara onLeido={alLeer} onError={e => { setCamara(false); setErrorCamara(e) }} onCerrar={() => setCamara(false)} /> : <div className={`scanner abrible ${validando ? 'leyendo' : ''}`} role="button" tabIndex={0} aria-disabled={validando} aria-label="Abrir la cámara para escanear el código QR"
          onClick={abrirCamara} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirCamara() } }}>
          <span className="sc-c tl" /><span className="sc-c tr" /><span className="sc-c bl" /><span className="sc-c br" /><span className="scan-line" />
          <div className="sc-texto"><Camera size={26} /><strong>{validando ? 'Leyendo el código…' : 'Tocá para abrir la cámara'}</strong><small>y apuntá al código QR pegado en la puerta de {reglas.lugar}</small></div></div>}
        {errorCamara && <p role="alert" className="form-error camara-error">{MENSAJE_CAMARA[errorCamara]}</p>}
        {leido && <p className="codigo-leido"><strong>Código leído:</strong> <code>{leido.texto}</code> · {leido.clase === 'vigente' ? 'es el de la escuela' : leido.clase === 'anterior' ? 'es de una versión anterior' : 'no pertenece a esta institución'}</p>}

        <fieldset className="sim-device"><legend>Condiciones del celular (solo para la demostración)</legend>
          <label>Día de la semana<select value={dia} onChange={e => setDia(e.target.value as DiaSemana)}>{DIAS.map(d => <option key={d.id} value={d.id}>{d.nombre}{franjasDe(d.id).length ? '' : persona.tipo === 'docente' ? ' (sin clases)' : ' (sin horario)'}</option>)}</select></label>
          <label>Hora del fichaje<input type="time" value={hora} onChange={e => { setHora(e.target.value); setRes(null) }} /></label>
          <label>Ubicación<select value={ubic} onChange={e => { setUbic(e.target.value); setRes(null) }}>{UBICACIONES.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}</select></label>
          <label>Red<select value={redSel} onChange={e => { setRedSel(e.target.value); setRes(null) }}>{redes.map(r => <option key={r.v} value={r.v}>{r.label}</option>)}</select></label>
          <label>Código que escanea<select value={qr} onChange={e => { setQr(e.target.value as QrLeido); setRes(null) }}><option value="vigente">El de la puerta (vigente)</option><option value="foto">Una foto del código</option><option value="anterior">Un código anterior (ya reemplazado)</option><option value="otro">Código de otro lugar</option></select></label>
        </fieldset>
        <p className="sim-nota"><Info size={13} /> Los límites salen de <strong>Configuración</strong> (tolerancia {reglas.tolerancia} min, perímetro {reglas.radio} m, {reglas.modo === 'una' ? 'alcanza con GPS o Wi-Fi' : 'se validan GPS y Wi-Fi'}, espera máxima {reglas.tiempoMaximo} s). {persona.tipo === 'docente' ? (franjas.length ? `Tus clases ese día: ${franjas.map(c => `${c.entrada}–${c.salida} ${c.materia}`).join(' · ')}.` : 'No tenés clases ese día.') : (franja ? `Tu horario ese día (${TIPO_LABEL[persona.tipo].toLowerCase()}): ${franja.entrada} a ${franja.salida}.` : 'Tu rol no tiene horario ese día.')}{!aplicaTardanza(persona.tipo) && ' Como administrativo/a, solo se registra Presente o Ausente.'}</p>
        <div className="escaneo-botones"><button className="button secondary" onClick={() => { setLeido(null); setErrorCamara(null); escanear() }} disabled={validando || camara}><Zap size={17} />Escaneo simulado (sin cámara)</button></div>
      </section>

      <section className="panel validation-panel"><div className="panel-header"><div><h2>Validación del registro</h2><p>Ubicación, red y horario</p></div></div>
        <div className="validation-list">{filas.map(([label, detalle, st]) => <div className="validation-row" key={label}><div className={`check-circle ${st === false ? 'fail' : st === null ? 'idle' : ''}`}>{st === false ? <X size={15} /> : <Check size={15} />}</div><div><strong>{label}</strong><span>{detalle}</span></div></div>)}</div>
        {validando && <div className="result-banner info" role="status"><Clock3 size={18} /><span>Validando ubicación y red… (máximo {reglas.tiempoMaximo} s). La hora que cuenta es la del escaneo: <strong>{hora}</strong>.</span></div>}
        {res && <Banner res={res} hora={hora} tardanza={aplicaTardanza(persona.tipo)} />}
      </section>
    </div>
  </>
}

function Banner({ res, hora, tardanza }: { res: ResultadoFichaje; hora: string; tardanza: boolean }) {
  const pie = res.validadoPor ? ` Validado por ${res.validadoPor} en ${String(res.segundos).replace('.', ',')} s.` : ''
  if (res.estado === 'pendiente') return <div className="result-banner info" role="status"><Info size={18} /><span>No se pudo validar a tiempo ({res.segundos} s), <strong>pero no perdés nada</strong>: tu fichaje quedó guardado con la hora del escaneo ({hora}){res.asistencia === 'Tardanza' ? ` como tardanza de ${res.minutosTarde} min` : ' como presente'} y queda <strong>pendiente de validar</strong>. Se confirma cuando haya señal.</span></div>
  if (res.estado === 'registrado' && res.asistencia === 'Presente') return <div className="result-banner success" role="status"><CheckCircle2 size={18} /><span>Asistencia registrada a las {hora}. ¡Buen día!{pie}</span></div>
  if (res.estado === 'registrado') return <div className="result-banner warning" role="status"><Clock3 size={18} /><span>Registrada a las {hora}: llegaste <strong>{res.minutosTarde} min tarde</strong> (tolerancia hasta las {res.limiteTardanza}). <strong>Se generó una alerta de tardanza</strong> para preceptoría y administración.{pie}</span></div>
  const texto = res.estado === 'qr_invalido' ? `${res.horario.detalle}. Escaneá el código vigente que está en la puerta (lo genera el administrador).`
    : res.estado === 'rechazado' ? 'No se registró la asistencia. Acercate a la escuela, conectate a su Wi-Fi y reintentá.'
    : res.estado === 'sin_horario' ? 'No tenés horario cargado ese día, así que no corresponde fichar.'
    : res.estado === 'muy_temprano' ? `Todavía no se puede fichar: se habilita a las ${res.desde}.`
    : `Pasó el plazo de fichaje (hasta las ${res.hasta}). La jornada se considera ausente: avisá a administración.`
  return <div className="result-banner danger" role="status"><XCircle size={18} /><span>{texto}</span></div>
}

'use client'

import { useState } from 'react'
import { Check, Clock3, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import { Avatar, PageHeading, StatusBadge } from './shared'
import { PantallaIngreso, QrAcciones, QrImagen, textoQrFijo } from './qr'
import { useDemoBus } from '@/lib/demo-bus'
import { CONFIG_INICIAL, DIAS, TIPO_LABEL, aplicaTardanza, sumarMin, type Clase, type ConfigDemo, type DiaSemana, type HorarioPersona, type Persona, type RolConHorario } from '@/lib/fichaje'

const clon = <T,>(x: T): T => JSON.parse(JSON.stringify(x))
const resumen = (h: HorarioPersona) => {
  const act = DIAS.filter(d => h[d.id])
  if (!act.length) return 'Sin horario'
  const igual = act.every(d => h[d.id]!.entrada === h[act[0].id]!.entrada && h[d.id]!.salida === h[act[0].id]!.salida)
  return igual ? `${act.map(d => d.corto).join(', ')} · ${h[act[0].id]!.entrada} a ${h[act[0].id]!.salida}` : act.map(d => `${d.corto} ${h[d.id]!.entrada}-${h[d.id]!.salida}`).join(' · ')
}

/** Módulo de Configuración del Administrador: reglas de fichaje, ubicación, QR y horarios del personal. */
export function ConfigDemoView({ onNotify }: { onNotify: (m: string) => void }) {
  const bus = useDemoBus()
  const guardada = bus?.config ?? CONFIG_INICIAL
  const [draft, setDraft] = useState<ConfigDemo>(() => clon(guardada))
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [nuevaRed, setNuevaRed] = useState('')
  const [editando, setEditando] = useState<RolConHorario | null>(null)
  const [editClases, setEditClases] = useState<Persona | null>(null)
  const [regen, setRegen] = useState(false)
  const [pantalla, setPantalla] = useState(false)
  const sucio = JSON.stringify(draft) !== JSON.stringify(guardada)
  const r = draft.reglas
  const setR = (p: Partial<ConfigDemo['reglas']>) => { setDraft(d => ({ ...d, reglas: { ...d.reglas, ...p } })); setErrores({}) }
  const num = (v: string) => (v === '' ? NaN : Math.round(Number(v)))

  const validar = () => {
    const e: Record<string, string> = {}
    if (!(r.tolerancia >= 0 && r.tolerancia <= 60)) e.tolerancia = 'Ingresá un número de 0 a 60 minutos.'
    if (!(r.minutosAntes >= 0 && r.minutosAntes <= 60)) e.minutosAntes = 'Ingresá un número de 0 a 60 minutos.'
    if (!(r.minutosDespues >= 30 && r.minutosDespues <= 480)) e.minutosDespues = 'Ingresá un número de 30 a 480 minutos.'
    if (r.minutosDespues <= r.tolerancia) e.minutosDespues = 'El plazo máximo debe ser mayor que la tolerancia.'
    if (!(r.tiempoMaximo >= 1 && r.tiempoMaximo <= 10)) e.tiempoMaximo = 'Ingresá de 1 a 10 segundos.'
    if (!r.lugar.trim()) e.lugar = 'Indicá el nombre del lugar.'
    if (!(r.radio >= 20 && r.radio <= 2000)) e.radio = 'Ingresá un radio de 20 a 2000 metros.'
    if (!r.redes.length) e.redes = 'Agregá al menos una red Wi-Fi autorizada.'
    setErrores(e)
    return Object.keys(e).length === 0
  }
  const guardar = () => {
    if (!validar()) { onNotify('Revisá los campos marcados antes de guardar.'); return }
    bus?.setConfig(clon(draft))
    onNotify('Configuración guardada. Se aplica desde el próximo fichaje.')
  }
  const agregarRed = () => {
    const n = nuevaRed.trim()
    if (!n) { setErrores({ redes: 'Escribí el nombre de la red.' }); return }
    if (r.redes.some(x => x.toLowerCase() === n.toLowerCase())) { setErrores({ redes: 'Esa red ya está en la lista.' }); return }
    setR({ redes: [...r.redes, n] }); setNuevaRed('')
  }
  const campo = (k: keyof ConfigDemo['reglas'], label: string, sufijo: string, ayuda: string, min?: number, max?: number) => (
    <label className="cfg-field">{label}
      <span className="cfg-num"><input type="number" inputMode="numeric" min={min} max={max} value={Number.isNaN(r[k] as number) ? '' : (r[k] as number)} aria-invalid={!!errores[k]} onChange={e => setR({ [k]: num(e.target.value) } as never)} /><em>{sufijo}</em></span>
      <small>{ayuda}</small>{errores[k] && <span role="alert" className="field-error">{errores[k]}</span>}
    </label>)

  const ejemploEntrada = '08:00'
  return <>
    <PageHeading eyebrow="SISTEMA" title="Configuración" description="Definí cuándo se considera tarde, desde dónde se puede fichar y los horarios de cada persona. El sistema decide solo con estas reglas."
      action={<div className="heading-actions"><button className="button secondary" disabled={!sucio} onClick={() => { setDraft(clon(guardada)); setErrores({}) }}><RotateCcw size={16} />Descartar</button><button className="button primary" disabled={!sucio} onClick={guardar}><Check size={16} />Guardar cambios</button></div>} />
    {sucio && <p className="dirty-bar" role="status">Tenés cambios sin guardar.</p>}

    <section className="panel cfg-sec"><div className="panel-header"><div><h2>Reglas de horario</h2><p>Cómo se compara la hora del fichaje con la entrada de cada persona</p></div></div>
      <div className="cfg-body">
        <div className="cfg-grid">
          {campo('minutosAntes', 'Se puede fichar desde', 'min antes de la entrada', 'Antes de ese margen el sistema no deja registrar.', 0, 60)}
          {campo('tolerancia', 'Tolerancia de tardanza', 'min después de la entrada', 'Hasta ese margen se considera "a horario".', 0, 60)}
          {campo('minutosDespues', 'Plazo máximo para fichar', 'min después de la entrada', 'Pasado ese plazo la jornada se considera ausente.', 30, 480)}
        </div>
        <div className="cfg-ejemplo"><Clock3 size={16} /><div><strong>Ejemplo con entrada a las {ejemploEntrada}</strong>
          <ul><li>Desde las <b>{sumarMin(ejemploEntrada, -(r.minutosAntes || 0))}</b> se puede fichar.</li><li>Hasta las <b>{sumarMin(ejemploEntrada, r.tolerancia || 0)}</b>: <StatusBadge tone="success">Presente</StatusBadge></li><li>De las {sumarMin(ejemploEntrada, (r.tolerancia || 0) + 1)} a las <b>{sumarMin(ejemploEntrada, r.minutosDespues || 0)}</b>: <StatusBadge tone="warning">Tardanza</StatusBadge> (solo docentes y preceptores)</li><li>Después: <StatusBadge tone="danger">Ausente</StatusBadge></li></ul></div></div>
        <p className="muted-cell">Los administrativos solo tienen Presente o Ausente: no se les aplica tardanza.</p>
      </div></section>

    <section className="panel cfg-sec"><div className="panel-header"><div><h2>Ubicación y redes</h2><p>Desde dónde se acepta un fichaje</p></div></div>
      <div className="cfg-body">
        <div className="cfg-grid two">
          <label className="cfg-field">Nombre del lugar<input value={r.lugar} aria-invalid={!!errores.lugar} onChange={e => setR({ lugar: e.target.value })} />{errores.lugar && <span role="alert" className="field-error">{errores.lugar}</span>}</label>
          {campo('radio', 'Radio permitido', 'metros', 'Distancia máxima a la escuela (GPS del celular).', 20, 2000)}
        </div>
        <div className="cfg-grid two">
          <label className="cfg-field">Cómo se valida el fichaje<select value={r.modo} onChange={e => setR({ modo: e.target.value as 'una' | 'ambas' })}><option value="una">Alcanza con GPS o Wi-Fi (recomendado)</option><option value="ambas">Deben validar GPS y Wi-Fi</option></select><small>Con “GPS o Wi-Fi”, se acepta apenas una de las dos lo confirma: es más rápido y evita bloquear a quien tiene una falla.</small></label>
          {campo('tiempoMaximo', 'Espera máxima de validación', 'segundos', 'Si no responde en ese tiempo, el fichaje se guarda igual con la hora del escaneo y se confirma después.', 1, 10)}
        </div>
        <div className="cfg-field"><span>Redes Wi-Fi autorizadas</span>
          <ul className="redes">{r.redes.map(n => <li key={n}><span>{n}</span><button className="mini-btn bad" aria-label={`Quitar la red ${n}`} onClick={() => setR({ redes: r.redes.filter(x => x !== n) })}><Trash2 size={12} /></button></li>)}</ul>
          <div className="redes-add"><input value={nuevaRed} onChange={e => { setNuevaRed(e.target.value); setErrores({}) }} placeholder="Nombre de la red (SSID)" aria-label="Nombre de la nueva red" onKeyDown={e => e.key === 'Enter' && agregarRed()} /><button className="button secondary inline" onClick={agregarRed}><Plus size={15} />Agregar</button></div>
          {errores.redes && <span role="alert" className="field-error">{errores.redes}</span>}
        </div>
      </div></section>

    <section className="panel cfg-sec"><div className="panel-header"><div><h2>Código QR de ingreso</h2><p>Lo genera el administrador. El personal solo lo escanea con su celular.</p></div></div>
      <div className="cfg-body">
        <fieldset className="radios qr-modos"><legend>Tipo de código</legend>
          <label className={`modo-card ${r.qrModo === 'fijo' ? 'on' : ''}`}><input type="radio" name="qrmodo" checked={r.qrModo === 'fijo'} onChange={() => setR({ qrModo: 'fijo' })} /><span><strong>Fijo (recomendado)</strong><small>Se imprime una sola vez y se pega en la puerta. No hay que volver a imprimirlo todos los días.</small></span></label>
          <label className={`modo-card ${r.qrModo === 'pantalla' ? 'on' : ''}`}><input type="radio" name="qrmodo" checked={r.qrModo === 'pantalla'} onChange={() => setR({ qrModo: 'pantalla' })} /><span><strong>Rotativo en pantalla</strong><small>Una tablet fija en la puerta muestra un código que se renueva solo cada 30 s. No se imprime nada y una foto no sirve.</small></span></label>
        </fieldset>
        {r.qrModo === 'fijo' ? <div className="qr-cfg"><div className="qr-box small"><QrImagen texto={textoQrFijo(r.lugar, r.qrVersion)} /></div><div className="qr-cfg-txt">
          <p>Código permanente <strong>versión {r.qrVersion}</strong>. Se imprime una sola vez. Solo se reimprime si se pierde, se daña o se sospecha que se compartió fuera de la escuela.</p>
          <QrAcciones lugar={r.lugar} version={r.qrVersion} onNotify={onNotify} />
          <button className="button secondary inline" onClick={() => setRegen(true)}><RotateCcw size={15} />Regenerar código</button></div></div>
          : <div className="qr-cfg-txt"><p>Dejá una tablet o pantalla fija en la entrada con la pantalla de ingreso abierta. El código cambia solo.</p><button className="button primary inline" onClick={() => setPantalla(true)}>Abrir pantalla de ingreso</button></div>}
        <p className="muted-cell">La seguridad no depende de cambiar el código: cada fichaje se valida además con la ubicación, la red Wi-Fi y el horario de la persona.</p>
      </div></section>

    <section className="panel cfg-sec table-panel"><div className="panel-header"><div><h2>Horarios por rol</h2><p>Preceptores y administrativos tienen un horario fijo, igual para todo el rol.</p></div></div>
      <div className="table-scroll"><table><thead><tr><th>ROL</th><th>PERSONAL CON ESTE ROL</th><th>HORARIO SEMANAL</th><th>TARDANZA</th><th></th></tr></thead><tbody>
        {(['preceptor', 'administrativo'] as RolConHorario[]).map(t => { const gente = draft.personal.filter(p => p.tipo === t); return <tr key={t}>
          <td><strong>{TIPO_LABEL[t]}</strong></td>
          <td><div className="avatares">{gente.map(p => <span key={p.id} title={p.nombre}><Avatar initials={p.iniciales} small /></span>)}<span className="muted-cell">{gente.length} persona{gente.length !== 1 ? 's' : ''}</span></div></td>
          <td className="muted-cell">{resumen(draft.horarios[t])}</td>
          <td><StatusBadge tone={aplicaTardanza(t) ? 'warning' : 'blue'}>{aplicaTardanza(t) ? 'Se aplica' : 'No aplica'}</StatusBadge></td>
          <td><button className="mini-btn" aria-label={`Editar el horario del rol ${TIPO_LABEL[t]}`} onClick={() => setEditando(t)}><Pencil size={13} /> Editar horario</button></td></tr> })}
      </tbody></table></div></section>

    <section className="panel cfg-sec table-panel"><div className="panel-header"><div><h2>Clases de los docentes</h2><p>Los docentes no tienen un horario fijo: van, dan sus clases y se van. El sistema mide cada fichaje contra la clase que les toca.</p></div></div>
      <div className="table-scroll"><table><thead><tr><th>DOCENTE</th><th>CLASES POR DÍA</th><th>TARDANZA</th><th></th></tr></thead><tbody>
        {draft.personal.filter(p => p.tipo === 'docente').map(p => <tr key={p.id}>
          <td><div className="person-cell"><Avatar initials={p.iniciales} small /><div><strong>{p.nombre}</strong><span>{p.cargo}</span></div></div></td>
          <td className="clases-resumen">{DIAS.filter(d => (p.clases?.[d.id] ?? []).length).length === 0 ? <span className="muted-cell">Sin clases cargadas</span> : <ul className="clases-lista">{DIAS.filter(d => (p.clases?.[d.id] ?? []).length).map(d => <li key={d.id}><b>{d.corto}</b><span>{p.clases![d.id]!.map(x => <em key={x.entrada}>{x.entrada}–{x.salida} {x.materia}</em>)}</span></li>)}</ul>}</td>
          <td><StatusBadge tone="warning">Se aplica</StatusBadge></td>
          <td><button className="mini-btn" aria-label={`Editar las clases de ${p.nombre}`} onClick={() => setEditClases(clon(p))}><Pencil size={13} /> Editar clases</button></td></tr>)}
      </tbody></table></div></section>

    {regen && <div className="modal-backdrop" onClick={() => setRegen(false)}><div className="modal" role="alertdialog" aria-modal="true" aria-label="Regenerar código QR" onClick={e => e.stopPropagation()}>
      <div className="modal-header"><div><h2>Regenerar código QR</h2><p>El código impreso actual dejará de funcionar.</p></div><button className="icon-button" aria-label="Cerrar" onClick={() => setRegen(false)}><X size={18} /></button></div>
      <div className="modal-body"><p>Vas a generar la <strong>versión {r.qrVersion + 1}</strong>. Después tendrás que imprimirla y reemplazar el código de la puerta. ¿Continuar?</p></div>
      <div className="modal-footer"><button className="button secondary" autoFocus onClick={() => setRegen(false)}>Cancelar</button><button className="button primary" onClick={() => { setR({ qrVersion: r.qrVersion + 1 }); setRegen(false); onNotify('Código regenerado. Guardá los cambios e imprimí el nuevo.') }}>Regenerar</button></div></div></div>}
    {pantalla && <PantallaIngreso lugar={r.lugar} onClose={() => setPantalla(false)} />}
    {editando && <EditorHorario rol={editando} cantidad={draft.personal.filter(p => p.tipo === editando).length} horario={draft.horarios[editando]} onClose={() => setEditando(null)} onSave={h => { setDraft(d => ({ ...d, horarios: { ...d.horarios, [editando]: h } })); setEditando(null); onNotify(`Horario del rol ${TIPO_LABEL[editando].toLowerCase()} actualizado. Recordá guardar los cambios.`) }} />}
    {editClases && <EditorClases persona={editClases} onClose={() => setEditClases(null)} onSave={cl => { setDraft(d => ({ ...d, personal: d.personal.map(p => p.id === editClases.id ? { ...p, clases: cl } : p) })); setEditClases(null); onNotify(`Clases de ${editClases.nombre} actualizadas. Recordá guardar los cambios.`) }} />}
  </>
}

function EditorHorario({ rol, cantidad, horario, onClose, onSave }: { rol: RolConHorario; cantidad: number; horario: HorarioPersona; onClose: () => void; onSave: (h: HorarioPersona) => void }) {
  const [h, setH] = useState<HorarioPersona>(clon(horario))
  const [error, setError] = useState('')
  const set = (d: (typeof DIAS)[number]['id'], p: Partial<{ entrada: string; salida: string }> | null) => { setError(''); setH(x => { const n = { ...x }; if (p === null) delete n[d]; else n[d] = { entrada: '08:00', salida: '13:00', ...n[d], ...p }; return n }) }
  const guardar = () => {
    for (const d of DIAS) { const f = h[d.id]; if (f && f.entrada >= f.salida) { setError(`El ${d.nombre.toLowerCase()}: la entrada debe ser anterior a la salida.`); return } }
    onSave(h)
  }
  const primero = DIAS.find(d => h[d.id])
  return <div className="modal-backdrop" onClick={onClose}><div className="modal wide" role="dialog" aria-modal="true" aria-label={`Horario del rol ${TIPO_LABEL[rol]}`} onClick={e => e.stopPropagation()}>
    <div className="modal-header"><div><h2>Horario del rol {TIPO_LABEL[rol]}</h2><p>Se aplica a las {cantidad} personas con este rol.</p></div><button className="icon-button" aria-label="Cerrar" onClick={onClose}><X size={18} /></button></div>
    <div className="modal-body">
      <div className="horario-editor">{DIAS.map(d => { const f = h[d.id]; return <div className="franja-row dia" key={d.id}>
        <label className="check-inline"><input type="checkbox" checked={!!f} onChange={e => set(d.id, e.target.checked ? {} : null)} /> <strong>{d.nombre}</strong></label>
        {f ? <><input type="time" aria-label={`Entrada del ${d.nombre}`} value={f.entrada} onChange={e => set(d.id, { entrada: e.target.value })} /><span>a</span><input type="time" aria-label={`Salida del ${d.nombre}`} value={f.salida} onChange={e => set(d.id, { salida: e.target.value })} /></> : <span className="muted-cell">No trabaja</span>}
      </div> })}</div>
      {primero && <div className="cfg-body"><button className="button secondary inline" onClick={() => { const f = h[primero.id]!; setH(Object.fromEntries(DIAS.map(d => [d.id, { ...f }])) as HorarioPersona) }}>Copiar el {primero.nombre.toLowerCase()} a toda la semana</button></div>}
      {error && <p role="alert" className="form-error">{error}</p>}
    </div>
    <div className="modal-footer"><button className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary" onClick={guardar}><Check size={16} />Aplicar horario</button></div>
  </div></div>
}

function EditorClases({ persona, onClose, onSave }: { persona: Persona; onClose: () => void; onSave: (c: Partial<Record<DiaSemana, Clase[]>>) => void }) {
  const [cl, setCl] = useState<Partial<Record<DiaSemana, Clase[]>>>(clon(persona.clases ?? {}))
  const [error, setError] = useState('')
  const lista = (d: DiaSemana) => cl[d] ?? []
  const setDia = (d: DiaSemana, l: Clase[]) => { setError(''); setCl(x => { const n = { ...x }; if (l.length) n[d] = l; else delete n[d]; return n }) }
  const guardar = () => {
    for (const d of DIAS) {
      const l = [...lista(d.id)].sort((a, b) => a.entrada.localeCompare(b.entrada))
      for (let i = 0; i < l.length; i++) {
        if (!l[i].materia.trim()) { setError(`El ${d.nombre.toLowerCase()}: escribí la materia de cada clase.`); return }
        if (l[i].entrada >= l[i].salida) { setError(`El ${d.nombre.toLowerCase()}: la entrada debe ser anterior a la salida.`); return }
        if (i > 0 && l[i].entrada < l[i - 1].salida) { setError(`El ${d.nombre.toLowerCase()}: dos clases se superponen.`); return }
      }
    }
    onSave(cl)
  }
  return <div className="modal-backdrop" onClick={onClose}><div className="modal wide" role="dialog" aria-modal="true" aria-label={`Clases de ${persona.nombre}`} onClick={e => e.stopPropagation()}>
    <div className="modal-header"><div><h2>Clases de {persona.nombre}</h2><p>El docente ficha cuando llega a dar cada clase. No tiene horario fijo.</p></div><button className="icon-button" aria-label="Cerrar" onClick={onClose}><X size={18} /></button></div>
    <div className="modal-body"><div className="horario-editor">{DIAS.map(d => <div className="dia-bloque" key={d.id}>
      <div className="dia-cab"><strong>{d.nombre}</strong><button type="button" className="mini-btn" onClick={() => setDia(d.id, [...lista(d.id), { entrada: '08:00', salida: '09:20', materia: '' }])}><Plus size={12} /> Agregar clase</button></div>
      {lista(d.id).length === 0 && <span className="muted-cell">Sin clases</span>}
      {lista(d.id).map((c, i) => <div className="franja-row" key={i}>
        <input type="time" aria-label={`Entrada de la clase ${i + 1} del ${d.nombre}`} value={c.entrada} onChange={e => setDia(d.id, lista(d.id).map((x, j) => j === i ? { ...x, entrada: e.target.value } : x))} /><span>a</span>
        <input type="time" aria-label={`Salida de la clase ${i + 1} del ${d.nombre}`} value={c.salida} onChange={e => setDia(d.id, lista(d.id).map((x, j) => j === i ? { ...x, salida: e.target.value } : x))} />
        <input type="text" aria-label="Materia y curso" placeholder="Materia y curso (ej. Lengua 3° A)" value={c.materia} onChange={e => setDia(d.id, lista(d.id).map((x, j) => j === i ? { ...x, materia: e.target.value } : x))} />
        <button type="button" className="mini-btn bad" aria-label="Quitar clase" onClick={() => setDia(d.id, lista(d.id).filter((_, j) => j !== i))}><Trash2 size={12} /></button>
      </div>)}
    </div>)}</div>{error && <p role="alert" className="form-error">{error}</p>}</div>
    <div className="modal-footer"><button className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary" onClick={guardar}><Check size={16} />Aplicar clases</button></div>
  </div></div>
}

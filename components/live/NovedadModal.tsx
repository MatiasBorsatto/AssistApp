'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Trash2, X } from 'lucide-react'
import { useLive, type DocenteDia } from './LiveContext'
import { StatusBadge } from '../shared'
import {
  bloqueContiguo, borrarNovedades, guardarNovedad, novedadesDocenteFecha, setDocsEntregados,
} from '@/lib/repo'
import { TIPOS_CON_VENCIMIENTO } from '@/lib/alertas'
import {
  DIA_NOMBRE, DIAS_KEYS, LABELS, TIPOS_CON_DOCS, TIPOS_LICENCIA, TIPOS_MEDICOS, TIPOS_RANGO, TIPO_TONO, etiquetaTipo, tiposPermitidos,
  etiquetaDocs, fechaDate, fechasHabiles, hoyStr, nombreMostrar, normalizarFranjas, siguientesHabiles, hsCatedraDia,
  type Novedad, type TipoNovedad,
} from '@/lib/domain'

type Duracion = 'dia' | 'rango' | 'dias'

/** Registro de novedades de un docente: portado de "MODAL NOVEDAD" de assistapp2. */
export function NovedadModal({ docente, fechaInicial, onClose }: { docente: DocenteDia; fechaInicial: string; onClose: () => void }) {
  const { anio, recargar, backup, notify, puedeEditar } = useLive()
  const [fecha, setFecha] = useState(fechaInicial)
  const [registros, setRegistros] = useState<Novedad[]>([])
  const [cargando, setCargando] = useState(true)
  const [tipo, setTipo] = useState<TipoNovedad | null>(null)
  const [dur, setDur] = useState<Duracion>('dia')
  const [hasta, setHasta] = useState('')
  const [licDesde, setLicDesde] = useState(fechaInicial)
  const [licHasta, setLicHasta] = useState('')
  const [cantDias, setCantDias] = useState(1)
  const [parcial, setParcial] = useState(false)
  const [modulosSel, setModulosSel] = useState<number[]>([])
  const [comentario, setComentario] = useState('')
  const [medico, setMedico] = useState('')
  const [matricula, setMatricula] = useState('')
  const [compensa, setCompensa] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const franjasDia = useCallback((f: string) => {
    const key = DIAS_KEYS[fechaDate(f).getDay()]
    return normalizarFranjas(docente.horario[key]).sort((a, b) => (a.entrada < b.entrada ? -1 : 1))
  }, [docente.horario])
  const franjas = franjasDia(fecha)
  const diaNom = DIA_NOMBRE[fechaDate(fecha).getDay()]

  const cargar = useCallback(async () => {
    setCargando(true)
    try { setRegistros(await novedadesDocenteFecha(docente.id, fecha)) } catch (e) { setError((e as Error).message) } finally { setCargando(false) }
  }, [docente.id, fecha])
  useEffect(() => { cargar() }, [cargar])

  const principal = registros.find(r => r.tipo !== 'justificada_parcial' && r.tipo !== 'injustificada_parcial') || registros[registros.length - 1]
  const reset = () => { setTipo(null); setDur('dia'); setHasta(''); setLicDesde(fecha); setLicHasta(''); setCantDias(1); setParcial(false); setModulosSel([]); setComentario(''); setMedico(''); setMatricula(''); setCompensa(''); setError('') }

  const elegir = (t: TipoNovedad) => {
    reset()
    setTipo(t)
    if (t === 'justificada_parcial' || t === 'injustificada_parcial') setParcial(true)
  }

  const esFaltaTipo = tipo === 'justificada' || tipo === 'injustificada' || tipo === 'justificada_parcial' || tipo === 'injustificada_parcial'
  const baseFalta = tipo === 'justificada' || tipo === 'justificada_parcial' ? 'justificada' : 'injustificada'

  const confirmar = async () => {
    if (!tipo) return
    let tipoFinal: TipoNovedad = tipo
    let fechas = [fecha]
    if (TIPOS_LICENCIA.includes(tipo)) {
      if (!licDesde) { setError('Indicá el día de comienzo.'); return }
      if (!licHasta) { setError('Indicá el día de finalización.'); return }
      if (licHasta < licDesde) { setError('La finalización no puede ser anterior al comienzo.'); return }
      fechas = fechasHabiles(licDesde, licHasta)
      if (!fechas.length) { setError('El período no incluye días hábiles.'); return }
    } else if (tipo !== 'adelanto' && tipo !== 'jubilacion') {
      if (dur === 'rango' && hasta && hasta >= fecha) {
        fechas = fechasHabiles(fecha, hasta)
        if (!fechas.length) { setError('El rango no tiene días hábiles.'); return }
      } else if (dur === 'dias') fechas = siguientesHabiles(fecha, Math.max(1, cantDias))
    }
    let modulos: string[] = []
    if (esFaltaTipo) {
      if (parcial) {
        tipoFinal = (baseFalta === 'justificada' ? 'justificada_parcial' : 'injustificada_parcial')
        modulos = modulosSel.map(i => franjas[i]).filter(Boolean).map(f => `${f.entrada.slice(0, 5)}-${f.salida.slice(0, 5)}${f.materia ? ' ' + f.materia : ''}`)
        if (!modulos.length) { setError('Seleccioná al menos un módulo.'); return }
      } else tipoFinal = baseFalta
    }
    setGuardando(true); setError('')
    try {
      await guardarNovedad(docente.id, {
        tipo: tipoFinal, fechas, anio, comentario: esFaltaTipo ? comentario.trim() || undefined : undefined,
        modulo: modulos[0], modulos, medicoNombre: TIPOS_MEDICOS.includes(tipoFinal) ? medico.trim() || undefined : undefined,
        matriculaMedico: TIPOS_MEDICOS.includes(tipoFinal) ? matricula.trim() || undefined : undefined,
        compensaFecha: tipoFinal === 'adelanto' ? compensa || undefined : undefined,
        durVence: fechas.length > 1 && TIPOS_CON_VENCIMIENTO.includes(tipoFinal) ? fechas[fechas.length - 1] : undefined,
        franjasTotalPorFecha: f => franjasDia(f).length || 1,
      })
      backup(`Registrar ${tipoFinal} — ${docente.nombre} ${fecha}`)
      notify(fechas.length > 1 ? `${LABELS[tipoFinal]} registrada para ${fechas.length} días (${fechas[0]} → ${fechas[fechas.length - 1]}).` : `${docente.nombre} — ${LABELS[tipoFinal]}`)
      reset()
      await cargar()
      await recargar()
    } catch (e) {
      const m = (e as Error).message
      setError(m === 'same' ? `Ya está registrado como ${LABELS[tipoFinal]}.` : m)
    } finally { setGuardando(false) }
  }

  const borrar = async (reg: Novedad) => {
    try {
      let ids = [reg.id]
      let msg = '¿Borrar este registro?'
      if (TIPOS_RANGO.includes(reg.tipo)) {
        const bloque = await bloqueContiguo(reg)
        if (bloque.length > 1) {
          const rango = `${bloque[0].fecha} → ${bloque[bloque.length - 1].fecha}`
          if (window.confirm(`Este registro ("${LABELS[reg.tipo]}") abarca ${bloque.length} días (${rango}).\n\nAceptar → borrar TODOS los días\nCancelar → borrar solo el día ${reg.fecha}`)) { ids = bloque.map(b => b.id); msg = '' }
          else msg = ''
        }
      }
      if (msg && !window.confirm(msg)) return
      await borrarNovedades(ids)
      backup(`Eliminar registro — ${docente.nombre} ${reg.fecha}`)
      notify(ids.length > 1 ? `Registro eliminado (${ids.length} días).` : 'Registro eliminado.')
      await cargar(); await recargar()
    } catch (e) { setError((e as Error).message) }
  }

  const toggleDocs = async (reg: Novedad) => {
    try { await setDocsEntregados(reg.id, !reg.docsEntregados); notify(!reg.docsEntregados ? 'Documentación marcada como entregada.' : 'Documentación desmarcada.'); await cargar() } catch (e) { setError((e as Error).message) }
  }

  const necesitaDocs = principal && TIPOS_CON_DOCS.includes(principal.tipo)
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" role="dialog" aria-modal="true" aria-label="Registrar novedad" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div><h2>{nombreMostrar(docente)}</h2><p>{docente.cargo || 'Sin cargo'} · Registrar novedad</p></div>
          <button className="icon-button" aria-label="Cerrar" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="nov-toolbar">
            <label>Fecha<input type="date" value={fecha} onChange={e => { setFecha(e.target.value || hoyStr()); reset() }} /></label>
            <button className="mini-btn" onClick={() => { setFecha(hoyStr()); reset() }}>Hoy</button>
          </div>
          <div className={`nov-horario ${franjas.length ? 'on' : ''}`}>
            {franjas.length
              ? <><strong>{diaNom}:</strong> {franjas.map((f, i) => <span className="attach-chip" key={i}>{f.entrada.slice(0, 5)}–{f.salida.slice(0, 5)}</span>)}<em>{Math.round(hsCatedraDia(franjas))} hc</em></>
              : <><strong>{diaNom}:</strong> no tiene horario este día</>}
          </div>

          <div className="nov-estado" aria-live="polite">
            {cargando ? <span className="muted-cell">Cargando…</span> : registros.length ? registros.map(r => (
              <div className="nov-estado-row" key={r.id}>
                <StatusBadge tone={TIPO_TONO[r.tipo] === 'neutral' ? 'blue' : TIPO_TONO[r.tipo]}>{etiquetaTipo(r.tipo, docente)}</StatusBadge>{r.durVence && r.durVence !== r.fecha && <span className="muted-cell">hasta {r.durVence}</span>}
                {r.modulo && <span className="muted-cell">{r.modulo}</span>}
                {r.obs && <span className="muted-cell">— {r.obs}</span>}
                {puedeEditar && TIPOS_CON_DOCS.includes(r.tipo) && (
                  <label className={`docs-check ${r.docsEntregados ? 'on' : ''}`}><input type="checkbox" checked={!!r.docsEntregados} onChange={() => toggleDocs(r)} /> {etiquetaDocs(r.tipo)}</label>
                )}
                {puedeEditar && <button className="mini-btn bad" onClick={() => borrar(r)}><Trash2 size={12} /> Borrar</button>}
              </div>
            )) : <span className="muted-cell">Sin registro para el {fecha}.</span>}
            {necesitaDocs && !puedeEditar && null}
          </div>

          {puedeEditar ? <>
            <div className="nov-grid" role="group" aria-label="Tipo de novedad">
              {tiposPermitidos(docente).map(t => (
                <button key={t} type="button" className={`nov-btn ${tipo === t ? 'sel' : ''} ${principal?.tipo === t ? 'actual' : ''}`} aria-pressed={tipo === t} onClick={() => elegir(t)}>
                  {etiquetaTipo(t, docente)}{principal?.tipo === t && <small>✓ Actual</small>}
                </button>
              ))}
            </div>

            {tipo && <div className="nov-opciones">
              <h3>{etiquetaTipo(tipo, docente)}</h3>
              {tipo === 'adelanto' ? (
                <label>Fecha en que compensa (opcional)<input type="date" value={compensa} onChange={e => setCompensa(e.target.value)} /></label>
              ) : TIPOS_LICENCIA.includes(tipo) ? (
                <div className="form-row">
                  <label>Día de comienzo *<input type="date" value={licDesde} onChange={e => { setLicDesde(e.target.value); setError('') }} /></label>
                  <label>Día de finalización *<input type="date" value={licHasta} min={licDesde} onChange={e => { setLicHasta(e.target.value); setError('') }} /></label>
                </div>
              ) : tipo === 'jubilacion' ? (
                <label>Día de comienzo *<input type="date" value={fecha} readOnly aria-readonly="true" /></label>
              ) : <>
                <fieldset className="radios"><legend>Duración</legend>
                  <label><input type="radio" name="dur" checked={dur === 'dia'} onChange={() => setDur('dia')} /> Solo este día</label>
                  <label><input type="radio" name="dur" checked={dur === 'rango'} onChange={() => setDur('rango')} /> Hasta una fecha</label>
                  <label><input type="radio" name="dur" checked={dur === 'dias'} onChange={() => setDur('dias')} /> Cantidad de días</label>
                </fieldset>
                {dur === 'rango' && <label>Hasta<input type="date" value={hasta} min={fecha} onChange={e => setHasta(e.target.value)} /></label>}
                {dur === 'dias' && <label>Días hábiles<input type="number" min={1} max={365} value={cantDias} onChange={e => setCantDias(parseInt(e.target.value) || 1)} /></label>}
              </>}

              {esFaltaTipo && <>
                <fieldset className="radios"><legend>Alcance</legend>
                  <label><input type="radio" name="alc" checked={!parcial} onChange={() => setParcial(false)} /> Falta completa</label>
                  <label><input type="radio" name="alc" checked={parcial} onChange={() => setParcial(true)} /> Falta parcial (módulos)</label>
                </fieldset>
                {parcial && <div className="modulos">
                  {franjas.length ? franjas.map((f, i) => (
                    <label className="modulo-chip" key={i}><input type="checkbox" checked={modulosSel.includes(i)} onChange={e => setModulosSel(s => e.target.checked ? [...s, i] : s.filter(x => x !== i))} /> {f.entrada.slice(0, 5)}–{f.salida.slice(0, 5)}{f.materia ? ` (${f.materia})` : ''}</label>
                  )) : <span className="muted-cell">No hay franjas cargadas para este día.</span>}
                </div>}
                <label>Comentario<input value={comentario} onChange={e => setComentario(e.target.value)} placeholder="Opcional" /></label>
              </>}

              {TIPOS_MEDICOS.includes(tipo) && <div className="form-row">
                <label>Médico<input value={medico} onChange={e => setMedico(e.target.value)} placeholder="Nombre del profesional" /></label>
                <label>Matrícula<input value={matricula} onChange={e => setMatricula(e.target.value)} placeholder="N.º de matrícula" /></label>
              </div>}

              {error && <p role="alert" className="form-error">{error}</p>}
              <div className="nov-actions">
                <button className="button secondary" onClick={reset}>Cancelar</button>
                <button className="button primary" disabled={guardando} onClick={confirmar}><Check size={16} />{guardando ? 'Guardando…' : 'Confirmar'}</button>
              </div>
            </div>}
          </> : <p className="empty-state">Tu rol es de solo lectura: no podés registrar novedades.</p>}
          {!tipo && error && <p role="alert" className="form-error">{error}</p>}
        </div>
        <div className="modal-footer"><button className="button secondary" onClick={onClose}>Cerrar</button></div>
      </div>
    </div>
  )
}

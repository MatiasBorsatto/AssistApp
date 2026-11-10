'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { PageHeading } from './shared'
import { aIso, eventosDelDia, resumenCiclo, semanasDelMes, tipoDia, type Evento, type TipoDia } from '@/lib/calendario'
import type { ConfigDemo } from '@/lib/fichaje'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const NOMBRE_TIPO: Record<TipoDia, string> = { clase: 'Día de clases', feriado: 'Feriado o receso', finde: 'Fin de semana', fuera: 'Fuera del ciclo lectivo' }
const larga = (iso: string) => { const s = new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); return s.charAt(0).toUpperCase() + s.slice(1) }

/** Calendario del ciclo lectivo: muestra qué días hay clases, los feriados y las ausencias o licencias del perfil. */
export function CalendarioView({ config, eventos, titulo = 'Calendario del ciclo lectivo', descripcion, extraDia }: {
  config: ConfigDemo
  eventos: Evento[]
  titulo?: string
  descripcion?: string
  /** Información adicional de un día (por ejemplo, las clases de un docente) */
  extraDia?: (iso: string) => string[]
}) {
  const hoy = aIso(new Date())
  const ini = new Date(config.ciclo.inicio + 'T12:00:00')
  const inicial = hoy >= config.ciclo.inicio && hoy <= config.ciclo.fin ? new Date() : ini
  const [vista, setVista] = useState<'mes' | 'ciclo'>('mes')
  const [anio, setAnio] = useState(inicial.getFullYear())
  const [mes, setMes] = useState(inicial.getMonth())
  const [sel, setSel] = useState(hoy)
  const resumen = useMemo(() => resumenCiclo(config, hoy), [config, hoy])

  const mover = (d: number) => { const n = new Date(anio, mes + d, 1); setAnio(n.getFullYear()); setMes(n.getMonth()) }
  const irHoy = () => { const n = new Date(); setAnio(n.getFullYear()); setMes(n.getMonth()); setSel(hoy) }
  const info = tipoDia(config, sel)
  const delDia = eventosDelDia(eventos, sel)
  const extra = extraDia?.(sel) ?? []

  // Meses que abarca el ciclo (para la vista completa)
  const meses = useMemo(() => {
    const out: { a: number; m: number }[] = []
    const fin = new Date(config.ciclo.fin + 'T12:00:00')
    for (let a = ini.getFullYear(), m = ini.getMonth(); a < fin.getFullYear() || (a === fin.getFullYear() && m <= fin.getMonth()); m++) { if (m > 11) { m = 0; a++ } out.push({ a, m }); if (a === fin.getFullYear() && m === fin.getMonth()) break }
    return out
  }, [config.ciclo.fin, ini])

  const celda = (iso: string, mini = false) => {
    const t = tipoDia(config, iso)
    const ev = eventosDelDia(eventos, iso)
    return <button key={iso} type="button" className={`dia ${t.tipo} ${iso === hoy ? 'hoy' : ''} ${iso === sel ? 'sel' : ''} ${mini ? 'mini' : ''}`} onClick={() => { setSel(iso); if (mini) { const d = new Date(iso + 'T12:00:00'); setAnio(d.getFullYear()); setMes(d.getMonth()); setVista('mes') } }}
      aria-label={`${larga(iso)}. ${NOMBRE_TIPO[t.tipo]}${t.nombre ? `: ${t.nombre}` : ''}${ev.length ? `. ${ev.length} ${ev.length === 1 ? 'evento' : 'eventos'}` : ''}`} aria-pressed={iso === sel}>
      <span className="dn">{new Date(iso + 'T12:00:00').getDate()}</span>
      {!mini && t.nombre && <small className="dnom">{t.nombre}</small>}
      {!mini && ev.slice(0, 2).map((e, i) => <span key={i} className={`ev ${e.tone}`}>{e.titulo}</span>)}
      {!mini && ev.length > 2 && <span className="ev mas">+{ev.length - 2} más</span>}
      {mini && ev.length > 0 && <i className="punto" />}
    </button>
  }

  return <>
    <PageHeading eyebrow="CALENDARIO" title={titulo} description={descripcion ?? 'Mirá qué días hay clases, los feriados y los recesos. Tocá un día para ver el detalle.'} />

    <section className="panel ciclo-resumen" aria-label="Resumen del ciclo lectivo">
      <div><strong className="ciclo-num">{resumen.pasados}<small> de {resumen.total}</small></strong><span>días de clase transcurridos</span></div>
      <div className="ciclo-barra" role="progressbar" aria-valuenow={resumen.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Avance del ciclo lectivo"><span style={{ width: `${resumen.pct}%` }} /></div>
      <div className="ciclo-fechas"><span><b>Comienzo</b> {larga(config.ciclo.inicio).split(',').slice(1).join(',').trim()}</span><span><b>Fin</b> {larga(config.ciclo.fin).split(',').slice(1).join(',').trim()}</span><span><b>Quedan</b> {resumen.restantes} días de clase</span></div>
    </section>

    <div className="cal-controles">
      <div className="tabs" role="tablist" aria-label="Vista del calendario">
        <button role="tab" aria-selected={vista === 'mes'} className={vista === 'mes' ? 'on' : ''} onClick={() => setVista('mes')}>Mes</button>
        <button role="tab" aria-selected={vista === 'ciclo'} className={vista === 'ciclo' ? 'on' : ''} onClick={() => setVista('ciclo')}>Todo el ciclo</button>
      </div>
      {vista === 'mes' && <div className="cal-nav"><button className="icon-button" aria-label="Mes anterior" onClick={() => mover(-1)}><ChevronLeft size={18} /></button><strong aria-live="polite">{MESES[mes]} {anio}</strong><button className="icon-button" aria-label="Mes siguiente" onClick={() => mover(1)}><ChevronRight size={18} /></button><button className="mini-btn" onClick={irHoy}>Hoy</button></div>}
    </div>

    <div className="cal-layout">
      <section className="panel cal-panel">
        {vista === 'mes' ? <div className="cal-mes" role="group" aria-label={`${MESES[mes]} ${anio}`}>
          <div className="cal-cab" aria-hidden="true">{DIAS.map(d => <span key={d}>{d}</span>)}</div>
          {semanasDelMes(anio, mes).map((sem, i) => <div className="cal-sem" key={i}>{sem.map((iso, j) => iso ? celda(iso) : <span key={j} className="dia vacio" aria-hidden="true" />)}</div>)}
        </div> : <div className="cal-ciclo">{meses.map(({ a, m }) => <div className="mini-mes" key={`${a}-${m}`}>
          <button className="mini-mes-t" onClick={() => { setAnio(a); setMes(m); setVista('mes') }}>{MESES[m]} {a !== meses[0].a ? a : ''}</button>
          <div className="cal-cab mini">{DIAS.map(d => <span key={d}>{d[0]}</span>)}</div>
          {semanasDelMes(a, m).map((sem, i) => <div className="cal-sem" key={i}>{sem.map((iso, j) => iso ? celda(iso, true) : <span key={j} className="dia vacio mini" aria-hidden="true" />)}</div>)}
        </div>)}</div>}
        <ul className="cal-leyenda" aria-label="Referencias">
          <li><i className="lg clase" />Día de clases</li><li><i className="lg feriado" />Feriado o receso</li><li><i className="lg finde" />Fin de semana</li><li><i className="lg fuera" />Fuera del ciclo</li><li><i className="lg hoy" />Hoy</li>
        </ul>
      </section>

      <aside className="panel cal-detalle" aria-live="polite" aria-label="Detalle del día elegido">
        <div className="panel-header"><div><h2>{larga(sel)}</h2><p>{NOMBRE_TIPO[info.tipo]}{info.nombre ? ` · ${info.nombre}` : ''}</p></div><CalendarDays size={20} /></div>
        <div className="cal-det-body">
          {extra.length > 0 && <div><h3>Tus clases</h3><ul className="cal-lista">{extra.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
          <div><h3>Ausencias y licencias</h3>{delDia.length === 0 ? <p className="muted-cell">No hay nada registrado este día.</p> : <ul className="cal-lista">{delDia.map((e, i) => <li key={i}><span className={`punto-ev ${e.tone}`} /><div><strong>{e.titulo}</strong>{e.detalle && <small>{e.detalle}</small>}</div></li>)}</ul>}</div>
          {info.tipo === 'clase' && extra.length === 0 && delDia.length === 0 && <p className="ayuda-form">Día normal de clases.</p>}
        </div>
      </aside>
    </div>
  </>
}

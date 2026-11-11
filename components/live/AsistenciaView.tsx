'use client'

import { useMemo, useState } from 'react'
import { AlertCircle, CalendarDays, Check, ChevronLeft, ChevronRight, Download, Eye, Filter, Layers, PencilLine, Search, X } from 'lucide-react'
import { useLive, type DocenteDia } from './LiveContext'
import { NovedadModal } from './NovedadModal'
import { PerfilModal } from './PerfilModal'
import { Avatar, PageHeading, StatusBadge } from '../shared'
import { exportarExcel, exportarPDF } from '@/lib/export'
import { guardarNovedad, novedadesDocenteFecha } from '@/lib/repo'
import { calcularAlertas } from '@/lib/alertas'
import {
  DIA_IDX, DIAS_KEYS, LABELS, LABELS_SHORT, TIPOS, TIPO_TONO, calcDias, calcPct, diasConHorario, esAusencia, esFeriado,
  esPresenteDia, esAdministrativo, fechaDate, TIPOS_PERSONA, tipoPersona, fechaLarga, getTipoHs, hoyStr, hsDisplay, nombreMostrar, normalizarFranjas, pctTono, sumarDias, quitarTildes,
  type Nivel, type TipoNovedad,
} from '@/lib/domain'

const NIVELES: { v: Nivel | ''; l: string }[] = [{ v: '', l: 'Todos' }, { v: 'secundaria', l: 'Secundaria' }, { v: 'primaria', l: 'Primaria' }, { v: 'inicial', l: 'Inicial' }]
const tono = (t: TipoNovedad | '') => (!t ? 'success' : TIPO_TONO[t] === 'neutral' ? 'blue' : TIPO_TONO[t])

function turnos(d: DocenteDia, dow: number) {
  const fr = normalizarFranjas(d.horario[DIAS_KEYS[dow]])
  let m = false, t = false
  fr.forEach(f => { const min = parseInt(f.entrada.split(':')[0]) * 60 + parseInt(f.entrada.split(':')[1] || '0'); if (min >= 420 && min <= 779) m = true; if (min >= 780) t = true })
  return { m, t }
}

export function AsistenciaView() {
  const { docentes, config, fecha, setFecha, nivel, setNivel, grupos, cargando, error, puedeEditar, puedeVerTodo, anio, novedadesAnio } = useLive()
  const [q, setQ] = useState('')
  const [estado, setEstado] = useState('')
  const [grupo, setGrupo] = useState('')
  const [area, setArea] = useState('')
  const [tipo, setTipo] = useState('')
  const [soloHoy, setSoloHoy] = useState(true)
  const [badge, setBadge] = useState('')
  const [nov, setNov] = useState<DocenteDia | null>(null)
  const [perfil, setPerfil] = useState<DocenteDia | null>(null)
  const [masivo, setMasivo] = useState(false)
  const [alertasAbiertas, setAlertasAbiertas] = useState(false)

  const dow = fechaDate(fecha).getDay()
  const feriado = esFeriado(config, fecha)
  const nombreFeriado = config.feriados.find(f => f.fecha === fecha)?.nombre || 'Feriado'
  const delNivel = useMemo(() => docentes.filter(d => !nivel || d.nivel === nivel), [docentes, nivel])
  const areas = useMemo(() => [...new Set(delNivel.map(d => d.area).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')), [delNivel])
  const tiposPresentes = useMemo(() => TIPOS_PERSONA.filter(t => delNivel.some(d => tipoPersona(d) === t)), [delNivel])

  const debenVenir = useMemo(() => delNivel.filter(d => !d.jubilado && diasConHorario(d.horario).some(x => DIA_IDX[x] === dow)), [delNivel, dow])
  const resumen = useMemo(() => {
    const pres = debenVenir.filter(d => esPresenteDia(d.estadoHoy)).length
    const pct = (list: DocenteDia[]) => list.length ? Math.round((list.filter(d => esPresenteDia(d.estadoHoy)).length / list.length) * 100) : null
    const cnt = (t: TipoNovedad) => delNivel.filter(d => !d.jubilado && d.estadoHoy === t).length
    return {
      pct: debenVenir.length ? Math.round((pres / debenVenir.length) * 100) : 0,
      pctM: pct(debenVenir.filter(d => turnos(d, dow).m)), pctT: pct(debenVenir.filter(d => turnos(d, dow).t)),
      puros: debenVenir.filter(d => !d.estadoHoy || d.estadoHoy === 'presente').length,
      ausentes: debenVenir.filter(d => esAusencia(d.estadoHoy)).length, cnt,
    }
  }, [debenVenir, delNivel, dow])

  const lista = useMemo(() => {
    const qn = quitarTildes(q.toLowerCase())
    return delNivel.filter(d => {
      const tiene = diasConHorario(d.horario).some(x => DIA_IDX[x] === dow)
      if (q && !quitarTildes(`${d.apellido} ${d.nombre}`.toLowerCase()).includes(qn)) return false
      if (estado && (estado === 'sin-registro' ? d.estadoHoy : d.estadoHoy !== estado)) return false
      if (grupo && !d.grupos.includes(grupo)) return false
      if (area && d.area !== area) return false
      if (tipo && tipoPersona(d) !== tipo) return false
      if (soloHoy && !tiene && !badge) return false
      if (badge) {
        if (!tiene) return false
        const t = turnos(d, dow)
        if (badge === 'maniana') return t.m
        if (badge === 'tarde') return t.t
        if (badge === 'presente') return !d.estadoHoy || d.estadoHoy === 'presente'
        if (badge === 'parcial') return d.estadoHoy === 'justificada_parcial' || d.estadoHoy === 'injustificada_parcial'
        return d.estadoHoy === badge
      }
      return true
    })
  }, [delNivel, q, estado, grupo, area, tipo, soloHoy, badge, dow])

  const alertas = useMemo(() => puedeVerTodo ? calcularAlertas(docentes, novedadesAnio) : [], [puedeVerTodo, docentes, novedadesAnio])

  const exportarDia = (formato: 'xlsx' | 'pdf') => {
    const cols = ['Docente', 'Cargo', 'Nivel', 'Horario', 'Estado']
    const filas = lista.map(d => [nombreMostrar(d), d.cargo || '', d.nivel, normalizarFranjas(d.horario[DIAS_KEYS[dow]]).map(f => `${f.entrada.slice(0, 5)}-${f.salida.slice(0, 5)}`).join(' / ') || '—', LABELS[(d.estadoHoy || 'presente') as TipoNovedad]])
    const nombre = `Asistencia_${fecha}`
    if (formato === 'xlsx') exportarExcel(filas, cols, nombre); else exportarPDF('Asistencia del día', fechaLarga(fecha), cols, filas, nombre)
  }

  const chips: [string, string, number | string][] = [
    ['presente', 'Presentes', resumen.puros], ['justificada', 'Justificadas', resumen.cnt('justificada')], ['injustificada', 'Injustificadas', resumen.cnt('injustificada')],
    ['parcial', 'Parciales', resumen.cnt('justificada_parcial') + resumen.cnt('injustificada_parcial')], ['medica', 'C. Médica', resumen.cnt('medica')],
    ['lic_embarazo', 'Embarazo', resumen.cnt('lic_embarazo')], ['lic_gremial', 'Gremial', resumen.cnt('lic_gremial')], ['paro', 'Paro', resumen.cnt('paro')],
  ]

  return <>
    <PageHeading eyebrow="CONTROL DIARIO" title="Gestionar asistencia" description="Registrá las novedades del personal y seguí la asistencia del día."
      action={<div className="heading-actions">
        {puedeVerTodo && <button className="button secondary" onClick={() => setAlertasAbiertas(v => !v)} aria-expanded={alertasAbiertas}><AlertCircle size={16} />Alertas{alertas.length ? ` (${alertas.length})` : ''}</button>}
        {puedeVerTodo && <button className="button secondary" onClick={() => exportarDia('xlsx')}><Download size={16} />Excel</button>}
        {puedeVerTodo && <button className="button secondary" onClick={() => exportarDia('pdf')}><Download size={16} />PDF</button>}
        {puedeEditar && <button className="button primary" onClick={() => setMasivo(true)}><Layers size={16} />Registro masivo</button>}
      </div>} />

    {error && <p role="alert" className="form-error flow-error">No se pudieron cargar los datos: {error}</p>}

    {alertasAbiertas && <section className="panel alertas-panel" aria-label="Alertas de vencimiento">
      <div className="panel-header"><div><h2>Alertas de vencimiento</h2><p>Licencias que vencen en 7 días o tratamientos largos</p></div><button className="icon-button" aria-label="Cerrar alertas" onClick={() => setAlertasAbiertas(false)}><X size={16} /></button></div>
      {alertas.length === 0 ? <p className="empty-state">Sin vencimientos próximos.</p> : <div className="pending-list">{alertas.map(a => (
        <div className="pending-item" key={a.novedadId + a.tipo}><div className={`notification-icon ${a.esVencimiento && (a.diffDias ?? 9) <= 1 ? 'warning' : 'blue'}`}><AlertCircle size={18} /></div>
          <div><strong>{a.docenteNombre}</strong><span>{LABELS[a.tipo]} · {a.esVencimiento ? (a.diffDias === 0 ? 'Vence HOY' : a.diffDias === 1 ? 'Vence mañana' : `Vence en ${a.diffDias} días`) : `Desde ${a.fecha} (${a.diasTranscurridos} días)`}</span></div></div>
      ))}</div>}
    </section>}

    <div className="fecha-nav panel">
      <button className="icon-button" aria-label="Día anterior" onClick={() => setFecha(sumarDias(fecha, -1))}><ChevronLeft size={18} /></button>
      <div className="fecha-centro"><CalendarDays size={16} /><strong>{fechaLarga(fecha)}</strong><input type="date" aria-label="Elegir fecha" value={fecha} onChange={e => e.target.value && setFecha(e.target.value)} /></div>
      <button className="icon-button" aria-label="Día siguiente" onClick={() => setFecha(sumarDias(fecha, 1))}><ChevronRight size={18} /></button>
      {fecha !== hoyStr() && <button className="mini-btn" onClick={() => setFecha(hoyStr())}>Hoy</button>}
    </div>

    {feriado && <div className="feriado-banner" role="status"><strong>{nombreFeriado}</strong> — No hay clases. Los registros de asistencia no aplican.</div>}

    <div className="kpi-layout resumen-dia">
      <section className="kpi-card kpi-wide" aria-label="Resumen del día">
        <span>Asistencia del día {nivel ? `· ${NIVELES.find(n => n.v === nivel)?.l}` : ''}</span>
        {feriado ? <p className="empty-state">Feriado: sin porcentajes.</p> : <div className="resumen-num">
          <div><strong style={{ color: resumen.pct >= 90 ? '#117a4f' : resumen.pct >= 75 ? '#8f5800' : '#b83a3a' }}>{resumen.pct}%</strong><small>General</small></div>
          <div><strong>{resumen.pctM === null ? '—' : `${resumen.pctM}%`}</strong><small>Turno mañana</small></div>
          <div><strong>{resumen.pctT === null ? '—' : `${resumen.pctT}%`}</strong><small>Turno tarde</small></div>
          <div><strong>{resumen.ausentes}/{debenVenir.length}</strong><small>Ausentes</small></div>
        </div>}
      </section>
    </div>
    <div className="chip-filtros" role="group" aria-label="Filtrar por estado del día">
      {chips.map(([k, l, n]) => <button key={k} className={`chip ${badge === k ? 'on' : ''}`} aria-pressed={badge === k} onClick={() => setBadge(b => b === k ? '' : k)}>{l} <b>{n}</b></button>)}
      {[['maniana', 'Mañana'], ['tarde', 'Tarde']].map(([k, l]) => <button key={k} className={`chip ${badge === k ? 'on' : ''}`} aria-pressed={badge === k} onClick={() => setBadge(b => b === k ? '' : k)}>{l}</button>)}
    </div>

    <section className="panel table-panel">
      <div className="nivel-tabs" role="tablist" aria-label="Nivel">
        {NIVELES.map(n => <button key={n.v || 'todos'} role="tab" aria-selected={nivel === n.v} className={nivel === n.v ? 'on' : ''} onClick={() => { setNivel(n.v); setArea('') }}>{n.l}<b>{docentes.filter(d => !n.v || d.nivel === n.v).length}</b></button>)}
      </div>
      <div className="toolbar">
        <div className="table-search"><Search size={17} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar docente..." aria-label="Buscar docente" /></div>
        <label className="inline-select"><span className="sr-only">Estado</span><select value={estado} onChange={e => setEstado(e.target.value)} aria-label="Filtrar por estado"><option value="">Todos los estados</option><option value="sin-registro">Sin registro</option>{TIPOS.filter(t => t !== 'tardanza').map(t => <option key={t} value={t}>{t === 'injustificada' ? 'Inasist. Injustificada / Ausente' : LABELS[t]}</option>)}</select></label>
        {grupos.length > 0 && <label className="inline-select"><span className="sr-only">Grupo</span><select value={grupo} onChange={e => setGrupo(e.target.value)} aria-label="Filtrar por grupo"><option value="">Todos los grupos</option>{grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}</select></label>}
        {areas.length > 0 && <label className="inline-select"><span className="sr-only">Área</span><select value={area} onChange={e => setArea(e.target.value)} aria-label="Filtrar por área"><option value="">Todas las áreas</option>{areas.map(a => <option key={a}>{a}</option>)}</select></label>}
        {tiposPresentes.length > 1 && <label className="inline-select"><span className="sr-only">Tipo de persona</span><select value={tipo} onChange={e => setTipo(e.target.value)} aria-label="Filtrar por tipo de persona"><option value="">Todos los tipos</option>{tiposPresentes.map(t => <option key={t}>{t}</option>)}</select></label>}
        <label className="check-inline"><input type="checkbox" checked={soloHoy} onChange={e => setSoloHoy(e.target.checked)} /> Solo con horario este día</label>
        <button className="filter-button" onClick={() => { setQ(''); setEstado(''); setGrupo(''); setArea(''); setTipo(''); setBadge(''); setSoloHoy(true) }}><Filter size={15} />Limpiar</button>
      </div>
      <div className="table-scroll"><table><thead><tr><th>DOCENTE</th><th>HORARIO DEL DÍA</th><th>HS SEM.</th><th>ESTADO</th><th>% MES</th><th>% AÑO</th><th>ACCIONES</th></tr></thead><tbody>
        {cargando && !docentes.length && <tr><td colSpan={7} className="empty-state">Cargando docentes…</td></tr>}
        {!cargando && !lista.length && <tr><td colSpan={7} className="empty-state">No hay docentes que coincidan con los filtros.</td></tr>}
        {lista.map(d => {
          const fr = normalizarFranjas(d.horario[DIAS_KEYS[dow]])
          const dias = calcDias(config, d.horario, anio)
          const pm = calcPct(dias.diasMes, d.faltasMesCalc), pa = calcPct(dias.diasAnio, d.faltasAnioCalc)
          const hs = hsDisplay(d.horario, getTipoHs(d))
          const t = (d.estadoHoy || '') as TipoNovedad | ''
          return <tr key={d.id} className={d.jubilado ? 'fila-jubilado' : ''}>
            <td><div className="person-cell"><Avatar initials={(d.apellido || d.nombre).slice(0, 1).toUpperCase() + (d.apellido ? d.nombre.slice(0, 1).toUpperCase() : (d.nombre.split(' ')[1] || '').slice(0, 1).toUpperCase())} small /><div><strong>{nombreMostrar(d)}</strong><span>{d.cargo || '—'}{d.jubilado ? ' · Jubilado/a' : ''}</span></div></div></td>
            <td>{fr.length ? fr.map((f, i) => <span className="attach-chip" key={i}>{f.entrada.slice(0, 5)}–{f.salida.slice(0, 5)}</span>) : <span className="muted-cell">Sin horario</span>}</td>
            <td className="muted-cell">{hs.valor} {hs.unidad}</td>
            <td>{fr.length || t ? <StatusBadge tone={tono(t)}>{t ? (esAdministrativo(d) && t === 'injustificada' ? 'Ausente' : LABELS_SHORT[t]) : 'Presente'}</StatusBadge> : <span className="muted-cell">—</span>}</td>
            <td><StatusBadge tone={pctTono(pm) === 'neutral' ? 'blue' : pctTono(pm)}>{`${Math.round(pm)}%`}</StatusBadge></td>
            <td><StatusBadge tone={pctTono(pa) === 'neutral' ? 'blue' : pctTono(pa)}>{`${Math.round(pa)}%`}</StatusBadge></td>
            <td><div className="row-actions">
              <button className="mini-btn" aria-label={`Ver historial de ${nombreMostrar(d)}`} onClick={() => setPerfil(d)}><Eye size={13} /> Perfil</button>
              <button className="mini-btn ok" aria-label={`Registrar novedad de ${nombreMostrar(d)}`} onClick={() => setNov(d)}><PencilLine size={13} /> {puedeEditar ? 'Registrar' : 'Ver día'}</button>
            </div></td>
          </tr>
        })}
      </tbody></table></div>
      <div className="pagination"><span>{lista.length} de {delNivel.length} docentes</span></div>
    </section>

    {nov && <NovedadModal docente={nov} fechaInicial={fecha} onClose={() => setNov(null)} />}
    {perfil && <PerfilModal docente={perfil} onClose={() => setPerfil(null)} onRegistrar={() => { const d = perfil; setPerfil(null); setNov(d) }} />}
    {masivo && <MasivoModal onClose={() => setMasivo(false)} />}
  </>
}

function MasivoModal({ onClose }: { onClose: () => void }) {
  const { docentes, fecha: fechaCtx, anio, grupos, recargar, backup, notify } = useLive()
  const [fecha, setFecha] = useState(fechaCtx)
  const [tipo, setTipo] = useState<TipoNovedad | ''>('')
  const [sel, setSel] = useState<string[]>([])
  const [q, setQ] = useState('')
  const [grupo, setGrupo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const dow = fechaDate(fecha).getDay()

  const posibles = useMemo(() => docentes.filter(d => !d.jubilado && diasConHorario(d.horario).some(x => DIA_IDX[x] === dow) && (!grupo || d.grupos.includes(grupo))
    && (!q || quitarTildes(`${d.apellido} ${d.nombre}`.toLowerCase()).includes(quitarTildes(q.toLowerCase())))), [docentes, dow, grupo, q])
  const todos = posibles.length > 0 && posibles.every(d => sel.includes(d.id))

  const guardar = async () => {
    if (!tipo || !sel.length) return
    setGuardando(true); setError('')
    try {
      let n = 0
      for (const id of sel) {
        const previas = await novedadesDocenteFecha(id, fecha)
        if (previas.length && previas[0].tipo === tipo) continue
        await guardarNovedad(id, { tipo, fechas: [fecha], anio })
        n++
      }
      backup(`Registro masivo ${tipo} — ${fecha}`)
      notify(`${n} docente${n !== 1 ? 's' : ''} actualizado${n !== 1 ? 's' : ''} a "${LABELS[tipo]}".`)
      await recargar(); onClose()
    } catch (e) { setError((e as Error).message) } finally { setGuardando(false) }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" role="dialog" aria-modal="true" aria-label="Registro masivo" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><div><h2>Registro masivo</h2><p>{posibles.length} docentes con horario el {fechaLarga(fecha)}</p></div><button className="icon-button" aria-label="Cerrar" onClick={onClose}><X size={18} /></button></div>
        <div className="modal-body">
          <div className="nov-toolbar">
            <label>Fecha<input type="date" value={fecha} onChange={e => { setFecha(e.target.value || hoyStr()); setSel([]) }} /></label>
            {grupos.length > 0 && <label>Grupo<select value={grupo} onChange={e => setGrupo(e.target.value)}><option value="">Todos</option>{grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}</select></label>}
            <label>Buscar<input value={q} onChange={e => setQ(e.target.value)} placeholder="Nombre…" /></label>
          </div>
          <label className="check-inline mas-todos"><input type="checkbox" checked={todos} onChange={e => setSel(e.target.checked ? [...new Set([...sel, ...posibles.map(d => d.id)])] : sel.filter(id => !posibles.some(d => d.id === id)))} /> Seleccionar todos ({posibles.length})</label>
          <div className="mas-lista">{posibles.length ? posibles.map(d => (
            <label className="mas-item" key={d.id}><input type="checkbox" checked={sel.includes(d.id)} onChange={e => setSel(s => e.target.checked ? [...s, d.id] : s.filter(x => x !== d.id))} />
              <span><strong>{nombreMostrar(d)}</strong><small>{d.cargo || '—'}</small></span>
              <StatusBadge tone={tono((d.estadoHoy || '') as TipoNovedad | '')}>{d.estadoHoy ? LABELS_SHORT[d.estadoHoy as TipoNovedad] : 'Presente'}</StatusBadge></label>
          )) : <p className="empty-state">No hay docentes con horario ese día.</p>}</div>
          <div className="nov-grid" role="group" aria-label="Estado a aplicar">{TIPOS.filter(t => t !== 'tardanza').map(t => <button key={t} type="button" className={`nov-btn ${tipo === t ? 'sel' : ''}`} aria-pressed={tipo === t} onClick={() => setTipo(t)}>{LABELS_SHORT[t]}</button>)}</div>
          {error && <p role="alert" className="form-error">{error}</p>}
        </div>
        <div className="modal-footer"><span className="muted-cell">{sel.length} seleccionado{sel.length !== 1 ? 's' : ''}</span><span className="footer-spacer" /><button className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary" disabled={!tipo || !sel.length || guardando} onClick={guardar}><Check size={16} />{guardando ? 'Guardando…' : 'Guardar'}</button></div>
      </div>
    </div>
  )
}

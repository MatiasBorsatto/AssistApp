'use client'

import { useCallback, useEffect, useMemo } from 'react'
import { EditorFormatoCidi, PanelCidi } from './cidi'
import { useDemoBus } from '@/lib/demo-bus'
import { CONFIG_INICIAL } from '@/lib/fichaje'
import { fechasHabiles, hoyStr, sumarDias, uuid, type Novedad, type TipoNovedad } from '@/lib/domain'
import { filasCidi, lunesDe, semanaAnterior, viernesDe, type PersonaCidi, type SemanaCargada } from '@/lib/cidi'

const idDe = (nombre: string) => nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-')

/** Exportación semanal para CIDI en la demostración: usa las justificaciones del personal y las tardanzas de los fichajes. */
export function CidiDemo({ onNotify }: { onNotify: (m: string) => void }) {
  const bus = useDemoBus()
  const config = bus?.config ?? CONFIG_INICIAL
  const justificaciones = useMemo(() => (bus?.justificaciones ?? []).filter(j => j.ambito === 'personal'), [bus?.justificaciones])

  const personal: PersonaCidi[] = useMemo(() => {
    const porNombre = new Map(config.personal.map(p => [p.nombre, p]))
    const nombres = [...new Set([...config.personal.map(p => p.nombre), ...justificaciones.map(j => j.name)])]
    return nombres.map(n => {
      const [nombre, ...resto] = n.split(' ')
      const cargo = porNombre.get(n)?.cargo ?? 'Personal'
      return { id: idDe(n), nombre, apellido: resto.join(' '), cargo, nivel: /Primari/.test(cargo) ? 'primaria' : /Secundari/.test(cargo) ? 'secundaria' : '' }
    })
  }, [config.personal, justificaciones])

  const novedades: Novedad[] = useMemo(() => {
    const out: Novedad[] = []
    for (const j of justificaciones) {
      const tipo: TipoNovedad = j.status === 'Rechazado' ? 'injustificada' : /m[eé]dic|enfermedad|salud/i.test(j.reason) ? 'medica' : 'justificada'
      for (const fecha of fechasHabiles(j.desde, j.hasta)) out.push({
        id: uuid(), docente_id: idDe(j.name), tipo, fecha, mes: fecha.slice(0, 7), anio: fecha.slice(0, 4),
        obs: j.reason + (j.status === 'Pendiente' ? ' (pendiente de aprobación)' : ''), docsEntregados: !!(j.attachment || j.imagen),
      })
    }
    for (const f of Object.values(bus?.fichajes ?? {})) {
      const p = config.personal.find(x => x.id === f.personaId)
      if (p && f.estado === 'Tardanza') out.push({ id: uuid(), docente_id: idDe(p.nombre), tipo: 'tardanza', fecha: f.fecha, mes: f.fecha.slice(0, 7), anio: f.fecha.slice(0, 4), obs: `${f.minutosTarde} min de tardanza` })
    }
    return out
  }, [justificaciones, bus?.fichajes, config.personal])

  // Historial de ejemplo: todas las semanas anteriores a la última ya figuran como cargadas, así el aviso muestra solo la pendiente.
  useEffect(() => {
    if (!bus || bus.cidi.historialCargado) return
    const semanas: SemanaCargada[] = []
    for (let l = sumarDias(semanaAnterior(hoyStr()), -7); l >= lunesDe(config.ciclo.inicio); l = sumarDias(l, -7))
      semanas.push({ lunes: l, cargadaPor: 'Sofía López', cargadaEl: sumarDias(l, 7) + 'T10:00:00', filas: filasCidi(personal, novedades, l, bus.cidi.formato).filas.length })
    bus.setCidi({ ...bus.cidi, semanas, historialCargado: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const cargarNovedades = useCallback(async () => novedades, [novedades])
  const avisos = (lunes: string) => {
    const n = justificaciones.filter(j => j.status === 'Pendiente' && j.desde <= viernesDe(lunes) && j.hasta >= lunes).length
    return n ? [`${n === 1 ? 'Una justificación' : `${n} justificaciones`} de esta semana todavía ${n === 1 ? 'está pendiente' : 'están pendientes'} de aprobar. Resolvelas en Justificaciones antes de cargar en CIDI.`] : []
  }
  if (!bus) return null
  return <>
    <PanelCidi personal={personal} cargarNovedades={cargarNovedades} cicloInicio={config.ciclo.inicio} formato={bus.cidi.formato} cargadas={bus.cidi.semanas}
      guardarSemanas={async s => bus.setCidi({ ...bus.cidi, semanas: s })} puedeMarcar usuario="Sofía López" notify={onNotify} avisos={avisos} />
    <details className="panel cfg-sec cidi-formato"><summary>Formato para CIDI: código de cada tipo de novedad</summary>
      <div className="cfg-body"><p className="empty-state">En la versión real se carga en Configuración con los códigos que usa administración en CIDI.</p>
        <EditorFormatoCidi valor={bus.cidi.formato} onGuardar={async f => { bus.setCidi({ ...bus.cidi, formato: f }); onNotify('Formato para CIDI guardado.') }} /></div>
    </details>
  </>
}

'use client'

import { createContext, useContext } from 'react'
import type { Role } from './roles'
import type { Justification } from './data'
import type { ConfigDemo, Fichaje } from './fichaje'

export type DemoNotif = { id: number; para: Role[]; title: string; msg: string; tone: 'success' | 'warning' | 'blue'; time: string; read: string[] }

/** Estado compartido entre los perfiles de la demostración: lo que hace uno se ve en los otros. */
export type DemoBus = {
  push: (n: { para: Role[]; title: string; msg: string; tone?: DemoNotif['tone'] }) => void
  addJustification: (j: Omit<Justification, 'id' | 'status'>) => void
  notifs: DemoNotif[]
  /** Todas las justificaciones (cada perfil usa las que le corresponden) */
  justificaciones: Justification[]
  /** Reglas de fichaje y horarios del personal (se editan en Configuración) */
  config: ConfigDemo
  setConfig: (c: ConfigDemo) => void
  /** Fichajes registrados hoy, por persona */
  fichajes: Record<string, Fichaje>
  registrarFichaje: (f: Fichaje) => void
}

export const DemoBusCtx = createContext<DemoBus | null>(null)
export const useDemoBus = () => useContext(DemoBusCtx)

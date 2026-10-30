'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabase'
import {
  cargarConfig, cargarDocentes, cargarGrupos, contarFaltas, crearBackupAutomatico, getRolUsuario, novedadesAnio,
  type Grupo, type Rol,
} from '@/lib/repo'
import { DEFAULT_CONFIG, hoyStr, type Config, type Docente, type Nivel, type Novedad } from '@/lib/domain'

export const ANIO_INICIO_APP = 2026
export const ANIO_FIN_APP = 2050

export type DocenteDia = Docente & { estadoHoy: string; faltasMesCalc: number; faltasAnioCalc: number }

type Ctx = {
  user: { email: string; nombre: string; foto?: string } | null
  rol: Rol | null
  puedeEditar: boolean
  puedeVerTodo: boolean
  cargandoSesion: boolean
  error: string
  anio: number
  setAnio: (a: number) => void
  fecha: string
  setFecha: (f: string) => void
  nivel: Nivel | ''
  setNivel: (n: Nivel | '') => void
  config: Config
  recargarConfig: () => Promise<void>
  docentes: DocenteDia[]
  estudiantes: DocenteDia[]
  novedadesAnio: Novedad[]
  grupos: Grupo[]
  cargando: boolean
  recargar: () => Promise<void>
  backup: (motivo: string) => void
  loginGoogle: () => Promise<void>
  logout: () => Promise<void>
  notify: (m: string) => void
}

const LiveCtx = createContext<Ctx | null>(null)
export const useLive = () => {
  const c = useContext(LiveCtx)
  if (!c) throw new Error('useLive fuera de LiveProvider')
  return c
}

export function LiveProvider({ children, notify, onLogout }: { children: React.ReactNode; notify: (m: string) => void; onLogout: () => void }) {
  const [session, setSession] = useState<Session | null>(null)
  const [rol, setRol] = useState<Rol | null>(null)
  const [cargandoSesion, setCargandoSesion] = useState(true)
  const [error, setError] = useState('')
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [fecha, setFecha] = useState(hoyStr())
  const [nivel, setNivel] = useState<Nivel | ''>('')
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG)
  const [todos, setTodos] = useState<DocenteDia[]>([])
  const [novs, setNovs] = useState<Novedad[]>([])
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [cargando, setCargando] = useState(false)
  const token = useRef(0)

  // Sesión de Supabase + rol
  useEffect(() => {
    const sb = getSupabase()
    let vivo = true
    const aplicar = async (s: Session | null) => {
      if (!vivo) return
      setSession(s)
      if (s?.user.email) {
        try { setRol((await getRolUsuario(s.user.email)).rol) } catch { setRol('docente') }
      } else setRol(null)
      setCargandoSesion(false)
    }
    sb.auth.getSession().then(r => aplicar(r.data.session))
    const { data } = sb.auth.onAuthStateChange((_e, s) => { aplicar(s) })
    return () => { vivo = false; data.subscription.unsubscribe() }
  }, [])

  const recargarConfig = useCallback(async () => {
    try { setConfig(await cargarConfig(anio)) } catch (e) { setError((e as Error).message) }
  }, [anio])

  const recargar = useCallback(async () => {
    if (!session) return
    const mi = ++token.current
    setCargando(true)
    setError('')
    try {
      const [cfg, docs, gr, anual] = await Promise.all([cargarConfig(anio), cargarDocentes(anio, ''), cargarGrupos().catch(() => []), novedadesAnio(anio)])
      if (mi !== token.current) return
      const delDia: Record<string, string> = {}
      anual.filter(n => n.fecha === fecha).forEach(n => { delDia[n.docente_id] = n.tipo })
      const { mesC, anioC } = contarFaltas(anual, fecha.slice(0, 7))
      setConfig(cfg)
      setGrupos(gr)
      setNovs(anual)
      setTodos(docs.map(d => ({ ...d, estadoHoy: delDia[d.id] || '', faltasMesCalc: mesC[d.id] || 0, faltasAnioCalc: anioC[d.id] || 0 })))
    } catch (e) {
      if (mi === token.current) setError((e as Error).message)
    } finally {
      if (mi === token.current) setCargando(false)
    }
  }, [session, anio, fecha])

  useEffect(() => { if (session) recargar() }, [session, recargar])

  const loginGoogle = useCallback(async () => {
    const r = await getSupabase().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined } })
    if (r.error) throw new Error(r.error.message)
  }, [])
  const logout = useCallback(async () => { await getSupabase().auth.signOut(); onLogout() }, [onLogout])

  const docentes = useMemo(() => todos.filter(d => d.nivel !== 'estudiantes'), [todos])
  const estudiantes = useMemo(() => todos.filter(d => d.nivel === 'estudiantes'), [todos])

  const user = session?.user ? {
    email: session.user.email || '',
    nombre: (session.user.user_metadata?.full_name as string) || (session.user.user_metadata?.name as string) || session.user.email || '',
    foto: (session.user.user_metadata?.avatar_url as string) || undefined,
  } : null

  const value = useMemo<Ctx>(() => ({
    user, rol, puedeEditar: rol === 'admin', puedeVerTodo: rol === 'admin' || rol === 'directivo',
    cargandoSesion, error, anio, setAnio, fecha, setFecha, nivel, setNivel, config, recargarConfig,
    docentes, estudiantes, novedadesAnio: novs, grupos, cargando, recargar, loginGoogle, logout, notify,
    backup: (motivo: string) => crearBackupAutomatico(motivo, anio, user?.email || 'sistema'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [session, rol, cargandoSesion, error, anio, fecha, nivel, config, docentes, estudiantes, novs, grupos, cargando, recargar, recargarConfig, loginGoogle, logout, notify])

  return <LiveCtx.Provider value={value}>{children}</LiveCtx.Provider>
}

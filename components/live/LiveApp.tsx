'use client'

import { useRef, useState } from 'react'
import { ClipboardCheck, GraduationCap, LogIn, Settings2, ShieldAlert, UserRound, UsersRound, FileText } from 'lucide-react'
import { LiveProvider, useLive } from './LiveContext'
import { AsistenciaView } from './AsistenciaView'
import { DocentesView } from './DocentesView'
import { ReportesView } from './ReportesView'
import { ConfigView } from './ConfigView'
import { EstudiantesView } from './EstudiantesView'
import { PerfilModal } from './PerfilModal'
import { PageHeading } from '../shared'
import { Shell, type ShellNavItem } from '../Shell'
import { supabaseConfigurado } from '@/lib/supabase'
import { ANIO_FIN_APP, ANIO_INICIO_APP } from './LiveContext'
import { nombreMostrar, quitarTildes } from '@/lib/domain'

const ROL_LABEL = { admin: 'Administrador', directivo: 'Directivo', docente: 'Docente', invitado: 'Invitado' } as const

export function LiveApp({ onExit }: { onExit: () => void }) {
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const notify = (m: string) => { setToast(m); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), 3500) }
  return <LiveProvider notify={notify} onLogout={onExit}><LiveShell toast={toast} setToast={setToast} onExit={onExit} /></LiveProvider>
}

function LiveShell({ toast, setToast, onExit }: { toast: string | null; setToast: (t: string | null) => void; onExit: () => void }) {
  const { user, rol, cargandoSesion, logout, anio, setAnio, loginGoogle, puedeEditar, puedeVerTodo, error } = useLive()
  const [view, setView] = useState('asistencia')
  const [loginError, setLoginError] = useState('')

  if (!supabaseConfigurado) return <Mensaje titulo="Falta configurar Supabase" detalle="Definí NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local y reiniciá el servidor." onVolver={onExit} />
  if (cargandoSesion) return <Mensaje titulo="Verificando sesión…" detalle="Un momento." />
  if (!user) return (
    <div className="login-screen"><div className="login-card">
      <div className="brand"><img src="/logo.svg" alt="" className="brand-logo" width={34} height={34} /><span>ASIST<span>APP</span></span></div>
      <h1>Ingresar con tu cuenta</h1>
      <p>Iniciá sesión con Google para trabajar con los datos reales de la institución.</p>
      <button className="button primary full login-btn" onClick={async () => { try { await loginGoogle() } catch (e) { setLoginError((e as Error).message) } }}><LogIn size={16} />Continuar con Google</button>
      {loginError && <p role="alert" className="form-error">{loginError}</p>}
      <button className="button secondary full login-btn" onClick={onExit}>Volver</button>
    </div></div>
  )

  const nombreRol = ROL_LABEL[rol || 'invitado']
  const nav: ShellNavItem[] = puedeVerTodo ? [
    { id: 'asistencia', label: 'Gestionar asistencia', icon: ClipboardCheck, useCase: 'Gestionar asistencia' },
    { id: 'docentes', label: 'Docentes', icon: UsersRound, useCase: 'Administrar usuarios', related: ['Validar datos de usuario (include)'] },
    { id: 'estudiantes', label: 'Estudiantes', icon: GraduationCap, useCase: 'Gestionar asistencia' },
    { id: 'reportes', label: 'Reportes', icon: FileText, useCase: 'Generar reportes de asistencia', related: ['Exportar a PDF / Excel (extend)'] },
    ...(puedeEditar ? [{ id: 'config', label: 'Configuración', icon: Settings2, useCase: 'Administrar usuarios', related: ['Backups y cierre de ciclo'] }] : []),
  ] : [{ id: 'perfil', label: 'Mi perfil', icon: UserRound, useCase: 'Consultar historial personal' }]
  const current = nav.find(n => n.id === view)?.id || nav[0].id

  const anios: number[] = []
  for (let a = ANIO_FIN_APP; a >= ANIO_INICIO_APP; a--) anios.push(a)

  const body = () => {
    switch (current) {
      case 'asistencia': return <AsistenciaView />
      case 'docentes': return <DocentesView />
      case 'estudiantes': return <EstudiantesView />
      case 'reportes': return <ReportesView />
      case 'config': return <ConfigView />
      default: return <MiPerfil />
    }
  }

  return (
    <Shell rolLabel={nombreRol} userName={user.nombre} initials={user.nombre.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'U'}
      nav={nav} currentId={current} onGo={setView} toast={toast} onDismissToast={() => setToast(null)} onLogout={logout}
      banner={<div className="ciclo-bar"><label>Ciclo lectivo<select value={anio} onChange={e => setAnio(parseInt(e.target.value))}>{anios.map(a => <option key={a} value={a}>{a}{a === new Date().getFullYear() ? ' (actual)' : ''}</option>)}</select></label>
        <span className="muted-cell">Datos reales · {user.email}{!puedeEditar ? ' · solo lectura' : ''}</span>{error && <span className="form-error" role="alert">{error}</span>}</div>}>
      {body()}
    </Shell>
  )
}

function Mensaje({ titulo, detalle, onVolver }: { titulo: string; detalle: string; onVolver?: () => void }) {
  return <div className="login-screen"><div className="login-card"><ShieldAlert size={28} /><h1>{titulo}</h1><p>{detalle}</p>{onVolver && <button className="button secondary full login-btn" onClick={onVolver}>Volver</button>}</div></div>
}

/** Rol docente/invitado: sólo ve su propio historial (se busca por nombre/email en la lista). */
function MiPerfil() {
  const { docentes, user, cargando } = useLive()
  const [abierto, setAbierto] = useState<string | null>(null)
  const mi = user ? docentes.filter(d => {
    const n = quitarTildes((user.nombre || '').toLowerCase()), dn = quitarTildes(`${d.nombre} ${d.apellido}`.toLowerCase())
    return n && (dn.includes(n.split(' ')[0]) && (n.split(' ').slice(1).some(p => p.length > 2 && dn.includes(p)) || dn === n))
  }) : []
  const sel = mi.find(d => d.id === abierto)
  return <>
    <PageHeading eyebrow="MI CUENTA" title="Mi perfil" description="Tu historial de asistencia y novedades." />
    {cargando && !docentes.length ? <p className="empty-state">Cargando…</p> : !mi.length ? <p className="empty-state">No encontramos un legajo asociado a {user?.email}. Pedile al administrador que lo vincule.</p> : (
      <section className="panel"><div className="pending-list">{mi.map(d => <div className="pending-item" key={d.id}><div><strong>{nombreMostrar(d)}</strong><span>{d.cargo || '—'}</span></div><button className="review-button" onClick={() => setAbierto(d.id)}>Ver historial</button></div>)}</div></section>)}
    {sel && <PerfilModal docente={sel} onClose={() => setAbierto(null)} />}
  </>
}

'use client'

import { useEffect, useState } from 'react'
import { Database } from 'lucide-react'
import { Shell } from '@/components/Shell'
import { LiveApp } from '@/components/live/LiveApp'
import {
  AdminAttendance, AdminPanel, AlumnoNotifications, EarlyNotice, HistoryView, JustificationsView,
  PreceptorAttendance, ReportsView, UsersView,
} from '@/components/views'
import { FicharView } from '@/components/fichar'
import { ConfigDemoView } from '@/components/config-demo'
import { CONFIG_INICIAL, type ConfigDemo, type Fichaje } from '@/lib/fichaje'
import { initialJustifications, initialUsers, type AppUser, type Justification } from '@/lib/data'
import { roleOrder, roles, type Role, type ViewId } from '@/lib/roles'
import { getSupabase, supabaseConfigurado } from '@/lib/supabase'
import { DemoBusCtx, type DemoBus, type DemoNotif } from '@/lib/demo-bus'
import { alumnoNotifications } from '@/lib/data'

type Modo = 'inicio' | 'demo' | 'real'

export default function Page() {
  const [modo, setModo] = useState<Modo>('inicio')
  const [revisando, setRevisando] = useState(true)

  // Si ya hay una sesión de Supabase (o se vuelve del login con Google), se entra directo al modo real.
  useEffect(() => {
    if (!supabaseConfigurado) { setRevisando(false); return }
    getSupabase().auth.getSession().then(r => { if (r.data.session) setModo('real') }).finally(() => setRevisando(false))
  }, [])

  if (revisando) return <div className="login-screen"><div className="login-card"><p>Cargando…</p></div></div>
  if (modo === 'real') return <LiveApp onExit={() => setModo('inicio')} />
  if (modo === 'demo') return <Demo onExit={() => setModo('inicio')} />
  return <Inicio onReal={() => setModo('real')} onDemo={() => setModo('demo')} />
}

function Inicio({ onReal, onDemo }: { onReal: () => void; onDemo: () => void }) {
  return (
    <div className="login-screen"><div className="login-card">
      <div className="brand"><img src="/logo.svg" alt="" className="brand-logo" width={34} height={34} /><span>ASIST<span>APP</span></span></div>
      <h1>Bienvenido</h1>
      <p>Sistema de asistencia de personal escolar · Escuela Modelo.</p>
      <button className="button primary full login-btn" onClick={onReal} disabled={!supabaseConfigurado}><Database size={16} />Ingresar con datos reales</button>
      {!supabaseConfigurado && <small className="login-hint">Falta configurar Supabase en .env.local.</small>}
      <button className="button secondary full login-btn" onClick={onDemo}>Probar la demostración</button>
      <small className="login-hint">La demostración usa datos de ejemplo y no modifica nada.</small>
    </div></div>
  )
}

/** Prototipo por casos de uso (datos de ejemplo, sin conexión a la base). */
function Demo({ onExit }: { onExit: () => void }) {
  const [role, setRole] = useState<Role | null>(null)
  const [view, setView] = useState<ViewId>('panel')
  const [toast, setToast] = useState<string | null>(null)
  const [justifications, setJustifications] = useState<Justification[]>(initialJustifications)
  const [users, setUsers] = useState<AppUser[]>(initialUsers)
  const [notifs, setNotifs] = useState<DemoNotif[]>([])
  const [config, setConfig] = useState<ConfigDemo>(CONFIG_INICIAL)
  const [fichajes, setFichajes] = useState<Record<string, Fichaje>>({})

  const notify = (message?: string) => {
    setToast(typeof message === 'string' ? message : 'Los cambios se guardaron correctamente.')
    setTimeout(() => setToast(null), 3000)
  }
  const bus: DemoBus = {
    notifs, config, setConfig, fichajes,
    registrarFichaje: f => setFichajes(prev => ({ ...prev, [f.personaId]: f })),
    push: n => setNotifs(p => [{ id: Date.now() + p.length, para: n.para, title: n.title, msg: n.msg, tone: n.tone || 'blue', time: 'Ahora', read: [] }, ...p]),
    addJustification: j => setJustifications(p => [{ ...j, id: Math.max(0, ...p.map(x => x.id)) + 1, status: 'Pendiente' }, ...p]),
  }
  const login = (r: Role) => { setRole(r); setView(roles[r].nav[0].id) }

  if (!role) return <DemoLogin onLogin={login} onExit={onExit} />

  const cfg = roles[role]
  const go = (id: string) => setView(id as ViewId)
  const current = cfg.nav.find(n => n.id === view) ?? cfg.nav[0]

  const body = () => {
    switch (current.id) {
      case 'panel': return <AdminPanel justifications={justifications} onGo={go} />
      case 'gestion-asistencia': return role === 'Preceptor' ? <PreceptorAttendance onNotify={notify} /> : <AdminAttendance onNotify={notify} />
      case 'registrar-qr':
      case 'fichar': return <FicharView role={role} onNotify={notify} />
      case 'configuracion': return <ConfigDemoView onNotify={notify} />
      case 'aviso': return <EarlyNotice onNotify={notify} />
      case 'historial': return <HistoryView role={role} onNotify={notify} />
      case 'justificaciones': return <JustificationsView role={role} items={justifications} onNotify={notify}
        onAdd={j => setJustifications(p => [{ ...j, id: Math.max(0, ...p.map(x => x.id)) + 1, status: 'Pendiente' }, ...p])}
        onResolve={(id, status) => setJustifications(p => p.map(j => j.id === id ? { ...j, status } : j))}
        onEdit={(id, patch) => setJustifications(p => p.map(j => j.id === id ? { ...j, ...patch, initials: patch.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() } : j))}
        onDelete={id => setJustifications(p => p.filter(j => j.id !== id))} />
      case 'usuarios': return <UsersView users={users} onAdd={u => setUsers(p => [u, ...p])} onUpdate={(id, patch) => setUsers(p => p.map(u => u.id === id ? { ...u, ...patch } : u))} onDelete={id => setUsers(p => p.filter(u => u.id !== id))} onNotify={notify} />
      case 'reportes': return <ReportsView role={role} onNotify={notify} />
      case 'notificaciones': return <AlumnoNotifications extra={notifs.filter(n => n.para.includes('Alumno')).map(n => ({ title: n.title, msg: n.msg, time: n.time, tone: n.tone }))} />
    }
  }

  const misNotifs = notifs.filter(n => n.para.includes(role)).map(n => ({ id: n.id, title: n.title, msg: n.msg, tone: n.tone, time: n.time, read: n.read.includes(role) }))
  return (
    <DemoBusCtx.Provider value={bus}>
    <Shell rolLabel={role} userName={cfg.user} initials={cfg.initials} nav={cfg.nav} currentId={current.id} onGo={go}
      notifs={misNotifs} onReadAll={() => setNotifs(p => p.map(n => n.para.includes(role) && !n.read.includes(role) ? { ...n, read: [...n.read, role] } : n))} toast={toast} onDismissToast={() => setToast(null)} onLogout={() => setRole(null)}
      banner={<div className="demo-bar" role="status">Modo demostración · datos de ejemplo</div>}>
      {body()}
    </Shell>
    </DemoBusCtx.Provider>
  )
}

function DemoLogin({ onLogin, onExit }: { onLogin: (r: Role) => void; onExit: () => void }) {
  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="brand"><img src="/logo.svg" alt="" className="brand-logo" width={34} height={34} /><span>ASIST<span>APP</span></span></div>
        <h1>Acceso rápido</h1>
        <p>Elegí un perfil para recorrer la demostración por casos de uso.</p>
        <div className="role-grid" role="group" aria-label="Ingresar como">
          {roleOrder.map(r => <button key={r} type="button" className="role-card" onClick={() => onLogin(r)}>
            <strong>{r}</strong><span>{roles[r].description}</span>
            <em>Ingresar como {roles[r].user}</em>
          </button>)}
        </div>
        <button className="button secondary full login-btn" onClick={onExit}>Volver</button>
      </div>
    </div>
  )
}

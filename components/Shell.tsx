'use client'

import { useEffect, useState } from 'react'
import { Bell, CheckCircle2, ChevronRight, Lightbulb, LogOut, Menu, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Avatar, UseCaseTrace } from './shared'

export type ShellNavItem = { id: string; label: string; icon: LucideIcon; useCase?: string; related?: string[]; ayuda?: string }

/** Estructura común (menú lateral, barra superior, aviso y confirmación de cierre de sesión) para el modo demo y el modo real. */
export type ShellNotif = { id: number; title: string; msg: string; tone: 'success' | 'warning' | 'blue'; time: string; read: boolean }

export function Shell({ rolLabel, userName, initials, schoolLabel = 'Escuela Modelo', nav, currentId, onGo, onBell, notifs, onReadAll, badges, children, toast, onDismissToast, onLogout, banner }: {
  rolLabel: string; userName: string; initials: string; schoolLabel?: string
  nav: ShellNavItem[]; currentId: string; onGo: (id: string) => void; onBell?: () => void
  notifs?: ShellNotif[]; onReadAll?: () => void
  /** Cantidad de pendientes por sección, para mostrar un globito en el menú */
  badges?: Record<string, number>
  children: React.ReactNode; toast: string | null; onDismissToast: () => void; onLogout: () => void; banner?: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [mostrarCasos, setMostrarCasos] = useState(true)
  const [ayudaCerrada, setAyudaCerrada] = useState<Record<string, boolean>>({})
  useEffect(() => {
    try { setMostrarCasos(localStorage.getItem('asistapp-casos') !== 'off'); setAyudaCerrada(JSON.parse(localStorage.getItem('asistapp-ayuda') || '{}')) } catch { /* sin almacenamiento */ }
  }, [])
  const cambiarCasos = (v: boolean) => { setMostrarCasos(v); try { localStorage.setItem('asistapp-casos', v ? 'on' : 'off') } catch { /* sin almacenamiento */ } }
  const cerrarAyuda = (id: string) => { const n = { ...ayudaCerrada, [id]: true }; setAyudaCerrada(n); try { localStorage.setItem('asistapp-ayuda', JSON.stringify(n)) } catch { /* sin almacenamiento */ } }
  const unread = notifs ? notifs.filter(n => !n.read).length : 0
  const current = nav.find(n => n.id === currentId) ?? nav[0]
  const go = (id: string) => { onGo(id); setSidebarOpen(false) }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand"><img src="/logo.svg" alt="" className="brand-logo" width={34} height={34} /><span>ASIST<span>APP</span></span></div>
        <div className="workspace"><div className="school-mark">E</div><div><strong>{schoolLabel}</strong><small>Perfil: {rolLabel}</small></div></div>
        <div className="nav-label">¿QUÉ NECESITÁS HACER?</div>
        <nav aria-label="Secciones">{nav.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => go(id)} className={current.id === id ? 'active' : ''} aria-current={current.id === id ? 'page' : undefined}><Icon size={19} /><span>{label}</span>{!!badges?.[id] && <em aria-label={`${badges[id]} pendientes`}>{badges[id]}</em>}</button>)}</nav>
        <div className="sidebar-spacer" />
        <label className="casos-toggle"><input type="checkbox" checked={mostrarCasos} onChange={e => cambiarCasos(e.target.checked)} /><span>Mostrar casos de uso <small>(para la presentación)</small></span></label>
        <button onClick={() => setConfirmLogout(true)}><LogOut size={18} /><span>Cerrar sesión</span></button>
        <div className="sidebar-user"><Avatar initials={initials} small blue /><div><strong>{userName}</strong><small>{rolLabel}</small></div></div>
      </aside>
      {sidebarOpen && <button className="sidebar-overlay" aria-label="Cerrar menú" onClick={() => setSidebarOpen(false)} />}
      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Abrir menú" onClick={() => setSidebarOpen(true)}><Menu size={21} /></button>
          <div className="breadcrumbs"><span>{rolLabel}</span><ChevronRight size={14} /><strong>{current.label}</strong></div>
          <div className="top-actions">
            <div className="bell-wrap"><button className="icon-button notification-button" aria-label={`Notificaciones${unread ? `, ${unread} sin leer` : ''}`} aria-expanded={bellOpen} onClick={() => { if (notifs) { setBellOpen(v => !v) } else onBell?.() }}><Bell size={19} />{unread > 0 && <i>{unread > 9 ? '9+' : unread}</i>}</button>
              {bellOpen && notifs && <><button className="menu-overlay" aria-label="Cerrar notificaciones" onClick={() => setBellOpen(false)} />
                <div className="bell-panel" role="dialog" aria-label="Notificaciones"><div className="bell-head"><strong>Notificaciones</strong>{unread > 0 && <button className="text-button" onClick={() => onReadAll?.()}>Marcar como leídas</button>}</div>
                  {notifs.length === 0 ? <p className="empty-state">No tenés notificaciones.</p> : <ul>{notifs.map(n => <li key={n.id} className={n.read ? '' : 'unread'}><span className={`dot-tone ${n.tone}`} aria-hidden="true" /><div><strong>{n.title}</strong><p>{n.msg}</p><small>{n.time}</small></div></li>)}</ul>}</div></>}</div>
            <div className="profile-trigger"><Avatar initials={initials} small blue /><div><strong>{userName}</strong><span>{rolLabel}</span></div></div>
          </div>
        </header>
        <div className="page-content">
          {banner}
          {mostrarCasos && current.useCase && <UseCaseTrace useCase={current.useCase} related={current.related} />}
          {current.ayuda && !ayudaCerrada[`${rolLabel}-${current.id}`] && current.id !== 'inicio' && <div className="ayuda-vista" role="note"><Lightbulb size={17} /><span>{current.ayuda}</span><button className="icon-button" aria-label="Ocultar esta ayuda" onClick={() => cerrarAyuda(`${rolLabel}-${current.id}`)}><X size={14} /></button></div>}
          {children}
        </div>
      </main>
      {confirmLogout && <div className="modal-backdrop" onClick={() => setConfirmLogout(false)}><div className="modal" role="alertdialog" aria-modal="true" aria-label="Cerrar sesión" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><div><h2>Cerrar sesión</h2><p>Vas a salir del módulo {rolLabel}.</p></div><button className="icon-button" aria-label="Cerrar" onClick={() => setConfirmLogout(false)}><X size={18} /></button></div>
        <div className="modal-body"><p>¿Seguro que querés cerrar la sesión de <strong>{userName}</strong>? Los cambios sin guardar se perderán.</p></div>
        <div className="modal-footer"><button className="button secondary" autoFocus onClick={() => setConfirmLogout(false)}>Cancelar</button><button className="button danger" onClick={() => { setConfirmLogout(false); onLogout() }}><LogOut size={15} />Cerrar sesión</button></div>
      </div></div>}
      {toast && <div className="toast" role="status"><CheckCircle2 size={19} /><div><strong>Acción realizada</strong><span>{toast}</span></div><button className="toast-x" aria-label="Cerrar aviso" onClick={onDismissToast}><X size={16} /></button></div>}
    </div>
  )
}

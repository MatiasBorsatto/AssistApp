import { ArrowUpRight, MoreHorizontal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export function StatusBadge({ children, tone }: { children: string; tone: string }) {
  return <span className={`status-badge ${tone}`}><span className="status-dot" />{children}</span>
}

export function Avatar({ initials, small = false, blue = false }: { initials: string; small?: boolean; blue?: boolean }) {
  return <span className={`avatar ${small ? 'small' : ''} ${blue ? 'blue' : ''}`}>{initials}</span>
}

export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>
}

export function StatCard({ label, value, change, detail, icon: Icon, tone }: { label: string; value: string; change: string; detail: string; icon: LucideIcon; tone: string }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={20} /></div><div className="stat-body"><span>{label}</span><strong>{value}</strong><small><b className={tone === 'red' ? 'negative' : ''}>{change}</b> {detail}</small></div><ArrowUpRight size={17} className="stat-arrow" /></div>
}

export function Kebab() {
  return <button className="kebab" aria-label="Más acciones"><MoreHorizontal size={18} /></button>
}

/** Chips con los casos de uso incluidos / extendidos que resuelve la vista actual. */
export function UseCaseTrace({ useCase, related }: { useCase: string; related?: string[] }) {
  return (
    <div className="uc-trace" aria-label="Caso de uso asociado">
      <span className="uc-main">Caso de uso: {useCase}</span>
      {related?.map(r => <span className="uc-rel" key={r}>{r}</span>)}
    </div>
  )
}

import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  subtitle?: string
  action?: ReactNode
  compact?: boolean
}

export function EmptyState({ icon, title, subtitle, action, compact }: EmptyStateProps): React.JSX.Element {
  return (
    <div className={`empty-state ${compact ? 'empty-state-compact' : ''}`}>
      {icon && <div className="empty-state-icon">{icon}</div>}
      <h3>{title}</h3>
      {subtitle && <p>{subtitle}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  )
}
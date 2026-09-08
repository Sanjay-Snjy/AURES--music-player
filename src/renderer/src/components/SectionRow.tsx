import type { ReactNode } from 'react'

interface SectionRowProps {
  title: string
  children: ReactNode
  action?: ReactNode
  id?: string
}

export function SectionRow({ title, children, action, id }: SectionRowProps): React.JSX.Element {
  return (
    <section className="section-row" aria-labelledby={id}>
      <div className="section-head">
        <h2 id={id}>{title}</h2>
        {action && <div className="section-action">{action}</div>}
      </div>
      <div className="section-scroll">{children}</div>
    </section>
  )
}
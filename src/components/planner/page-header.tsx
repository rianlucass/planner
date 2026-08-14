type PageHeaderProps = { eyebrow: string; title: string; description: string }

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
    </header>
  )
}

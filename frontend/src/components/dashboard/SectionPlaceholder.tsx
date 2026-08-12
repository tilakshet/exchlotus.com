export function SectionPlaceholder({ title }: { title: string }) {
  return (
    <div className="rounded-(--sb-radius-md) border border-(--sb-border) bg-(--sb-content-alt) p-8 text-center">
      <h1 className="text-xl font-medium text-(--sb-text-primary)">{title}</h1>
      <p className="mt-3 text-sm text-(--sb-text-secondary)">This section is not built yet.</p>
    </div>
  )
}

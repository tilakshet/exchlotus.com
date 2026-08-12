/** Numbered section heading shared by the Deposit and Withdraw step cards. */
export function StepHeading({ step, title }: { step: number; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex size-8.75 shrink-0 items-center justify-center rounded-full text-base font-bold"
        style={{ background: "var(--acc-accent)", color: "var(--acc-accent-fg)" }}
      >
        {step}
      </span>
      <h2 className="text-xl font-bold text-[color:var(--acc-text-primary)]">{title}</h2>
    </div>
  )
}

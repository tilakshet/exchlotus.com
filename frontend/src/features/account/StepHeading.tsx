/** Numbered section heading shared by the Deposit and Withdraw step cards. */
export function StepHeading({ step, title }: { step: number; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span
        aria-hidden="true"
        className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
        style={{ background: "var(--acc-accent)", color: "var(--acc-accent-fg)" }}
      >
        {step}
      </span>
      <h2 className="text-base font-semibold text-[color:var(--acc-text-primary)]">{title}</h2>
    </div>
  )
}

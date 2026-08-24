/** Numbered section heading shared by the Deposit and Withdraw step cards. */
export function StepHeading({ step, title }: { step: number; title: string }) {
  return (
    <div className="mb-3.5 flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
        style={{ background: "var(--acc-accent)", color: "var(--acc-accent-fg)" }}
      >
        {step}
      </span>
      <h2 className="text-lg font-semibold text-[color:var(--acc-text-primary)]">{title}</h2>
    </div>
  )
}

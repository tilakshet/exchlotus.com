import { useState, type ReactNode } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CheckCircle2, Clock, Mail, MapPin, Phone, Send, TriangleAlert } from "lucide-react"
import { InfoPageLayout } from "@/components/landing/shared/InfoPageLayout"
import { PageHero } from "@/components/landing/shared/PageHero"
import { SectionContainer } from "@/components/landing/shared/SectionContainer"
import { Card } from "@/components/landing/shared/Card"

export const Route = createFileRoute("/contact")({
  component: ContactPage,
})

const SUPPORT_EMAIL = "support@exchlotus.com"

const contactSchema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  email: z.email("Enter a valid email address"),
  subject: z.string().min(3, "Subject is too short"),
  message: z.string().min(10, "Message should be at least 10 characters"),
})
type ContactValues = z.infer<typeof contactSchema>

const contactInfo: { icon: typeof Mail; title: string; detail: string; href?: string }[] = [
  { icon: Mail, title: "Email", detail: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` },
  { icon: Phone, title: "Phone", detail: "Phone support is coming soon — email is fastest for now." },
  { icon: Clock, title: "Support Hours", detail: "We aim to reply to every email within 24 hours." },
  { icon: MapPin, title: "Location", detail: "Pune, India — remote-friendly team." },
]

/**
 * No contact API exists in this backend, so submitting doesn't fake a
 * network call — it opens the visitor's email client with the fields
 * pre-filled via a mailto: link, addressed to SUPPORT_EMAIL. The
 * submitting/success/error states below are real states of that action
 * (validate → attempt to open the mail client → confirm), not simulated
 * backend latency.
 */
function ContactPage() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle")
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactValues>({ resolver: zodResolver(contactSchema) })

  function onSubmit(values: ContactValues) {
    setStatus("submitting")
    try {
      const body = `${values.message}\n\n— ${values.fullName} (${values.email})`
      const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(values.subject)}&body=${encodeURIComponent(body)}`
      window.location.href = mailto
      setStatus("success")
      reset()
    } catch {
      setStatus("error")
    }
  }

  return (
    <InfoPageLayout>
      <PageHero eyebrow="Get in touch" title="Contact EXCHLOTUS" description="We're here to help." />

      <SectionContainer ariaLabel="Contact EXCHLOTUS">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="flex flex-col gap-5">
            {contactInfo.map(({ icon: Icon, title, detail, href }) => (
              <Card key={title} className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-(--landing-radius-md) bg-(--landing-gold)/15">
                  <Icon className="size-5.5 text-(--landing-gold-text)" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-(--landing-text-primary)">{title}</h3>
                  {href ? (
                    <a href={href} className="mt-1 block text-sm text-(--landing-text-secondary) underline-offset-2 hover:underline">
                      {detail}
                    </a>
                  ) : (
                    <p className="mt-1 text-sm text-(--landing-text-secondary)">{detail}</p>
                  )}
                </div>
              </Card>
            ))}
            <p className="text-xs text-(--landing-text-muted)">
              Looking for a quick answer instead?{" "}
              <Link to="/faq" className="underline underline-offset-2 hover:text-(--landing-text-primary)">
                Check our FAQ
              </Link>{" "}
              or the{" "}
              <Link to="/help-center" className="underline underline-offset-2 hover:text-(--landing-text-primary)">
                Help Center
              </Link>
              .
            </p>
          </div>

          <Card className="p-7 sm:p-8">
            {status === "success" ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <CheckCircle2 className="size-12 text-(--landing-emerald)" aria-hidden="true" />
                <h3 className="text-lg font-bold text-(--landing-text-primary)">Your email app should be opening now</h3>
                <p className="max-w-sm text-sm text-(--landing-text-secondary)">
                  Finish sending the message from there. Didn't open?{" "}
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="underline underline-offset-2">
                    Email us directly at {SUPPORT_EMAIL}
                  </a>
                  .
                </p>
                <button
                  type="button"
                  onClick={() => setStatus("idle")}
                  className="mt-2 text-sm font-bold text-(--landing-gold-text) underline underline-offset-2"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
                {status === "error" && (
                  <p role="alert" className="flex items-center gap-2 rounded-(--landing-radius-sm) border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                    <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
                    Couldn't open your email client. Please email {SUPPORT_EMAIL} directly.
                  </p>
                )}

                <Field label="Full Name" error={errors.fullName?.message}>
                  <input
                    type="text"
                    placeholder="Jordan Patel"
                    className="w-full rounded-(--landing-radius-sm) border border-(--landing-border) bg-(--landing-glass) px-3.5 py-3 text-sm text-(--landing-text-primary) outline-none placeholder:text-(--landing-text-muted) focus-visible:ring-2 focus-visible:ring-(--landing-gold)"
                    {...register("fullName")}
                  />
                </Field>

                <Field label="Email" error={errors.email?.message}>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    className="w-full rounded-(--landing-radius-sm) border border-(--landing-border) bg-(--landing-glass) px-3.5 py-3 text-sm text-(--landing-text-primary) outline-none placeholder:text-(--landing-text-muted) focus-visible:ring-2 focus-visible:ring-(--landing-gold)"
                    {...register("email")}
                  />
                </Field>

                <Field label="Subject" error={errors.subject?.message}>
                  <input
                    type="text"
                    placeholder="How can we help?"
                    className="w-full rounded-(--landing-radius-sm) border border-(--landing-border) bg-(--landing-glass) px-3.5 py-3 text-sm text-(--landing-text-primary) outline-none placeholder:text-(--landing-text-muted) focus-visible:ring-2 focus-visible:ring-(--landing-gold)"
                    {...register("subject")}
                  />
                </Field>

                <Field label="Message" error={errors.message?.message}>
                  <textarea
                    rows={5}
                    placeholder="Tell us more..."
                    className="w-full resize-none rounded-(--landing-radius-sm) border border-(--landing-border) bg-(--landing-glass) px-3.5 py-3 text-sm text-(--landing-text-primary) outline-none placeholder:text-(--landing-text-muted) focus-visible:ring-2 focus-visible:ring-(--landing-gold)"
                    {...register("message")}
                  />
                </Field>

                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="landing-glow mt-2 flex items-center justify-center gap-2 rounded-(--landing-radius-sm) bg-(--landing-gold) py-3.5 text-sm font-black text-(--landing-gold-fg) outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-(--landing-text-primary) disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send className="size-4.5" aria-hidden="true" />
                  {status === "submitting" ? "Opening your email app…" : "Send Message"}
                </button>
              </form>
            )}
          </Card>
        </div>
      </SectionContainer>
    </InfoPageLayout>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-bold text-(--landing-text-secondary)">
      {label}
      {children}
      {error && (
        <span role="alert" className="text-xs font-medium text-red-400">
          {error}
        </span>
      )}
    </label>
  )
}

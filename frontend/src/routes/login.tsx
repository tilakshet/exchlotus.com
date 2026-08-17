import { useRef, useState, type MouseEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock, Phone, Info, Ticket } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePhoneOtpFlow } from "@/hooks/usePhoneOtpFlow";
import { ApiError, friendlyErrorMessage } from "@/api/api-error";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Logo } from "@/components/shared/Logo";
import promoImage from "@/assets/hero.png";

interface LoginSearch {
  redirect?: string;
  view?: View;
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    view:
      search.view === "register" ||
      search.view === "password" ||
      search.view === "otp"
        ? search.view
        : undefined,
  }),
  component: LoginPage,
});

const phoneLocalSchema = z
  .string()
  .min(1, "Phone number is required")
  .regex(/^\d{7,13}$/, "Enter a valid phone number");

const loginSchema = z.object({
  phone: phoneLocalSchema,
  password: z.string().min(1, "Password is required"),
});
type LoginValues = z.infer<typeof loginSchema>;

const otpCodeSchema = z.object({
  code: z.string().length(6, "Enter the 6-digit code"),
});
type OtpCodeValues = z.infer<typeof otpCodeSchema>;

const signUpPhoneSchema = z.object({
  phone: phoneLocalSchema,
  promoCode: z.string().max(40).optional(),
  agreeTerms: z.boolean().refine((v) => v === true, {
    message: "You must agree to the Terms & Privacy Policy",
  }),
});

const passwordSignUpSchema = z
  .object({
    username: z.string().min(2, "Enter your name").max(40),
    phone: phoneLocalSchema,
    password: z.string().min(8, "At least 8 characters").max(72),
    confirmPassword: z.string().min(1, "Confirm your password"),
    agreeTerms: z.boolean().refine((v) => v === true, {
      message: "You must agree to the Terms & Privacy Policy",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
type PasswordSignUpValues = z.infer<typeof passwordSignUpSchema>;
type SignUpPhoneValues = z.infer<typeof signUpPhoneSchema>;

type View = "otp" | "password" | "register";

/**
 * Real auth (routed through useAuth() → the backend's JWT endpoints).
 * Phone number is the identifier everywhere now — Login with OTP, Login
 * with Password, and Sign Up all key off it, not email. Sign Up has no
 * password field at all: verifying an OTP for a number with no account
 * provisions one (auth.service.ts verifyOtp), matching the reference —
 * password is a separate login *method* for accounts that already have
 * one (e.g. the seeded fixture player), not something Sign Up collects.
 */
function LoginPage() {
  const { redirect, view: initialView } = Route.useSearch();
  const navigate = useNavigate();
  const [view, setView] = useState<View>(initialView ?? "otp");
  const [signUpMethod, setSignUpMethod] = useState<"otp" | "password">("otp");

  function onSuccess() {
    navigate({ to: (redirect ?? "/dashboard") as "/dashboard" });
  }

  return (
    <div className="login-gaming-bg relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
      <div className="absolute right-4 top-4 z-20 sm:right-7 sm:top-7">
        <ThemeToggle />
      </div>
      <div className="relative grid w-full max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(460px,560px)_1fr] lg:gap-16">
        <div
          className="login-card rounded-(--landing-radius-lg) p-7 shadow-token-4 sm:p-10 lg:min-h-[620px]"
          style={{ background: "var(--landing-bg-3)" }}
        >
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-(--landing-gold)"
            >
              <Logo heightClass="h-20" />
            </Link>
          </div>

          {view !== "register" && (
            <div
              className="mt-8 inline-flex gap-1 rounded-(--landing-radius-full) p-1 text-sm"
              style={{
                background: "var(--landing-glass)",
                border: "1px solid var(--landing-border)",
              }}
            >
              <button
                type="button"
                onClick={() => setView("otp")}
                aria-pressed={view === "otp"}
                className="rounded-(--landing-radius-full) px-5 py-2.5 font-bold transition-colors"
                style={
                  view === "otp"
                    ? {
                        background: "var(--landing-gold)",
                        color: "var(--landing-gold-fg)",
                      }
                    : { color: "var(--landing-text-secondary)" }
                }
              >
                Login with OTP
              </button>
              <button
                type="button"
                onClick={() => setView("password")}
                aria-pressed={view === "password"}
                className="rounded-(--landing-radius-full) px-5 py-2.5 font-bold transition-colors"
                style={
                  view === "password"
                    ? {
                        background: "var(--landing-gold)",
                        color: "var(--landing-gold-fg)",
                      }
                    : { color: "var(--landing-text-secondary)" }
                }
              >
                Login with Password
              </button>
            </div>
          )}

          <h1
            className="mt-7 text-3xl font-black tracking-tight"
            style={{ color: "var(--landing-text-primary)" }}
          >
            {view === "register" ? "Sign Up" : "Login"}
          </h1>
          {redirect && view !== "register" && (
            <p
              className="mt-1.5 text-xs"
              style={{ color: "var(--landing-text-secondary)" }}
            >
              Sign in to continue.
            </p>
          )}

          {view === "register" && (
            <div
              className="mt-6 inline-flex gap-1 rounded-(--landing-radius-full) p-1 text-sm"
              style={{
                background: "var(--landing-glass)",
                border: "1px solid var(--landing-border)",
              }}
            >
              <button
                type="button"
                onClick={() => setSignUpMethod("otp")}
                aria-pressed={signUpMethod === "otp"}
                className="rounded-(--landing-radius-full) px-5 py-2.5 font-bold transition-colors"
                style={
                  signUpMethod === "otp"
                    ? {
                        background: "var(--landing-gold)",
                        color: "var(--landing-gold-fg)",
                      }
                    : { color: "var(--landing-text-secondary)" }
                }
              >
                Sign Up with OTP
              </button>
              <button
                type="button"
                onClick={() => setSignUpMethod("password")}
                aria-pressed={signUpMethod === "password"}
                className="rounded-(--landing-radius-full) px-5 py-2.5 font-bold transition-colors"
                style={
                  signUpMethod === "password"
                    ? {
                        background: "var(--landing-gold)",
                        color: "var(--landing-gold-fg)",
                      }
                    : { color: "var(--landing-text-secondary)" }
                }
              >
                Sign Up with Password
              </button>
            </div>
          )}

          <div className="mt-2 max-w-md">
            {view === "otp" && <OtpLoginForm onSuccess={onSuccess} />}
            {view === "password" && <PasswordLoginForm onSuccess={onSuccess} />}
            {view === "register" && signUpMethod === "otp" && <SignUpForm onSuccess={onSuccess} />}
            {view === "register" && signUpMethod === "password" && <PasswordSignUpForm onSuccess={onSuccess} />}
          </div>

          <p
            className="mt-6 text-xs"
            style={{ color: "var(--landing-text-muted)" }}
          >
            {view === "register" ? (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setView("otp")}
                  className="underline outline-none focus-visible:ring-2 focus-visible:ring-(--landing-gold)"
                >
                  Login
                </button>
              </>
            ) : (
              <>
                Don&rsquo;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => setView("register")}
                  className="underline outline-none focus-visible:ring-2 focus-visible:ring-(--landing-gold)"
                >
                  Sign Up
                </button>
              </>
            )}
          </p>

          <p
            className="mt-3 text-xs"
            style={{ color: "var(--landing-text-muted)" }}
          >
            <Link
              to="/"
              className="underline outline-none focus-visible:ring-2 focus-visible:ring-(--landing-gold)"
            >
              Back to home
            </Link>
          </p>
        </div>

        <AvatarPanel />
      </div>
    </div>
  );
}

/**
 * The real promo banner asset (src/assets/hero.png) on a clean solid panel
 * — one deliberate custom touch (the image tilts toward the pointer) rather
 * than a stack of ambient background effects.
 */
function AvatarPanel() {
  const imgRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -8, y: px * 8 });
  }

  function handleMouseLeave() {
    setTilt({ x: 0, y: 0 });
  }

  return (
    <div
      aria-hidden="true"
      className="hidden justify-self-end lg:block"
      style={{ perspective: "1200px" }}
    >
      <div
        ref={imgRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="login-card relative aspect-[1448/1086] w-[660px] overflow-hidden rounded-(--landing-radius-lg) transition-transform duration-150 ease-out"
        style={{
          background: "var(--brand-showcase-bg-2)",
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transformStyle: "preserve-3d",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(145deg, color-mix(in srgb, var(--brand-showcase-bg-2) 88%, var(--landing-gold)), var(--brand-showcase-bg-1))",
          }}
        />
        <img
          src={promoImage}
          alt=""
          className="absolute inset-0 z-20 h-full w-full object-contain object-center drop-shadow-2xl"
        />
      </div>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-xs text-red-400">
      {message}
    </p>
  );
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-(--landing-radius-sm) border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300"
    >
      {message}
    </p>
  );
}

/** Solid, flat input surface — no glass/blur. */
function inputBoxStyle() {
  return {
    background: "var(--landing-bg-2)",
    border: "1px solid var(--landing-border)",
  };
}

function PhoneField({
  id,
  register,
  error,
}: {
  id: string;
  register: ReturnType<typeof useForm<{ phone: string }>>["register"];
  error?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-bold"
        style={{ color: "var(--landing-text-secondary)" }}
      >
        Enter Mobile Number*
      </label>
      <div
        className="flex items-center gap-2 rounded-(--landing-radius-sm) px-3"
        style={inputBoxStyle()}
      >
        <Phone
          className="size-4.5 shrink-0"
          style={{ color: "var(--landing-text-muted)" }}
          aria-hidden="true"
        />
        <span
          className="text-sm font-semibold"
          style={{ color: "var(--landing-text-primary)" }}
        >
          +91
        </span>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          placeholder="98765 43210"
          aria-invalid={!!error}
          className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-(--landing-text-muted)"
          style={{ color: "var(--landing-text-primary)" }}
          {...register("phone")}
        />
      </div>
      <FieldError message={error} />
    </div>
  );
}

/**
 * Shared code-entry step for both Login-with-OTP and Sign Up — same
 * request/resend/verify flow (usePhoneOtpFlow), just a different verify
 * button label and, for Sign Up, a referral code passed through to
 * verifyOtp so it lands on the newly-created account.
 */
function OtpCodeStep({
  flow,
  onSuccess,
  referralCode,
  verifyLabel,
}: {
  flow: ReturnType<typeof usePhoneOtpFlow>;
  onSuccess: () => void;
  referralCode?: string;
  verifyLabel: string;
}) {
  const codeForm = useForm<OtpCodeValues>({
    resolver: zodResolver(otpCodeSchema),
  });

  async function handleVerify(values: OtpCodeValues) {
    await flow.verify(values.code, referralCode, onSuccess);
  }

  return (
    <form
      onSubmit={codeForm.handleSubmit(handleVerify)}
      className="mt-6 flex flex-col gap-5"
      noValidate
    >
      <FormError message={flow.formError} />
      {flow.devCode && (
        <p
          className="flex items-center gap-2 rounded-(--landing-radius-sm) border border-(--landing-border) px-3 py-2 text-xs"
          style={{ color: "var(--landing-text-secondary)" }}
        >
          <Info
            className="size-4.5 shrink-0 text-(--landing-gold)"
            aria-hidden="true"
          />
          No SMS gateway connected — dev code:{" "}
          <span
            className="font-mono font-bold"
            style={{ color: "var(--landing-text-primary)" }}
          >
            {flow.devCode}
          </span>
        </p>
      )}
      <div>
        <label
          htmlFor="otp-code"
          className="mb-1.5 block text-xs font-bold"
          style={{ color: "var(--landing-text-secondary)" }}
        >
          Enter the 6-digit code sent to +91 {flow.phone.slice(3)}
        </label>
        <div
          className="flex items-center gap-2 rounded-(--landing-radius-sm) px-3"
          style={inputBoxStyle()}
        >
          <Lock
            className="size-4.5 shrink-0"
            style={{ color: "var(--landing-text-muted)" }}
            aria-hidden="true"
          />
          <input
            id="otp-code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="••••••"
            aria-invalid={!!codeForm.formState.errors.code}
            className="w-full bg-transparent py-3 text-sm tracking-[0.3em] outline-none placeholder:text-(--landing-text-muted)"
            style={{ color: "var(--landing-text-primary)" }}
            {...codeForm.register("code")}
          />
        </div>
        <FieldError message={codeForm.formState.errors.code?.message} />
      </div>

      <button
        type="submit"
        disabled={codeForm.formState.isSubmitting}
        className="login-btn-primary mt-2 rounded-(--landing-radius-sm) py-3.5 text-sm font-black outline-none focus-visible:ring-2 focus-visible:ring-(--landing-text-primary) disabled:cursor-not-allowed disabled:opacity-60"
      >
        {codeForm.formState.isSubmitting ? "Verifying…" : verifyLabel}
      </button>

      <div
        className="flex items-center justify-between text-xs"
        style={{ color: "var(--landing-text-muted)" }}
      >
        <button
          type="button"
          onClick={() => flow.setStep("phone")}
          className="underline outline-none focus-visible:ring-2 focus-visible:ring-(--landing-gold)"
        >
          Change number
        </button>
        <button
          type="button"
          onClick={flow.resend}
          disabled={flow.cooldown > 0}
          className="underline outline-none focus-visible:ring-2 focus-visible:ring-(--landing-gold) disabled:no-underline disabled:opacity-60"
        >
          {flow.cooldown > 0 ? `Resend in ${flow.cooldown}s` : "Resend code"}
        </button>
      </div>
    </form>
  );
}

function OtpLoginForm({ onSuccess }: { onSuccess: () => void }) {
  const flow = usePhoneOtpFlow();
  const phoneForm = useForm<{ phone: string }>({
    resolver: zodResolver(z.object({ phone: phoneLocalSchema })),
  });

  if (flow.step === "code") {
    return (
      <OtpCodeStep flow={flow} onSuccess={onSuccess} verifyLabel="Verify OTP" />
    );
  }

  return (
    <form
      onSubmit={phoneForm.handleSubmit((v) => flow.request(v.phone))}
      className="mt-6 flex flex-col gap-5"
      noValidate
    >
      <FormError message={flow.formError} />
      <PhoneField
        id="otp-phone"
        register={phoneForm.register}
        error={phoneForm.formState.errors.phone?.message}
      />
      <button
        type="submit"
        disabled={phoneForm.formState.isSubmitting}
        className="login-btn-primary mt-2 rounded-(--landing-radius-sm) py-3.5 text-sm font-black outline-none focus-visible:ring-2 focus-visible:ring-(--landing-text-primary) disabled:cursor-not-allowed disabled:opacity-60"
      >
        {phoneForm.formState.isSubmitting ? "Sending…" : "Request OTP"}
      </button>
    </form>
  );
}

/**
 * Matches the reference's Sign Up screen: phone, an optional promo code,
 * an 18+/terms checkbox, then the same OTP request/verify flow as Login
 * with OTP. No password field — see the module doc comment above for why.
 */
function SignUpForm({ onSuccess }: { onSuccess: () => void }) {
  const flow = usePhoneOtpFlow();
  const [promoCode, setPromoCode] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpPhoneValues>({
    resolver: zodResolver(signUpPhoneSchema),
    defaultValues: { agreeTerms: false },
  });

  async function onRequest(values: SignUpPhoneValues) {
    setPromoCode(values.promoCode ?? "");
    await flow.request(values.phone);
  }

  if (flow.step === "code") {
    return (
      <OtpCodeStep
        flow={flow}
        onSuccess={onSuccess}
        referralCode={promoCode || undefined}
        verifyLabel="Verify & Create Account"
      />
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onRequest)}
      className="mt-6 flex flex-col gap-5"
      noValidate
    >
      <FormError message={flow.formError} />
      <PhoneField
        id="signup-phone"
        register={register}
        error={errors.phone?.message}
      />

      <div>
        <label
          htmlFor="signup-promo"
          className="mb-1.5 block text-xs font-bold"
          style={{ color: "var(--landing-text-secondary)" }}
        >
          Enter Promocode (Optional)
        </label>
        <div
          className="flex items-center gap-2 rounded-(--landing-radius-sm) px-3"
          style={inputBoxStyle()}
        >
          <Ticket
            className="size-4.5 shrink-0"
            style={{ color: "var(--landing-text-muted)" }}
            aria-hidden="true"
          />
          <input
            id="signup-promo"
            type="text"
            placeholder="Enter Promo Code"
            className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-(--landing-text-muted)"
            style={{ color: "var(--landing-text-primary)" }}
            {...register("promoCode")}
          />
        </div>
      </div>

      <div>
        <label
          className="flex items-start gap-2.5 text-xs"
          style={{ color: "var(--landing-text-secondary)" }}
        >
          <input
            type="checkbox"
            className="mt-0.5 size-8 shrink-0 accent-(--landing-gold)"
            aria-invalid={!!errors.agreeTerms}
            {...register("agreeTerms")}
          />
          I certify that I am 18 years old and I agree to the T&amp;Cs and
          Privacy Policy
        </label>
        <FieldError message={errors.agreeTerms?.message} />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="login-btn-primary mt-2 rounded-(--landing-radius-sm) py-3.5 text-sm font-black outline-none focus-visible:ring-2 focus-visible:ring-(--landing-text-primary) disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Sending…" : "Request OTP"}
      </button>
    </form>
  );
}

function PasswordLoginForm({ onSuccess }: { onSuccess: () => void }) {
  const { login } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    try {
      await login(`+91${values.phone}`, values.password);
      onSuccess();
    } catch (err) {
      setFormError(friendlyErrorMessage(err instanceof ApiError ? err : err));
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mt-6 flex flex-col gap-5"
      noValidate
    >
      <FormError message={formError} />
      <PhoneField
        id="login-phone"
        register={register}
        error={errors.phone?.message}
      />

      <div>
        <label
          htmlFor="login-password"
          className="mb-1.5 block text-xs font-bold"
          style={{ color: "var(--landing-text-secondary)" }}
        >
          Password*
        </label>
        <div
          className="flex items-center gap-2 rounded-(--landing-radius-sm) px-3"
          style={inputBoxStyle()}
        >
          <Lock
            className="size-4.5 shrink-0"
            style={{ color: "var(--landing-text-muted)" }}
            aria-hidden="true"
          />
          <input
            id="login-password"
            type="password"
            placeholder="••••••••"
            aria-invalid={!!errors.password}
            className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-(--landing-text-muted)"
            style={{ color: "var(--landing-text-primary)" }}
            {...register("password")}
          />
        </div>
        <FieldError message={errors.password?.message} />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="login-btn-primary mt-2 rounded-(--landing-radius-sm) py-3.5 text-sm font-black outline-none focus-visible:ring-2 focus-visible:ring-(--landing-text-primary) disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}

/**
 * Alternative to SignUpForm's OTP flow — creates the account (and issues
 * tokens) in one request via POST /api/auth/register, instead of waiting on
 * a code with no SMS gateway to deliver it (auth.service.ts requestOtp).
 * Still collects phone, same as OTP Sign Up — register() requires it so the
 * resulting account can also use "Login with Password" afterward.
 */
function PasswordSignUpForm({ onSuccess }: { onSuccess: () => void }) {
  const { register: createAccount } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordSignUpValues>({
    resolver: zodResolver(passwordSignUpSchema),
    defaultValues: { agreeTerms: false },
  });

  async function onSubmit(values: PasswordSignUpValues) {
    setFormError(null);
    try {
      await createAccount(values.username, `+91${values.phone}`, values.password);
      onSuccess();
    } catch (err) {
      setFormError(friendlyErrorMessage(err instanceof ApiError ? err : err));
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mt-6 flex flex-col gap-5"
      noValidate
    >
      <FormError message={formError} />

      <div>
        <label
          htmlFor="signup-password-username"
          className="mb-1.5 block text-xs font-bold"
          style={{ color: "var(--landing-text-secondary)" }}
        >
          Full Name*
        </label>
        <div
          className="flex items-center gap-2 rounded-(--landing-radius-sm) px-3"
          style={inputBoxStyle()}
        >
          <input
            id="signup-password-username"
            type="text"
            placeholder="Your name"
            aria-invalid={!!errors.username}
            className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-(--landing-text-muted)"
            style={{ color: "var(--landing-text-primary)" }}
            {...register("username")}
          />
        </div>
        <FieldError message={errors.username?.message} />
      </div>

      <PhoneField
        id="signup-password-phone"
        register={register}
        error={errors.phone?.message}
      />

      <div>
        <label
          htmlFor="signup-password-password"
          className="mb-1.5 block text-xs font-bold"
          style={{ color: "var(--landing-text-secondary)" }}
        >
          Password*
        </label>
        <div
          className="flex items-center gap-2 rounded-(--landing-radius-sm) px-3"
          style={inputBoxStyle()}
        >
          <Lock
            className="size-4.5 shrink-0"
            style={{ color: "var(--landing-text-muted)" }}
            aria-hidden="true"
          />
          <input
            id="signup-password-password"
            type="password"
            placeholder="••••••••"
            aria-invalid={!!errors.password}
            className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-(--landing-text-muted)"
            style={{ color: "var(--landing-text-primary)" }}
            {...register("password")}
          />
        </div>
        <FieldError message={errors.password?.message} />
      </div>

      <div>
        <label
          htmlFor="signup-password-confirm"
          className="mb-1.5 block text-xs font-bold"
          style={{ color: "var(--landing-text-secondary)" }}
        >
          Confirm Password*
        </label>
        <div
          className="flex items-center gap-2 rounded-(--landing-radius-sm) px-3"
          style={inputBoxStyle()}
        >
          <Lock
            className="size-4.5 shrink-0"
            style={{ color: "var(--landing-text-muted)" }}
            aria-hidden="true"
          />
          <input
            id="signup-password-confirm"
            type="password"
            placeholder="••••••••"
            aria-invalid={!!errors.confirmPassword}
            className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-(--landing-text-muted)"
            style={{ color: "var(--landing-text-primary)" }}
            {...register("confirmPassword")}
          />
        </div>
        <FieldError message={errors.confirmPassword?.message} />
      </div>

      <div>
        <label
          className="flex items-start gap-2.5 text-xs"
          style={{ color: "var(--landing-text-secondary)" }}
        >
          <input
            type="checkbox"
            className="mt-0.5 size-8 shrink-0 accent-(--landing-gold)"
            aria-invalid={!!errors.agreeTerms}
            {...register("agreeTerms")}
          />
          I certify that I am 18 years old and I agree to the T&amp;Cs and
          Privacy Policy
        </label>
        <FieldError message={errors.agreeTerms?.message} />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="login-btn-primary mt-2 rounded-(--landing-radius-sm) py-3.5 text-sm font-black outline-none focus-visible:ring-2 focus-visible:ring-(--landing-text-primary) disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Creating account…" : "Create Account"}
      </button>
    </form>
  );
}

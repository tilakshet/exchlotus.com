import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Eye, EyeOff, Lock, Phone, Ticket, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import * as authApi from "@/api/auth.api";
import { ApiError, friendlyErrorMessage } from "@/api/api-error";
import { Logo } from "@/components/shared/Logo";
import promoImage from "@/assets/hero.png";
import type { Gender } from "@/types/profile";

interface LoginSearch {
  redirect?: string;
  view?: View;
  suspended?: boolean;
  idle?: boolean;
  /** Set by useSocketConnection's session:revoked handler — a newer login elsewhere just kicked this device out (single-active-session enforcement, see Player.sessionVersion in schema.prisma). */
  sessionRevoked?: boolean;
  /** Set after a successful Reset Password, so the login view can show a confirmation banner. */
  resetDone?: boolean;
  /** Pre-fills and submits Sign Up's referral code — carried in via a shared referral link (see dashboard.refer-earn.tsx / backend referral.service.ts referralLink, which generates `?ref=CODE`). `promo` is also accepted for backward compatibility with links shared before this param was renamed. */
  referralCode?: string;
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    view:
      search.view === "register" ||
      search.view === "login" ||
      search.view === "forgot" ||
      search.view === "reset"
        ? search.view
        : undefined,
    suspended: search.suspended === "1" || search.suspended === true,
    idle: search.idle === "1" || search.idle === true,
    sessionRevoked: search.sessionRevoked === "1" || search.sessionRevoked === true,
    resetDone: search.resetDone === "1" || search.resetDone === true,
    referralCode:
      typeof search.ref === "string" && search.ref.trim() !== ""
        ? search.ref.trim().slice(0, 40)
        : typeof search.promo === "string" && search.promo.trim() !== ""
          ? search.promo.trim().slice(0, 40)
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

const genderLocalSchema = z.enum(["MALE", "FEMALE", "OTHER"], { message: "Select your gender" });

const passwordSignUpSchema = z
  .object({
    username: z.string().min(2, "Enter your name").max(40),
    phone: phoneLocalSchema,
    gender: genderLocalSchema,
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

const forgotPhoneSchema = z.object({
  phone: phoneLocalSchema,
});
type ForgotPhoneValues = z.infer<typeof forgotPhoneSchema>;

const resetPasswordFormSchema = z
  .object({
    newPassword: z.string().min(8, "At least 8 characters").max(72),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;

type View = "login" | "register" | "forgot" | "reset";

/**
 * Real auth (routed through useAuth() → the backend's JWT endpoints).
 * Phone number is the identifier for both Login and Sign Up. There is no
 * CAPTCHA anywhere — the SMS OTP proves a real user on Sign Up / Forgot
 * Password, and authLimiter (backend rate-limit.ts) covers brute force.
 * - Login: phone + password.
 * - Sign Up: the mobile number must be verified by SMS OTP (Verify button
 *   on the phone field) before the form can be submitted.
 * - Forgot Password: enter the account's mobile number → SMS OTP → set a
 *   new password.
 */
function LoginPage() {
  const { redirect, view: viewParam, suspended, idle, sessionRevoked, resetDone, referralCode } = Route.useSearch();
  const navigate = useNavigate();
  // Derived directly from the URL on every render — not copied into local
  // state. A `useState(viewParam ?? ...)` initializer only runs on the
  // component's first mount, so a later search-param-only navigation (e.g.
  // clicking "Forgot Password?", which changes ?view= without unmounting
  // this route) silently updated the URL while the rendered view stayed
  // stuck on whatever it was — the URL and the screen could drift apart
  // (repeated clicks looked like nothing happened; a refresh, which does
  // fully remount, would suddenly "jump" to whatever the URL had drifted
  // to). Reading it straight from useSearch() makes the URL the single
  // source of truth, so every navigation path (Link clicks, goToView,
  // back/forward, refresh) always agrees with what's on screen.
  const view: View = viewParam ?? (referralCode ? "register" : "login");
  // Carries the resetToken from Forgot Password's identify step into its
  // set-new-password step — never put in the URL/search params, it's a
  // one-time credential (see auth.service.ts resetPassword).
  const [resetToken, setResetToken] = useState<string | null>(null);

  function onSuccess() {
    navigate({ to: (redirect ?? "/dashboard") as "/dashboard" });
  }

  // `replace: true` — these are tab-style mode switches on one page, not
  // meaningfully distinct pages, so they don't pile up in the back-button
  // history (matches how the old local-state toggle used to feel).
  function goToView(next: View) {
    navigate({ to: "/login", search: (prev) => ({ ...prev, view: next }), replace: true });
  }

  const titleByView: Record<View, string> = {
    login: "Login",
    register: "Sign Up",
    forgot: "Forgot Password",
    reset: "Reset Password",
  };

  return (
    <div className="login-gaming-bg relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
      <div className="relative grid w-full max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(460px,560px)_1fr] lg:gap-16">
        <div
          className="login-card landing-glow relative rounded-(--landing-radius-lg) p-7 shadow-token-4 sm:p-10 lg:min-h-[620px]"
          style={{ background: "var(--landing-bg-3)" }}
        >
          <Link
            to="/"
            aria-label="Close and return to home"
            className="absolute right-4 top-4 flex size-14 items-center justify-center rounded-full text-(--landing-text-secondary) outline-none transition-colors hover:bg-(--landing-hover-tint) hover:text-(--landing-text-primary) focus-visible:ring-2 focus-visible:ring-(--landing-gold)"
          >
            <X className="size-9" aria-hidden="true" />
          </Link>

          <div className="flex items-center gap-3">
            <Logo heightClass="h-20" />
          </div>

          <h1
            className="mt-7 text-3xl font-black tracking-tight"
            style={{ color: "var(--landing-text-primary)" }}
          >
            {titleByView[view]}
          </h1>
          {redirect && view === "login" && !suspended && !idle && !sessionRevoked && (
            <p
              className="mt-1.5 text-xs"
              style={{ color: "var(--landing-text-secondary)" }}
            >
              Sign in to continue.
            </p>
          )}

          {suspended && (
            <p
              role="alert"
              className="mt-3 rounded-(--landing-radius-sm) border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300"
            >
              Your account has been suspended. Contact support for help.
            </p>
          )}

          {idle && !suspended && (
            <p
              role="status"
              className="mt-3 rounded-(--landing-radius-sm) border border-(--landing-border) bg-(--landing-glass) px-3 py-2 text-xs"
              style={{ color: "var(--landing-text-secondary)" }}
            >
              You were logged out after 10 minutes of inactivity. Log back in to continue.
            </p>
          )}

          {sessionRevoked && !suspended && (
            <p
              role="status"
              className="mt-3 rounded-(--landing-radius-sm) border border-(--landing-border) bg-(--landing-glass) px-3 py-2 text-xs"
              style={{ color: "var(--landing-text-secondary)" }}
            >
              You were logged out because your account was signed in on another device.
            </p>
          )}

          {resetDone && view === "login" && (
            <p
              role="status"
              className="mt-3 rounded-(--landing-radius-sm) border border-(--landing-border) bg-(--landing-glass) px-3 py-2 text-xs"
              style={{ color: "var(--landing-text-secondary)" }}
            >
              Your password has been reset. Log in with your new password.
            </p>
          )}

          <div className="mt-2 max-w-md">
            {view === "login" && <LoginForm onSuccess={onSuccess} />}
            {view === "register" && <RegisterForm onSuccess={onSuccess} initialReferralCode={referralCode} />}
            {view === "forgot" && (
              <ForgotPasswordForm
                onIdentified={(token) => {
                  setResetToken(token);
                  goToView("reset");
                }}
              />
            )}
            {view === "reset" && (
              <ResetPasswordForm
                resetToken={resetToken}
                onDone={() => navigate({ to: "/login", search: (prev) => ({ ...prev, view: "login", resetDone: true }) })}
                onRestart={() => {
                  setResetToken(null);
                  goToView("forgot");
                }}
              />
            )}
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
                  onClick={() => goToView("login")}
                  className="underline outline-none focus-visible:ring-2 focus-visible:ring-(--landing-gold)"
                >
                  Login
                </button>
              </>
            ) : view === "login" ? (
              <>
                Don&rsquo;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => goToView("register")}
                  className="underline outline-none focus-visible:ring-2 focus-visible:ring-(--landing-gold)"
                >
                  Sign Up
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => goToView("login")}
                className="underline outline-none focus-visible:ring-2 focus-visible:ring-(--landing-gold)"
              >
                Back to Login
              </button>
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
 * Real promo banner asset (src/assets/hero.png) on a clean solid panel —
 * one deliberate custom touch (the image tilts toward the pointer) rather
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
  readOnly = false,
  rightSlot,
}: {
  id: string;
  register: ReturnType<typeof useForm<{ phone: string }>>["register"];
  error?: string;
  /** Locked once the number has been OTP-verified (Sign Up) or a code has been sent (Forgot Password). */
  readOnly?: boolean;
  /** Trailing control inside the field box — the "Verify" button / "Verified" badge on Sign Up. */
  rightSlot?: ReactNode;
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
        className="login-input-box flex items-center gap-2 rounded-(--landing-radius-sm) px-3"
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
          readOnly={readOnly}
          className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-(--landing-text-muted) read-only:opacity-70"
          style={{ color: "var(--landing-text-primary)" }}
          {...register("phone")}
        />
        {rightSlot}
      </div>
      <FieldError message={error} />
    </div>
  );
}

/**
 * 1s-tick countdown used for the "Resend code in Ns" cooldown — mirrors the
 * backend's 60s per-phone OTP resend limit (auth.service.ts
 * OTP_RESEND_COOLDOWN_SECONDS).
 */
function useCountdown(): [number, (seconds: number) => void] {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);
  return [remaining, setRemaining];
}

/**
 * The "enter the 6-digit code" sub-panel shared by Sign Up phone
 * verification and Forgot Password. Owns only the code input; the parent
 * owns send/verify state and the phone number itself.
 */
function OtpPanel({
  onConfirm,
  onResend,
  resendIn,
  sending,
  confirming,
  error,
  info,
}: {
  onConfirm: (code: string) => void;
  onResend: () => void;
  resendIn: number;
  sending: boolean;
  confirming: boolean;
  error: string | null;
  info: string | null;
}) {
  const [code, setCode] = useState("");
  return (
    <div
      className="mt-2 rounded-(--landing-radius-sm) p-3"
      style={inputBoxStyle()}
    >
      <label
        htmlFor="otp-input"
        className="mb-1.5 block text-xs font-bold"
        style={{ color: "var(--landing-text-secondary)" }}
      >
        Enter the 6-digit code sent to your mobile*
      </label>
      <div className="flex items-center gap-2">
        <div
          className="login-input-box flex flex-1 items-center rounded-(--landing-radius-sm) px-3"
          style={inputBoxStyle()}
        >
          <input
            id="otp-input"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="––––––"
            className="w-full bg-transparent py-3 text-sm tracking-[0.4em] outline-none placeholder:text-(--landing-text-muted)"
            style={{ color: "var(--landing-text-primary)" }}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
        </div>
        <button
          type="button"
          disabled={code.length !== 6 || confirming}
          onClick={() => onConfirm(code)}
          className="login-btn-primary shrink-0 rounded-(--landing-radius-sm) px-4 py-3 text-xs font-black outline-none focus-visible:ring-2 focus-visible:ring-(--landing-text-primary) disabled:cursor-not-allowed disabled:opacity-60"
        >
          {confirming ? "Verifying…" : "Confirm"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-400">
          {error}
        </p>
      )}
      {info && !error && (
        <p className="mt-1 text-xs" style={{ color: "var(--landing-text-muted)" }}>
          {info}
        </p>
      )}
      <button
        type="button"
        disabled={resendIn > 0 || sending}
        onClick={onResend}
        className="mt-2 text-xs underline outline-none focus-visible:ring-2 focus-visible:ring-(--landing-gold) disabled:no-underline disabled:opacity-60"
        style={{ color: "var(--landing-text-muted)" }}
      >
        {sending ? "Sending…" : resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
      </button>
    </div>
  );
}

/** Drives which avatar badge (UserAvatar.tsx) the account gets — collected at signup so it's set from day one. */
function GenderField({
  id,
  register,
  error,
}: {
  id: string;
  register: ReturnType<typeof useForm<{ gender: Gender }>>["register"];
  error?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-bold"
        style={{ color: "var(--landing-text-secondary)" }}
      >
        Gender*
      </label>
      <div
        className="login-input-box flex items-center gap-2 rounded-(--landing-radius-sm) px-3"
        style={inputBoxStyle()}
      >
        <select
          id={id}
          defaultValue=""
          aria-invalid={!!error}
          className="w-full bg-transparent py-3 text-sm outline-none"
          style={{ color: "var(--landing-text-primary)" }}
          {...register("gender")}
        >
          {/* Options are a native OS-rendered popup, not styled by the
              parent's bg-transparent — without an explicit background/color
              here they inherit a white system background with light text,
              i.e. invisible. */}
          <option value="" disabled style={{ background: "var(--landing-bg-2)", color: "var(--landing-text-muted)" }}>
            Select gender
          </option>
          <option value="MALE" style={{ background: "var(--landing-bg-2)", color: "var(--landing-text-primary)" }}>
            Male
          </option>
          <option value="FEMALE" style={{ background: "var(--landing-bg-2)", color: "var(--landing-text-primary)" }}>
            Female
          </option>
          <option value="OTHER" style={{ background: "var(--landing-bg-2)", color: "var(--landing-text-primary)" }}>
            Other / Prefer not to say
          </option>
        </select>
      </div>
      <FieldError message={error} />
    </div>
  );
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const { login } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
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
          className="login-input-box flex items-center gap-2 rounded-(--landing-radius-sm) px-3"
          style={inputBoxStyle()}
        >
          <Lock
            className="size-4.5 shrink-0"
            style={{ color: "var(--landing-text-muted)" }}
            aria-hidden="true"
          />
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            aria-invalid={!!errors.password}
            className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-(--landing-text-muted)"
            style={{ color: "var(--landing-text-primary)" }}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="login-icon-btn flex size-9 shrink-0 items-center justify-center rounded-(--landing-radius-sm) outline-none focus-visible:ring-2 focus-visible:ring-(--landing-gold)"
          >
            {showPassword ? (
              <EyeOff className="size-4.5" style={{ color: "var(--landing-text-secondary)" }} aria-hidden="true" />
            ) : (
              <Eye className="size-4.5" style={{ color: "var(--landing-text-secondary)" }} aria-hidden="true" />
            )}
          </button>
        </div>
        <FieldError message={errors.password?.message} />
        <Link
          to="/login"
          search={(prev) => ({ ...prev, view: "forgot" })}
          className="mt-1.5 inline-block text-xs underline outline-none focus-visible:ring-2 focus-visible:ring-(--landing-gold)"
          style={{ color: "var(--landing-text-muted)" }}
        >
          Forgot Password?
        </Link>
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

function RegisterForm({ onSuccess, initialReferralCode }: { onSuccess: () => void; initialReferralCode?: string }) {
  const { register: createAccount } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PasswordSignUpValues>({
    resolver: zodResolver(passwordSignUpSchema),
    defaultValues: { agreeTerms: false },
  });
  // Pre-filled from a shared referral link's ?ref=CODE (see
  // dashboard.refer-earn.tsx), but still editable — someone can also type
  // in a friend's code by hand. Validated entirely server-side
  // (auth.service.ts register() → referral.service.ts attributeReferral):
  // an invalid/unknown code is silently ignored rather than blocking
  // account creation.
  const [referralCode, setReferralCode] = useState(initialReferralCode ?? "");

  // Phone-ownership OTP. `verifiedPhone` is the exact digit string that was
  // confirmed — if the user edits the number afterwards it no longer
  // matches `phoneDigits` and they must re-verify.
  const phoneDigits = watch("phone") ?? "";
  const phoneValid = /^\d{7,13}$/.test(phoneDigits);
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
  const phoneVerified = verifiedPhone !== null && verifiedPhone === phoneDigits;
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpInfo, setOtpInfo] = useState<string | null>(null);
  const [otpSending, setOtpSending] = useState(false);
  const [otpConfirming, setOtpConfirming] = useState(false);
  const [resendIn, setResendIn] = useCountdown();

  async function requestOtp() {
    setOtpError(null);
    setOtpInfo(null);
    setOtpSending(true);
    try {
      const { devCode } = await authApi.sendSignupOtp(`+91${phoneDigits}`);
      setOtpOpen(true);
      setResendIn(60);
      setOtpInfo(devCode ? `Dev mode — your code is ${devCode}` : "Code sent to your mobile.");
    } catch (err) {
      setOtpError(friendlyErrorMessage(err instanceof ApiError ? err : err));
    } finally {
      setOtpSending(false);
    }
  }

  async function confirmOtp(code: string) {
    setOtpError(null);
    setOtpConfirming(true);
    try {
      await authApi.verifySignupOtp({ phone: `+91${phoneDigits}`, code });
      setVerifiedPhone(phoneDigits);
      setOtpOpen(false);
      setOtpInfo(null);
    } catch (err) {
      setOtpError(friendlyErrorMessage(err instanceof ApiError ? err : err));
    } finally {
      setOtpConfirming(false);
    }
  }

  async function onSubmit(values: PasswordSignUpValues) {
    setFormError(null);
    if (!phoneVerified) {
      setFormError("Please verify your mobile number to register");
      return;
    }
    try {
      await createAccount(values.username, `+91${values.phone}`, values.password, values.gender, referralCode.trim() || undefined);
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
          htmlFor="signup-username"
          className="mb-1.5 block text-xs font-bold"
          style={{ color: "var(--landing-text-secondary)" }}
        >
          Full Name*
        </label>
        <div
          className="login-input-box flex items-center gap-2 rounded-(--landing-radius-sm) px-3"
          style={inputBoxStyle()}
        >
          <input
            id="signup-username"
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

      <div>
        <PhoneField
          id="signup-phone"
          register={register}
          error={errors.phone?.message}
          readOnly={phoneVerified}
          rightSlot={
            phoneVerified ? (
              <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-bold text-green-400">
                <Check className="size-4" aria-hidden="true" /> Verified
              </span>
            ) : (
              <button
                type="button"
                disabled={!phoneValid || otpSending}
                onClick={requestOtp}
                className="login-btn-primary shrink-0 rounded-(--landing-radius-sm) px-3 py-2 text-xs font-black outline-none focus-visible:ring-2 focus-visible:ring-(--landing-text-primary) disabled:cursor-not-allowed disabled:opacity-60"
              >
                {otpSending ? "Sending…" : otpOpen ? "Resend" : "Verify"}
              </button>
            )
          }
        />
        {otpOpen && !phoneVerified && (
          <OtpPanel
            onConfirm={confirmOtp}
            onResend={requestOtp}
            resendIn={resendIn}
            sending={otpSending}
            confirming={otpConfirming}
            error={otpError}
            info={otpInfo}
          />
        )}
        {!otpOpen && otpError && (
          <p role="alert" className="mt-1 text-xs text-red-400">
            {otpError}
          </p>
        )}
        {phoneVerified && (
          <button
            type="button"
            onClick={() => {
              setVerifiedPhone(null);
              setOtpOpen(false);
              setOtpError(null);
            }}
            className="mt-1 text-xs underline outline-none focus-visible:ring-2 focus-visible:ring-(--landing-gold)"
            style={{ color: "var(--landing-text-muted)" }}
          >
            Change number
          </button>
        )}
      </div>

      <GenderField
        id="signup-gender"
        register={register}
        error={errors.gender?.message}
      />

      <div>
        <label
          htmlFor="signup-referral"
          className="mb-1.5 block text-xs font-bold"
          style={{ color: "var(--landing-text-secondary)" }}
        >
          Referral Code (Optional)
        </label>
        <div
          className="login-input-box flex items-center gap-2 rounded-(--landing-radius-sm) px-3"
          style={inputBoxStyle()}
        >
          <Ticket
            className="size-4.5 shrink-0"
            style={{ color: "var(--landing-text-muted)" }}
            aria-hidden="true"
          />
          <input
            id="signup-referral"
            type="text"
            placeholder="Friend's referral code"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            className="w-full bg-transparent py-3 text-sm uppercase outline-none placeholder:text-(--landing-text-muted) placeholder:normal-case"
            style={{ color: "var(--landing-text-primary)" }}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="signup-password"
          className="mb-1.5 block text-xs font-bold"
          style={{ color: "var(--landing-text-secondary)" }}
        >
          Password*
        </label>
        <div
          className="login-input-box flex items-center gap-2 rounded-(--landing-radius-sm) px-3"
          style={inputBoxStyle()}
        >
          <Lock
            className="size-4.5 shrink-0"
            style={{ color: "var(--landing-text-muted)" }}
            aria-hidden="true"
          />
          <input
            id="signup-password"
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
          htmlFor="signup-confirm"
          className="mb-1.5 block text-xs font-bold"
          style={{ color: "var(--landing-text-secondary)" }}
        >
          Confirm Password*
        </label>
        <div
          className="login-input-box flex items-center gap-2 rounded-(--landing-radius-sm) px-3"
          style={inputBoxStyle()}
        >
          <Lock
            className="size-4.5 shrink-0"
            style={{ color: "var(--landing-text-muted)" }}
            aria-hidden="true"
          />
          <input
            id="signup-confirm"
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

/**
 * Forgot Password, step 1: enter the account's mobile number, receive an
 * SMS OTP, confirm it. A correct code hands back the single-use resetToken
 * (onIdentified) that authorizes the set-new-password step. Enumeration-
 * safe: an unknown number gets the same "code sent" treatment and simply
 * fails at the confirm step (no code was actually sent).
 */
function ForgotPasswordForm({ onIdentified }: { onIdentified: (resetToken: string) => void }) {
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpInfo, setOtpInfo] = useState<string | null>(null);
  const [otpSending, setOtpSending] = useState(false);
  const [otpConfirming, setOtpConfirming] = useState(false);
  const [resendIn, setResendIn] = useCountdown();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ForgotPhoneValues>({ resolver: zodResolver(forgotPhoneSchema) });

  const phoneDigits = watch("phone") ?? "";

  async function requestOtp() {
    setOtpError(null);
    setOtpInfo(null);
    setOtpSending(true);
    try {
      const { devCode } = await authApi.sendPasswordResetOtp(`+91${phoneDigits}`);
      setOtpOpen(true);
      setResendIn(60);
      setOtpInfo(devCode ? `Dev mode — your code is ${devCode}` : "If that number has an account, a code is on its way.");
    } catch (err) {
      setOtpError(friendlyErrorMessage(err instanceof ApiError ? err : err));
    } finally {
      setOtpSending(false);
    }
  }

  async function confirmOtp(code: string) {
    setOtpError(null);
    setOtpConfirming(true);
    try {
      const { resetToken } = await authApi.verifyPasswordResetOtp({ phone: `+91${phoneDigits}`, code });
      onIdentified(resetToken);
    } catch (err) {
      setOtpError(friendlyErrorMessage(err instanceof ApiError ? err : err));
    } finally {
      setOtpConfirming(false);
    }
  }

  // The <form> submit is step 1 (send the code); OtpPanel's own Confirm
  // button drives step 2 once it's open.
  function onSubmit() {
    if (!otpOpen) void requestOtp();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mt-6 flex flex-col gap-5"
      noValidate
    >
      <p className="text-xs" style={{ color: "var(--landing-text-secondary)" }}>
        Enter the mobile number linked to your account — we&rsquo;ll text you a one-time code, then you can set a new password.
      </p>

      <PhoneField
        id="forgot-phone"
        register={register}
        error={errors.phone?.message}
        readOnly={otpOpen}
      />

      {otpOpen ? (
        <>
          <OtpPanel
            onConfirm={confirmOtp}
            onResend={requestOtp}
            resendIn={resendIn}
            sending={otpSending}
            confirming={otpConfirming}
            error={otpError}
            info={otpInfo}
          />
          <button
            type="button"
            onClick={() => {
              setOtpOpen(false);
              setOtpError(null);
              setOtpInfo(null);
            }}
            className="self-start text-xs underline outline-none focus-visible:ring-2 focus-visible:ring-(--landing-gold)"
            style={{ color: "var(--landing-text-muted)" }}
          >
            Use a different number
          </button>
        </>
      ) : (
        <>
          {otpError && (
            <p role="alert" className="text-xs text-red-400">
              {otpError}
            </p>
          )}
          <button
            type="submit"
            disabled={otpSending}
            className="login-btn-primary mt-2 rounded-(--landing-radius-sm) py-3.5 text-sm font-black outline-none focus-visible:ring-2 focus-visible:ring-(--landing-text-primary) disabled:cursor-not-allowed disabled:opacity-60"
          >
            {otpSending ? "Sending…" : "Send OTP"}
          </button>
        </>
      )}
    </form>
  );
}

/** Forgot Password, step 2: set the new password, authorized by the resetToken from the OTP step. */
function ResetPasswordForm({ resetToken, onDone, onRestart }: { resetToken: string | null; onDone: () => void; onRestart: () => void }) {
  const [formError, setFormError] = useState<string | null>(resetToken ? null : "Your reset session has expired.");
  // Once the token's dead (never issued, expired, or already used), no
  // amount of retrying THIS form can succeed — the only way forward is
  // back to step 1 for a new one. Surfacing a direct "start over" action
  // here instead of just an error message, so the user isn't left to
  // figure out on their own that they need to navigate away and back.
  const [tokenDead, setTokenDead] = useState(!resetToken);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordFormSchema) });

  async function onSubmit(values: ResetPasswordFormValues) {
    setFormError(null);
    if (!resetToken) {
      setFormError("Your reset session has expired.");
      setTokenDead(true);
      return;
    }
    try {
      await authApi.resetPassword({ resetToken, newPassword: values.newPassword });
      onDone();
    } catch (err) {
      setFormError(friendlyErrorMessage(err instanceof ApiError ? err : err));
      if (err instanceof ApiError && err.code === "RESET_TOKEN_INVALID") setTokenDead(true);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mt-6 flex flex-col gap-5"
      noValidate
    >
      <FormError message={formError} />
      {tokenDead ? (
        <button
          type="button"
          onClick={onRestart}
          className="login-btn-primary rounded-(--landing-radius-sm) py-3.5 text-sm font-black outline-none focus-visible:ring-2 focus-visible:ring-(--landing-text-primary)"
        >
          Start Over
        </button>
      ) : (
        <>
          <div>
            <label
              htmlFor="reset-new-password"
              className="mb-1.5 block text-xs font-bold"
              style={{ color: "var(--landing-text-secondary)" }}
            >
              New Password*
            </label>
            <div
              className="login-input-box flex items-center gap-2 rounded-(--landing-radius-sm) px-3"
              style={inputBoxStyle()}
            >
              <Lock
                className="size-4.5 shrink-0"
                style={{ color: "var(--landing-text-muted)" }}
                aria-hidden="true"
              />
              <input
                id="reset-new-password"
                type="password"
                placeholder="••••••••"
                aria-invalid={!!errors.newPassword}
                className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-(--landing-text-muted)"
                style={{ color: "var(--landing-text-primary)" }}
                {...register("newPassword")}
              />
            </div>
            <FieldError message={errors.newPassword?.message} />
          </div>

          <div>
            <label
              htmlFor="reset-confirm-password"
              className="mb-1.5 block text-xs font-bold"
              style={{ color: "var(--landing-text-secondary)" }}
            >
              Confirm Password*
            </label>
            <div
              className="login-input-box flex items-center gap-2 rounded-(--landing-radius-sm) px-3"
              style={inputBoxStyle()}
            >
              <Lock
                className="size-4.5 shrink-0"
                style={{ color: "var(--landing-text-muted)" }}
                aria-hidden="true"
              />
              <input
                id="reset-confirm-password"
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="login-btn-primary mt-2 rounded-(--landing-radius-sm) py-3.5 text-sm font-black outline-none focus-visible:ring-2 focus-visible:ring-(--landing-text-primary) disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Resetting…" : "Reset Password"}
          </button>
        </>
      )}
    </form>
  );
}

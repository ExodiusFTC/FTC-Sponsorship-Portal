'use client'

import { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginInput } from '@/lib/schemas/auth'
import { useSignIn } from '@clerk/nextjs/legacy'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { useSearchParams, useRouter } from 'next/navigation'

// Surface a readable message from a Clerk error payload.
function clerkErrorMessage(err: unknown, fallback: string): string {
  const anyErr = err as { errors?: { longMessage?: string; message?: string }[] }
  return anyErr?.errors?.[0]?.longMessage ?? anyErr?.errors?.[0]?.message ?? fallback
}

type Mode = 'login' | 'forgot-request' | 'forgot-reset'

export function LoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const resetSuccess = searchParams.get('reset') === 'success'
  const redirectUrl = searchParams.get('redirect_url') || '/'
  const { isLoaded, signIn, setActive } = useSignIn()

  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [mode, setMode] = useState<Mode>('login')

  // Forgot-password local state
  const [resetEmail, setResetEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [resetNewPassword, setResetNewPassword] = useState('')
  const [resetSent, setResetSent] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const setSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setSize();

    type P = { x: number; y: number; v: number; o: number };
    let ps: P[] = [];
    let raf = 0;

    const make = () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      v: Math.random() * 0.25 + 0.05,
      o: Math.random() * 0.35 + 0.15,
    });

    const init = () => {
      ps = [];
      const count = Math.floor((canvas.width * canvas.height) / 9000);
      for (let i = 0; i < count; i++) ps.push(make());
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const isDark = !document.documentElement.hasAttribute('data-theme') || document.documentElement.getAttribute('data-theme') === 'dark';
      ps.forEach((p) => {
        p.y -= p.v;
        if (p.y < 0) {
          p.x = Math.random() * canvas.width;
          p.y = canvas.height + Math.random() * 40;
          p.v = Math.random() * 0.25 + 0.05;
          p.o = Math.random() * 0.35 + 0.15;
        }
        ctx.fillStyle = isDark ? `rgba(250,250,250,${p.o})` : `rgba(0,0,0,${p.o * 0.5})`;
        ctx.fillRect(p.x, p.y, 0.7, 2.2);
      });
      raf = requestAnimationFrame(draw);
    };

    const onResize = () => {
      setSize();
      init();
    };

    window.addEventListener("resize", onResize);
    init();
    raf = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function onSubmit(values: LoginInput) {
    if (!isLoaded || !signIn) return
    setIsPending(true)
    setError(null)
    try {
      const result = await signIn.create({
        identifier: values.email,
        password: values.password,
      })
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
        router.push(redirectUrl)
      } else {
        // No second factor is configured for this app; any other status is unexpected.
        setError('Unable to complete sign in. Please try again.')
        setIsPending(false)
      }
    } catch (err) {
      setError(clerkErrorMessage(err, 'Invalid email or password.'))
      setIsPending(false)
    }
  }

  // Forgot password — Step 1: send the reset code to the email.
  async function sendResetCode() {
    if (!isLoaded || !signIn) return
    setError(null)
    if (!resetEmail.trim()) {
      setError('Enter your email address to receive a reset code.')
      return
    }
    setIsPending(true)
    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: resetEmail.trim(),
      })
      setResetSent(true)
      setMode('forgot-reset')
    } catch (err) {
      setError(clerkErrorMessage(err, 'Could not send reset code. Check the email and try again.'))
    } finally {
      setIsPending(false)
    }
  }

  // Forgot password — Step 2: submit the code + new password.
  async function submitResetPassword() {
    if (!isLoaded || !signIn) return
    setError(null)
    if (!resetCode.trim()) {
      setError('Enter the 6-digit code sent to your email.')
      return
    }
    if (resetNewPassword.length < 12) {
      setError('Password must be at least 12 characters and include uppercase, lowercase, and a number.')
      return
    }
    setIsPending(true)
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: resetCode.trim(),
        password: resetNewPassword,
      })
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
        router.push(redirectUrl)
      } else {
        setError('Unable to reset password. Please try again.')
        setIsPending(false)
      }
    } catch (err) {
      setError(clerkErrorMessage(err, 'Invalid code or password. Please try again.'))
      setIsPending(false)
    }
  }

  function backToLogin() {
    setMode('login')
    setError(null)
    setResetSent(false)
    setResetCode('')
    setResetNewPassword('')
  }

  const cardTitle =
    mode === 'login' ? 'Log In' : 'Reset Password'
  const cardDescription =
    mode === 'login'
      ? 'Welcome back. Access your sponsorship portal.'
      : mode === 'forgot-request'
        ? 'Enter your email and we’ll send you a reset code.'
        : 'Enter the code we emailed you and choose a new password.'

  return (
    <section className="fixed inset-0 bg-background text-foreground overflow-y-auto">
      <style dangerouslySetInnerHTML={{ __html: `
        .accent-lines{position:absolute;inset:0;pointer-events:none;opacity:.7}
        .hline,.vline{position:absolute;background:var(--border);will-change:transform,opacity}
        .hline{left:0;right:0;height:1px;transform:scaleX(0);transform-origin:50% 50%;animation:drawX .8s cubic-bezier(.22,.61,.36,1) forwards}
        .vline{top:0;bottom:0;width:1px;transform:scaleY(0);transform-origin:50% 0%;animation:drawY .9s cubic-bezier(.22,.61,.36,1) forwards}
        .hline:nth-child(1){top:18%;animation-delay:.12s}
        .hline:nth-child(2){top:50%;animation-delay:.22s}
        .hline:nth-child(3){top:82%;animation-delay:.32s}
        .vline:nth-child(4){left:22%;animation-delay:.42s}
        .vline:nth-child(5){left:50%;animation-delay:.54s}
        .vline:nth-child(6){left:78%;animation-delay:.66s}
        @keyframes drawX{0%{transform:scaleX(0);opacity:0}60%{opacity:.95}100%{transform:scaleX(1);opacity:.7}}
        @keyframes drawY{0%{transform:scaleY(0);opacity:0}60%{opacity:.95}100%{transform:scaleY(1);opacity:.7}}

        .card-animate {
          opacity: 0;
          transform: translateY(20px);
          animation: fadeUp 0.8s cubic-bezier(.22,.61,.36,1) 0.4s forwards;
        }
        @keyframes fadeUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      ` }} />

      {/* Animated accent lines */}
      <div className="accent-lines fixed inset-0">
        <div className="hline" />
        <div className="hline" />
        <div className="hline" />
        <div className="vline" />
        <div className="vline" />
        <div className="vline" />
      </div>

      {/* Particles */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none dark:opacity-50 opacity-40 mix-blend-multiply dark:mix-blend-screen"
      />

      {/* Header */}
      <header className="fixed left-0 right-0 top-0 flex items-center justify-between px-6 py-4 border-b border-border/80 z-20 bg-background/50 backdrop-blur">
        <Link href="/" className="text-xs tracking-[0.14em] uppercase text-muted-foreground hover:text-foreground transition-colors">
          MATCHMAKER
        </Link>
        <Link href="/signup">
          <Button
            variant="outline"
            className="h-9 rounded-lg border-border bg-card text-foreground hover:bg-accent"
          >
            <span className="mr-2">Sign Up</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </header>

      {/* Centered Login Card */}
      <div className="min-h-screen w-full grid place-items-center px-4 py-24 relative z-10">
        <Card className="card-animate w-full max-w-md border-border bg-card/70 backdrop-blur shadow-2xl">
          <CardHeader className="border-b border-border/50 pb-6 text-center">
            <CardTitle className="text-2xl text-foreground font-semibold tracking-tight">{cardTitle}</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              {cardDescription}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-8">
            {/* Shared alerts */}
            {resetSuccess && mode === 'login' && (
              <Alert className="bg-emerald-500/10 border-emerald-500/20 text-emerald-600 mb-6">
                <AlertDescription>Password updated successfully. Log in with your new password.</AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* LOGIN MODE */}
            {mode === 'login' && (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground/80">Email Address</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            className="bg-background border-border text-foreground placeholder:text-muted-foreground h-11"
                            placeholder="coach@example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-foreground/80">Password</FormLabel>
                          <button
                            type="button"
                            onClick={() => {
                              setError(null)
                              setResetEmail(form.getValues('email'))
                              setMode('forgot-request')
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Forgot password?
                          </button>
                        </div>
                        <FormControl>
                          <Input
                            type="password"
                            className="bg-background border-border text-foreground h-11"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full h-11 bg-primary text-primary-foreground hover:opacity-90 font-semibold text-base transition-all duration-200"
                    disabled={isPending || !isLoaded}
                  >
                    {isPending ? 'Authenticating...' : 'Log In'}
                  </Button>
                </form>
              </Form>
            )}

            {/* FORGOT PASSWORD — REQUEST CODE */}
            {mode === 'forgot-request' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground/80">Email Address</label>
                  <Input
                    type="email"
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground h-11"
                    placeholder="coach@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  onClick={sendResetCode}
                  className="w-full h-11 bg-primary text-primary-foreground hover:opacity-90 font-semibold text-base"
                  disabled={isPending || !isLoaded}
                >
                  {isPending ? 'Sending…' : 'Send Reset Code'}
                </Button>
                <button
                  type="button"
                  onClick={backToLogin}
                  className="flex items-center justify-center w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back to login
                </button>
              </div>
            )}

            {/* FORGOT PASSWORD — ENTER CODE + NEW PASSWORD */}
            {mode === 'forgot-reset' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground/80">Verification Code</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground h-11 tracking-[0.3em] text-center"
                    placeholder="123456"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    We emailed a 6-digit code to {resetEmail || 'your email'}.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground/80">New Password</label>
                  <Input
                    type="password"
                    className="bg-background border-border text-foreground h-11"
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be at least 12 characters and include uppercase, lowercase, and a number.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={submitResetPassword}
                  className="w-full h-11 bg-primary text-primary-foreground hover:opacity-90 font-semibold text-base"
                  disabled={isPending || !isLoaded}
                >
                  {isPending ? 'Resetting…' : 'Reset Password & Sign In'}
                </Button>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setMode('forgot-request')}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Resend code
                  </button>
                  <button
                    type="button"
                    onClick={backToLogin}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Back to login
                  </button>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="border-t border-border/50 flex justify-center py-6 bg-accent/10 rounded-b-xl">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-foreground hover:underline font-medium">
                Create one
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </section>
  )
}

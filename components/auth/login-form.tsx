'use client'

import { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginInput } from '@/lib/schemas/auth'
import { signIn } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'
import { RateLimitNotice } from '@/components/ui/rate-limit-notice'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [rateLimitData, setRateLimitData] = useState<{ retryAfterSeconds: number; limit: number } | null>(null)
  const [isPending, setIsPending] = useState(false)
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
      ps.forEach((p) => {
        p.y -= p.v;
        if (p.y < 0) {
          p.x = Math.random() * canvas.width;
          p.y = canvas.height + Math.random() * 40;
          p.v = Math.random() * 0.25 + 0.05;
          p.o = Math.random() * 0.35 + 0.15;
        }
        ctx.fillStyle = `rgba(250,250,250,${p.o})`;
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
    setIsPending(true)
    setError(null)
    setRateLimitData(null)
    const result = await signIn(values)
    if (result?.error === 'rate_limited' && 'retryAfterSeconds' in result) {
      setRateLimitData({ retryAfterSeconds: result.retryAfterSeconds as number, limit: (result as { limit?: number }).limit || 0 })
      setIsPending(false)
      return
    }
    if (result?.error) {
      setError(result.error)
      setIsPending(false)
    }
  }

  return (
    <section className="fixed inset-0 bg-zinc-950 text-zinc-50 overflow-y-auto">
      <style dangerouslySetInnerHTML={{ __html: `
        .accent-lines{position:absolute;inset:0;pointer-events:none;opacity:.7}
        .hline,.vline{position:absolute;background:#27272a;will-change:transform,opacity}
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

      {/* Subtle vignette */}
      <div className="fixed inset-0 pointer-events-none [background:radial-gradient(80%_60%_at_50%_30%,rgba(255,255,255,0.06),transparent_60%)]" />

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
        className="fixed inset-0 w-full h-full opacity-50 mix-blend-screen pointer-events-none"
      />

      {/* Header */}
      <header className="fixed left-0 right-0 top-0 flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 z-20 bg-zinc-950/50 backdrop-blur">
        <Link href="/" className="text-xs tracking-[0.14em] uppercase text-zinc-400 hover:text-zinc-100 transition-colors">
          MATCHMAKER
        </Link>
        <Link href="/signup">
          <Button
            variant="outline"
            className="h-9 rounded-lg border-zinc-800 bg-zinc-900 text-zinc-50 hover:bg-zinc-900/80"
          >
            <span className="mr-2">Sign Up</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </header>

      {/* Centered Login Card */}
      <div className="min-h-screen w-full grid place-items-center px-4 py-24 relative z-10">
        <Card className="card-animate w-full max-w-md border-zinc-800 bg-zinc-900/70 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/60 shadow-2xl">
          <CardHeader className="border-b border-zinc-800/50 pb-6 text-center">
            <CardTitle className="text-2xl text-zinc-50 font-semibold tracking-tight">Log In</CardTitle>
            <CardDescription className="text-zinc-400 mt-2">
              Welcome back. Access your sponsorship portal.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {error && (
                  <Alert variant="destructive" className="bg-red-950/50 border-red-900 text-red-200">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {rateLimitData && (
                  <RateLimitNotice retryAfterSeconds={rateLimitData.retryAfterSeconds} />
                )}
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-300">Email Address</FormLabel>
                      <FormControl>
                        <Input 
                          className="bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600 h-11" 
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
                        <FormLabel className="text-zinc-300">Password</FormLabel>
                        <Link 
                          href="/forgot-password" 
                          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <FormControl>
                        <Input 
                          type="password" 
                          className="bg-zinc-950 border-zinc-800 text-zinc-50 h-11" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full h-11 bg-zinc-50 text-zinc-900 hover:bg-zinc-200 font-semibold text-base transition-all duration-200" 
                  disabled={isPending}
                >
                  {isPending ? 'Authenticating...' : 'Log In'}
                </Button>
              </form>
            </Form>
          </CardContent>
          
          <CardFooter className="border-t border-zinc-800/50 flex justify-center py-6 bg-zinc-950/30">
            <p className="text-sm text-zinc-400">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-zinc-200 hover:underline font-medium">
                Create one
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </section>
  )
}

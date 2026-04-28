'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { forgotPassword } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

const schema = z.object({ email: z.string().trim().toLowerCase().email('Please enter a valid email address') })
type FormValues = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  async function onSubmit(values: FormValues) {
    setIsPending(true)
    setError(null)
    const result = await forgotPassword(values.email)
    setIsPending(false)
    if (result?.error) {
      setError(result.error)
    } else {
      setSent(true)
    }
  }

  return (
    <section className="fixed inset-0 bg-background text-foreground overflow-y-auto">
      <header className="fixed left-0 right-0 top-0 flex items-center justify-between px-6 py-4 border-b border-border/80 z-20 bg-background/50 backdrop-blur">
        <Link href="/" className="text-xs tracking-[0.14em] uppercase text-muted-foreground hover:text-foreground transition-colors">
          MATCHMAKER
        </Link>
      </header>

      <div className="min-h-screen w-full grid place-items-center px-4 py-24">
        <Card className="w-full max-w-md border-border bg-card/70 backdrop-blur shadow-2xl">
          <CardHeader className="border-b border-border/50 pb-6 text-center">
            <CardTitle className="text-2xl text-foreground font-semibold tracking-tight">Reset Password</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Enter your email and we'll send you a reset link.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-8">
            {sent ? (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                <p className="text-foreground font-medium">Check your inbox</p>
                <p className="text-sm text-muted-foreground">
                  If an account exists for <strong>{form.getValues('email')}</strong>, you'll receive a password reset link shortly.
                </p>
                <Link href="/login">
                  <Button variant="outline" className="mt-2">Back to Login</Button>
                </Link>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  {error && (
                    <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground/80">Email Address</FormLabel>
                        <FormControl>
                          <Input
                            className="bg-background border-border text-foreground placeholder:text-muted-foreground h-11"
                            placeholder="coach@example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full h-11 bg-primary text-primary-foreground hover:opacity-90 font-semibold"
                    disabled={isPending}
                  >
                    {isPending ? 'Sending…' : 'Send Reset Link'}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>

          <CardFooter className="border-t border-border/50 flex justify-center py-5 bg-accent/10">
            <p className="text-sm text-muted-foreground">
              Remember your password?{' '}
              <Link href="/login" className="text-foreground hover:underline font-medium">Log in</Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </section>
  )
}

'use client'

import { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { sponsorSignupSchema, type SponsorSignupInput } from '@/lib/schemas/sponsor-signup'
import { signUpSponsor } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ChevronDown, ChevronRight, ChevronLeft, ArrowRight, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

const INDUSTRIES = [
  'Technology', 'Manufacturing', 'Finance', 'Education', 'Healthcare', 'Energy', 'Retail', 'Other'
]

const FUNDING_FREQUENCIES = ['One-time', 'Quarterly', 'Annual'] as const

const FOCUS_AREAS = [
  'Engineering', 'Programming', 'Business/Marketing', 'Diversity & Inclusion', 'Community Outreach', 'General Support'
]

export function SponsorSignupWizard() {
  const [step, setStep] = useState(1)
  const totalSteps = 5
  const [error, setError] = useState<string | null>(null)
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

  const form = useForm<SponsorSignupInput>({
    resolver: zodResolver(sponsorSignupSchema) as any,
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      companyName: '',
      industry: '',
      website: '',
      phoneNumber: '',
      companyAddress: '',
      proposedCapCents: 100000, // $1000 default
      sponsorshipReason: '',
      fundingFrequency: 'Annual',
      industryFocus: [],
      geographicFocus: 'National',
      mentorshipOffered: false,
      ageConfirmed: false,
      coppaAcknowledged: false,
      tosAccepted: false,
    },
    mode: 'onTouched'
  })

  const nextStep = async () => {
    let fieldsToValidate: any[] = []
    if (step === 1) fieldsToValidate = ['fullName', 'email', 'password', 'confirmPassword']
    if (step === 2) fieldsToValidate = ['companyName', 'industry', 'website', 'phoneNumber', 'companyAddress']
    if (step === 3) fieldsToValidate = ['proposedCapCents', 'sponsorshipReason', 'fundingFrequency']
    if (step === 4) fieldsToValidate = ['industryFocus', 'geographicFocus']

    const isValid = await form.trigger(fieldsToValidate)

    if (isValid) {
      setStep(prev => Math.min(prev + 1, totalSteps))
      window.scrollTo(0, 0)
    }
  }

  const prevStep = () => {
    setStep(prev => Math.max(prev - 1, 1))
    window.scrollTo(0, 0)
  }

  async function onSubmit(values: SponsorSignupInput) {
    setIsPending(true)
    setError(null)
    const result = await signUpSponsor(values)
    if (result?.error) {
      setError(result.error)
      setIsPending(false)
    }
  }

  const toggleFocusArea = (area: string) => {
    const current = form.getValues('industryFocus') || []
    if (current.includes(area)) {
      form.setValue('industryFocus', current.filter(a => a !== area), { shouldValidate: true })
    } else {
      form.setValue('industryFocus', [...current, area], { shouldValidate: true })
    }
  }

  return (
    <section className="fixed inset-0 bg-background text-foreground overflow-y-auto">
      <style dangerouslySetInnerHTML={{
        __html: `
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

      <div className="accent-lines fixed inset-0">
        <div className="hline" /> <div className="hline" /> <div className="hline" />
        <div className="vline" /> <div className="vline" /> <div className="vline" />
      </div>

      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none opacity-40" />

      <header className="fixed left-0 right-0 top-0 flex items-center justify-between px-6 py-4 border-b border-border/80 z-20 bg-background/50 backdrop-blur">
        <Link href="/" className="text-xs tracking-[0.14em] uppercase text-muted-foreground hover:text-foreground transition-colors">
          MATCHMAKER
        </Link>
        <Link href="/login">
          <Button variant="outline" className="h-9 rounded-lg border-border bg-card text-foreground hover:bg-accent">
            <span className="mr-2">Login</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </header>

      <div className="min-h-screen w-full grid place-items-center px-4 py-24 relative z-10">
        <Card className="card-animate w-full max-w-2xl border-border bg-card/70 backdrop-blur shadow-2xl">
          <CardHeader className="border-b border-border/50 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <CardTitle className="text-2xl text-foreground">Sponsor Registration</CardTitle>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">Step {step} of {totalSteps}</span>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300 ease-out"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>
            <CardDescription className="mt-4 text-base text-muted-foreground">
              {step === 1 && "Account details for the company representative."}
              {step === 2 && "Tell us about your organization."}
              {step === 3 && "How would you like to support FTC teams?"}
              {step === 4 && "Define your focus areas and impact."}
              {step === 5 && "Review and accept our community policies."}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 text-foreground">
                {error && (
                  <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    {/* STEP 1: Representative Account */}
                    {step === 1 && (
                      <div className="space-y-5">
                        <FormField control={form.control} name="fullName" render={({ field }) => (
                          <FormItem><FormLabel>Representative Name</FormLabel><FormControl><Input placeholder="Jane Doe" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="email" render={({ field }) => (
                          <FormItem><FormLabel>Work Email Address</FormLabel><FormControl><Input type="email" placeholder="jane@company.com" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <FormField control={form.control} name="password" render={({ field }) => (
                            <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                            <FormItem><FormLabel>Confirm Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                      </div>
                    )}

                    {/* STEP 2: Company Identity */}
                    {step === 2 && (
                      <div className="space-y-5">
                        <FormField control={form.control} name="companyName" render={({ field }) => (
                          <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input placeholder="e.g. TechCorp Solutions" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <FormField control={form.control} name="industry" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Industry</FormLabel>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <FormControl><Button variant="outline" className="w-full justify-between font-normal">{field.value || "Select industry"} <ChevronDown className="h-4 w-4 opacity-50" /></Button></FormControl>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-full min-w-[200px]">
                                  {INDUSTRIES.map(i => <DropdownMenuItem key={i} onClick={() => field.onChange(i)}>{i}</DropdownMenuItem>)}
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="website" render={({ field }) => (
                            <FormItem><FormLabel>Website</FormLabel><FormControl><Input placeholder="https://company.com" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                        <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                          <FormItem><FormLabel>Work Phone Number</FormLabel><FormControl><Input type="tel" placeholder="(555) 000-0000" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="companyAddress" render={({ field }) => (
                          <FormItem><FormLabel>Company Headquarters Address</FormLabel><FormControl><Input placeholder="123 Corporate Blvd, Ste 100" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                    )}

                    {/* STEP 3: Sponsorship Goals */}
                    {step === 3 && (
                      <div className="space-y-5">
                        <FormField control={form.control} name="proposedCapCents" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Proposed Annual Funding Cap ($)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                                <Input type="number" step="100" className="pl-7" value={field.value / 100} onChange={e => field.onChange(Math.round(parseFloat(e.target.value) * 100))} />
                              </div>
                            </FormControl>
                            <CardDescription>This is an estimate. You can adjust this later.</CardDescription>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="fundingFrequency" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Funding Frequency Preference</FormLabel>
                            <FormControl>
                              <div className="flex gap-4">
                                {FUNDING_FREQUENCIES.map(f => (
                                  <label key={f} className="flex flex-1 items-center gap-2 cursor-pointer p-3 border border-border rounded-md hover:bg-accent">
                                    <input type="radio" checked={field.value === f} onChange={() => field.onChange(f)} className="accent-primary" />
                                    <span className="text-sm font-medium">{f}</span>
                                  </label>
                                ))}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="sponsorshipReason" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Why do you want to support FTC Robotics?</FormLabel>
                            <FormControl><Textarea placeholder="Share your motivation for supporting student innovation..." className="min-h-[120px]" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    )}

                    {/* STEP 4: Industry Focus */}
                    {step === 4 && (
                      <div className="space-y-5">
                        <FormField control={form.control} name="industryFocus" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Areas of Interest (Select multiple)</FormLabel>
                            <div className="grid grid-cols-2 gap-3 mt-2">
                              {FOCUS_AREAS.map(area => (
                                <div key={area} 
                                  className={cn(
                                    "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors",
                                    field.value?.includes(area) ? "bg-primary/10 border-primary" : "border-border hover:bg-accent"
                                  )}
                                  onClick={() => toggleFocusArea(area)}
                                >
                                  <div className={cn("w-4 h-4 rounded-sm border flex items-center justify-center", field.value?.includes(area) ? "bg-primary border-primary" : "border-border")}>
                                    {field.value?.includes(area) && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                                  </div>
                                  <span className="text-sm">{area}</span>
                                </div>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="geographicFocus" render={({ field }) => (
                          <FormItem><FormLabel>Geographic Preference</FormLabel><FormControl><Input placeholder="e.g. National, Texas, or Austin local teams" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="mentorshipOffered" render={({ field }) => (
                          <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-4 bg-accent/20">
                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Mentorship Opportunity</FormLabel>
                              <CardDescription>Our organization is interested in providing technical or business mentorship to sponsored teams.</CardDescription>
                            </div>
                          </FormItem>
                        )} />
                      </div>
                    )}

                    {/* STEP 5: Compliance */}
                    {step === 5 && (
                      <div className="space-y-6">
                        <div className="bg-accent/30 p-4 rounded-lg border border-border space-y-4">
                          <FormField control={form.control} name="ageConfirmed" render={({ field }) => (
                            <FormItem className="flex items-start space-x-3 space-y-0">
                              <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                              <FormLabel className="text-sm">I confirm I am 18 years of age or older and authorized to represent this company.</FormLabel>
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="coppaAcknowledged" render={({ field }) => (
                            <FormItem className="flex items-start space-x-3 space-y-0">
                              <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm">COPPA & PII Policy</FormLabel>
                                <p className="text-xs text-muted-foreground mt-1">I understand that I am not allowed to collect student PII through this platform.</p>
                              </div>
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="tosAccepted" render={({ field }) => (
                            <FormItem className="flex items-start space-x-3 space-y-0">
                              <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                              <FormLabel className="text-sm font-medium leading-none">I agree to the <Link href="/legal/terms" className="text-primary hover:underline" target="_blank">Terms of Service</Link></FormLabel>
                            </FormItem>
                          )} />
                        </div>
                        <div className="border rounded-lg p-6 bg-background/50 space-y-3">
                          <h4 className="font-semibold text-sm">Review Summary</h4>
                          <div className="text-sm grid grid-cols-2 gap-y-2 text-muted-foreground">
                            <span>Company:</span> <span className="text-foreground">{form.watch('companyName')}</span>
                            <span>Representative:</span> <span className="text-foreground">{form.watch('fullName')}</span>
                            <span>Funding Cap:</span> <span className="text-foreground">${(form.watch('proposedCapCents') / 100).toLocaleString()}</span>
                            <span>Focus:</span> <span className="text-foreground">{form.watch('industryFocus')?.join(', ')}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                <div className="flex justify-between pt-6 border-t border-border/80 mt-8">
                  {step > 1 ? (
                    <Button type="button" variant="outline" onClick={prevStep} className="bg-background">
                      <ChevronLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                  ) : <div />}

                  {step < totalSteps ? (
                    <Button type="button" onClick={nextStep} className="bg-primary text-primary-foreground">
                      Next <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button type="submit" size="lg" disabled={isPending} className="bg-primary text-primary-foreground font-semibold px-8">
                      {isPending ? 'Processing...' : 'Submit Application'}
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="border-t border-border/50 flex justify-center py-5">
            <p className="text-sm text-muted-foreground">
              Already have an account? <Link href="/login" className="text-foreground hover:underline font-medium">Log in</Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </section>
  )
}

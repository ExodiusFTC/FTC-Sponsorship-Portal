'use client'

import { useState, useRef, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signupSchema, type SignupInput } from '@/lib/schemas/auth'
import { signUp } from '@/app/actions/auth'
import { lookupFTCTeam } from '@/app/actions/team'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Plus, Trash2, ChevronDown, ChevronRight, ChevronLeft, UploadCloud, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

export function SignupWizard() {
  const [step, setStep] = useState(1)
  const totalSteps = 5
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [lookupSuccess, setLookupSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema) as any,
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      dateOfBirth: '',
      phoneNumber: '',
      addressLine1: '',
      city: '',
      state: '',
      zipCode: '',
      referralSource: '',
      photoIdUrl: undefined,
      teamData: {
        status: 'existing',
        teamName: '',
        organization: '',
        city: '',
        state: '',
        missionStatement: '',
        taxStatus: "None",
        communityInterestText: '',
        seedFundingGoalsCents: 0,
        technicalSummary: '',
        outreachSummary: '',
        mediaUrls: [],
        youtubeUrl: '',
        budgetItems: [],
        financialAskCents: 0,
      }
    },
    mode: 'onTouched'
  })

  const { fields: budgetFields, append: appendBudget, remove: removeBudget } = useFieldArray({
    control: form.control,
    name: 'teamData.budgetItems'
  })

  const teamStatus = form.watch('teamData.status')
  const file = form.watch('photoIdFile')

  const nextStep = async () => {
    let fieldsToValidate: any[] = []
    if (step === 1) fieldsToValidate = ['fullName', 'email', 'password', 'confirmPassword']
    if (step === 2) fieldsToValidate = ['dateOfBirth', 'phoneNumber', 'addressLine1', 'city', 'state', 'zipCode']
    if (step === 3) fieldsToValidate = ['photoIdFile', 'ageConfirmed', 'coppaAcknowledged', 'tosAccepted']
    if (step === 4) fieldsToValidate = ['teamData.status', 'teamData.ftcTeamNumber', 'teamData.teamName', 'teamData.organization', 'teamData.city', 'teamData.state', 'teamData.taxStatus']
    
    const isValid = await form.trigger(fieldsToValidate)
    if (isValid) {
      if (step === 3 && !file) {
        form.setError('photoIdFile', { message: 'Photo ID is required' })
        return
      }
      setStep(prev => Math.min(prev + 1, totalSteps))
      window.scrollTo(0, 0)
    }
  }

  const prevStep = () => {
    setStep(prev => Math.max(prev - 1, 1))
    window.scrollTo(0, 0)
  }

  async function handleLookup() {
    const teamNumber = form.getValues('teamData.ftcTeamNumber')
    if (!teamNumber) {
      form.setError('teamData.ftcTeamNumber', { message: 'Enter a team number first' })
      return
    }
    setIsLookingUp(true)
    setLookupSuccess(false)
    const result = await lookupFTCTeam(teamNumber)
    setIsLookingUp(false)
    if (result.error || !result.team) {
      form.setError('teamData.ftcTeamNumber', { message: result.error ?? 'Team not found in FIRST registry' })
      return
    }
    form.setValue('teamData.teamName', result.team.team_name, { shouldValidate: true })
    if (result.team.city) form.setValue('teamData.city', result.team.city, { shouldValidate: true })
    if (result.team.state) form.setValue('teamData.state', result.team.state, { shouldValidate: true })
    form.clearErrors('teamData.ftcTeamNumber')
    setLookupSuccess(true)
  }

  const calculateTotal = () => {
    const items = form.getValues('teamData.budgetItems') || []
    const total = items.reduce((sum, item) => sum + (item.totalCents || 0), 0)
    form.setValue('teamData.financialAskCents', total)
    return total
  }

  async function onSubmit(values: SignupInput) {
    setIsPending(true)
    setError(null)
    
    const formData = new FormData()
    formData.append('data', JSON.stringify(values))
    if (values.photoIdFile) {
      formData.append('photoIdFile', values.photoIdFile)
    }

    const result = await signUp(formData)
    
    if (result?.error) {
      setError(result.error)
      setIsPending(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      form.setValue('photoIdFile', e.target.files[0], { shouldValidate: true })
      form.clearErrors('photoIdFile')
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
        .hline::after,.vline::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(250,250,250,.24),transparent);opacity:0;animation:shimmer .9s ease-out forwards}
        .hline:nth-child(1)::after{animation-delay:.12s}
        .hline:nth-child(2)::after{animation-delay:.22s}
        .hline:nth-child(3)::after{animation-delay:.32s}
        .vline:nth-child(4)::after{animation-delay:.42s}
        .vline:nth-child(5)::after{animation-delay:.54s}
        .vline:nth-child(6)::after{animation-delay:.66s}
        @keyframes drawX{0%{transform:scaleX(0);opacity:0}60%{opacity:.95}100%{transform:scaleX(1);opacity:.7}}
        @keyframes drawY{0%{transform:scaleY(0);opacity:0}60%{opacity:.95}100%{transform:scaleY(1);opacity:.7}}
        @keyframes shimmer{0%{opacity:0}35%{opacity:.25}100%{opacity:0}}

        /* === Card minimal fade-up animation === */
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
        <Link href="/login">
          <Button
            variant="outline"
            className="h-9 rounded-lg border-zinc-800 bg-zinc-900 text-zinc-50 hover:bg-zinc-900/80"
          >
            <span className="mr-2">Login</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </header>

      {/* Centered Login Card */}
      <div className="min-h-screen w-full grid place-items-center px-4 py-24 relative z-10">
        <Card className="card-animate w-full max-w-2xl border-zinc-800 bg-zinc-900/70 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/60 shadow-2xl">
          <CardHeader className="border-b border-zinc-800/50 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <CardTitle className="text-2xl text-zinc-50">Coach Registration</CardTitle>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-zinc-400">Step {step} of {totalSteps}</span>
              </div>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-zinc-50 h-full transition-all duration-300 ease-out"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>
            <CardDescription className="mt-4 text-base text-zinc-400">
              {step === 1 && "Let's start with your basic account details."}
              {step === 2 && "We need to verify your identity for COPPA compliance."}
              {step === 3 && "Upload your credentials and accept our policies."}
              {step === 4 && "Tell us about the team you are coaching."}
              {step === 5 && "Define your mission and financial goals."}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 text-zinc-50">
                {error && (
                  <Alert variant="destructive" className="bg-red-950/50 border-red-900 text-red-200">
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
                    
                    {/* STEP 1: Account */}
                    {step === 1 && (
                      <div className="space-y-5">
                        <FormField control={form.control} name="fullName" render={({ field }) => (
                          <FormItem><FormLabel className="text-zinc-300">Full Name</FormLabel><FormControl><Input className="bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600" placeholder="Jane Doe" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="email" render={({ field }) => (
                          <FormItem><FormLabel className="text-zinc-300">Email Address</FormLabel><FormControl><Input className="bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600" type="email" placeholder="coach@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <FormField control={form.control} name="password" render={({ field }) => (
                            <FormItem><FormLabel className="text-zinc-300">Password</FormLabel><FormControl><Input className="bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600" type="password" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                            <FormItem><FormLabel className="text-zinc-300">Confirm Password</FormLabel><FormControl><Input className="bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600" type="password" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                      </div>
                    )}

                    {/* STEP 2: Identity */}
                    {step === 2 && (
                      <div className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                            <FormItem><FormLabel className="text-zinc-300">Date of Birth</FormLabel><FormControl><Input className="bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600" type="date" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                            <FormItem><FormLabel className="text-zinc-300">Phone Number</FormLabel><FormControl><Input className="bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600" type="tel" placeholder="(555) 123-4567" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                        <FormField control={form.control} name="addressLine1" render={({ field }) => (
                          <FormItem><FormLabel className="text-zinc-300">Street Address</FormLabel><FormControl><Input className="bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600" placeholder="123 Main St" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                          <FormField control={form.control} name="city" render={({ field }) => (
                            <FormItem className="col-span-1"><FormLabel className="text-zinc-300">City</FormLabel><FormControl><Input className="bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="state" render={({ field }) => (
                            <FormItem className="col-span-1"><FormLabel className="text-zinc-300">State</FormLabel><FormControl><Input className="bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="zipCode" render={({ field }) => (
                            <FormItem className="col-span-1"><FormLabel className="text-zinc-300">Zip Code</FormLabel><FormControl><Input className="bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                      </div>
                    )}

                    {/* STEP 3: Compliance & Upload */}
                    {step === 3 && (
                      <div className="space-y-6">
                        <FormField control={form.control} name="photoIdFile" render={() => (
                          <FormItem>
                            <FormLabel className="text-zinc-300">Photo ID Upload (School ID or Government ID)</FormLabel>
                            <FormControl>
                              <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-700 rounded-lg bg-zinc-950/50 hover:bg-zinc-900 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                  <UploadCloud className="w-8 h-8 text-zinc-500 mb-2" />
                                  <p className="text-sm text-zinc-400">
                                    {file ? <span className="font-semibold text-zinc-100">{file.name}</span> : <span>Click to upload PDF, JPG, or PNG (Max 5MB)</span>}
                                  </p>
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,image/jpeg,image/png" onChange={handleFileChange} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <div className="space-y-4 pt-4">
                          <FormField control={form.control} name="ageConfirmed" render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-zinc-800 p-4 shadow-sm bg-zinc-950/30">
                              <FormControl><Checkbox className="border-zinc-700 data-[state=checked]:bg-zinc-50 data-[state=checked]:text-zinc-900" checked={field.value === true} onCheckedChange={(c) => field.onChange(c === true ? true : undefined)} /></FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-zinc-200">I confirm I am 18 years of age or older</FormLabel>
                                <FormMessage />
                              </div>
                            </FormItem>
                          )} />
                          
                          <FormField control={form.control} name="coppaAcknowledged" render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-zinc-800 p-4 shadow-sm bg-zinc-950/30">
                              <FormControl><Checkbox className="border-zinc-700 data-[state=checked]:bg-zinc-50 data-[state=checked]:text-zinc-900" checked={field.value === true} onCheckedChange={(c) => field.onChange(c === true ? true : undefined)} /></FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-zinc-200">COPPA Acknowledgement</FormLabel>
                                <p className="text-xs text-zinc-400 mt-1.5 leading-snug">I understand I am responsible for supervising students and ensuring no PII of minors under 13 is uploaded.</p>
                                <FormMessage />
                              </div>
                            </FormItem>
                          )} />

                          <FormField control={form.control} name="tosAccepted" render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-zinc-800 p-4 shadow-sm bg-zinc-950/30">
                              <FormControl><Checkbox className="border-zinc-700 data-[state=checked]:bg-zinc-50 data-[state=checked]:text-zinc-900" checked={field.value === true} onCheckedChange={(c) => field.onChange(c === true ? true : undefined)} /></FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-zinc-200 leading-snug">I agree to the <Link href="/legal/terms" className="text-zinc-300 hover:text-zinc-50 underline" target="_blank">Terms of Service</Link> and <Link href="/legal/privacy" className="text-zinc-300 hover:text-zinc-50 underline" target="_blank">Privacy Policy</Link></FormLabel>
                                <FormMessage />
                              </div>
                            </FormItem>
                          )} />
                        </div>

                        <FormField control={form.control} name="referralSource" render={({ field }) => (
                          <FormItem><FormLabel className="text-zinc-300">How did you hear about us? (Optional)</FormLabel><FormControl><Input className="bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600" placeholder="e.g. FIRST forum, another coach..." {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                    )}

                    {/* STEP 4: Team Basics */}
                    {step === 4 && (
                      <div className="space-y-6">
                        <FormField control={form.control} name="teamData.status" render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-zinc-300">Team Status</FormLabel>
                            <FormControl>
                              <div className="flex flex-col sm:flex-row gap-4">
                                <label className="flex flex-1 items-center gap-2 cursor-pointer p-4 border border-zinc-800 bg-zinc-950/50 rounded-md hover:bg-zinc-900 transition-colors">
                                  <input type="radio" {...field} value="existing" checked={field.value === 'existing'} onChange={() => { field.onChange('existing'); setLookupSuccess(false); }} className="w-4 h-4 accent-zinc-50" />
                                  <span className="font-medium text-zinc-200">Existing FTC Team</span>
                                </label>
                                <label className="flex flex-1 items-center gap-2 cursor-pointer p-4 border border-zinc-800 bg-zinc-950/50 rounded-md hover:bg-zinc-900 transition-colors">
                                  <input type="radio" {...field} value="incubator" checked={field.value === 'incubator'} onChange={() => { field.onChange('incubator'); setLookupSuccess(false); }} className="w-4 h-4 accent-zinc-50" />
                                  <span className="font-medium text-zinc-200">Incubator (New Team)</span>
                                </label>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        {teamStatus === 'existing' && (
                          <FormField control={form.control} name="teamData.ftcTeamNumber" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-zinc-300">FTC Team Number</FormLabel>
                              <FormControl>
                                <div className="flex gap-2">
                                  <Input className="bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600" placeholder="e.g. 12345" type="number" value={field.value ?? ''} onChange={(e) => { const num = parseInt(e.target.value); field.onChange(isNaN(num) ? undefined : num); setLookupSuccess(false); }} />
                                  <Button type="button" variant="outline" onClick={handleLookup} disabled={isLookingUp} className="shrink-0 bg-zinc-900 border-zinc-700 text-zinc-100 hover:bg-zinc-800">
                                    {isLookingUp ? 'Looking up...' : 'Lookup Team'}
                                  </Button>
                                </div>
                              </FormControl>
                              {lookupSuccess && <p className="text-sm text-emerald-500 font-medium">✓ Team found in FIRST registry</p>}
                              <FormMessage />
                            </FormItem>
                          )} />
                        )}

                        <FormField control={form.control} name="teamData.teamName" render={({ field }) => (
                          <FormItem><FormLabel className="text-zinc-300">Team Name</FormLabel><FormControl><Input className="bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600" placeholder="e.g. The RoboKnights" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />

                        <FormField control={form.control} name="teamData.organization" render={({ field }) => (
                          <FormItem><FormLabel className="text-zinc-300">Organization / School</FormLabel><FormControl><Input className="bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600" placeholder="e.g. Lincoln High School" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                        )} />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <FormField control={form.control} name="teamData.city" render={({ field }) => (
                            <FormItem><FormLabel className="text-zinc-300">Team City</FormLabel><FormControl><Input className="bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600" placeholder="e.g. Austin" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="teamData.state" render={({ field }) => (
                            <FormItem><FormLabel className="text-zinc-300">Team State</FormLabel><FormControl><Input className="bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600" placeholder="e.g. TX" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>

                        <FormField control={form.control} name="teamData.taxStatus" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-zinc-300">Tax Status</FormLabel>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <FormControl>
                                  <Button variant="outline" className="w-full justify-between font-normal bg-zinc-950 border-zinc-800 text-zinc-50 hover:bg-zinc-900">
                                    {field.value === 'None' ? 'Standard / No tax-exempt status' : field.value === '501c3' ? '501(c)(3) Non-profit' : field.value === 'School' ? 'School / Educational Institution' : 'Select tax status'}
                                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </FormControl>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="w-full min-w-[300px] bg-zinc-950 border-zinc-800 text-zinc-100">
                                <DropdownMenuItem className="hover:bg-zinc-900 focus:bg-zinc-900 cursor-pointer" onClick={() => field.onChange('None')}>Standard / No tax-exempt status</DropdownMenuItem>
                                <DropdownMenuItem className="hover:bg-zinc-900 focus:bg-zinc-900 cursor-pointer" onClick={() => field.onChange('501c3')}>501(c)(3) Non-profit</DropdownMenuItem>
                                <DropdownMenuItem className="hover:bg-zinc-900 focus:bg-zinc-900 cursor-pointer" onClick={() => field.onChange('School')}>School / Educational Institution</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    )}

                    {/* STEP 5: Narrative & Financials */}
                    {step === 5 && (
                      <div className="space-y-6">
                        <FormField control={form.control} name="teamData.missionStatement" render={({ field }) => (
                          <FormItem><FormLabel className="text-zinc-300">Mission Statement</FormLabel><FormControl><Textarea placeholder="What is your team's overarching goal? (Min 50 chars)" className="min-h-[100px] resize-none bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        
                        <div className="pt-4 border-t border-zinc-800">
                          <div className="flex justify-between items-center mb-4 mt-2">
                            <div>
                              <h3 className="text-lg font-semibold text-zinc-100">Budget Request</h3>
                              <p className="text-sm text-zinc-400">List the items you need sponsorship for.</p>
                            </div>
                            <Button type="button" variant="outline" size="sm" className="bg-zinc-900 border-zinc-700 text-zinc-100 hover:bg-zinc-800" onClick={() => appendBudget({ label: '', qty: 1, unitCostCents: 0, totalCents: 0 })}>
                              <Plus className="w-4 h-4 mr-1" /> Add Item
                            </Button>
                          </div>
                          
                          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                            {budgetFields.map((field, index) => (
                              <div key={field.id} className="grid grid-cols-12 gap-2 items-end bg-zinc-950/50 p-3 rounded-lg border border-zinc-800">
                                <div className="col-span-12 sm:col-span-5">
                                  <FormLabel className="text-xs text-zinc-400">Item Label</FormLabel>
                                  <Input {...form.register(`teamData.budgetItems.${index}.label`)} placeholder="e.g. REV Hub" className="h-8 bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600" />
                                </div>
                                <div className="col-span-4 sm:col-span-2">
                                  <FormLabel className="text-xs text-zinc-400">Qty</FormLabel>
                                  <Input type="number" {...form.register(`teamData.budgetItems.${index}.qty`, { valueAsNumber: true })} 
                                    className="h-8 bg-zinc-900 border-zinc-700 text-zinc-100"
                                    onChange={(e) => {
                                      const qty = parseInt(e.target.value) || 0
                                      const unit = form.getValues(`teamData.budgetItems.${index}.unitCostCents`) || 0
                                      form.setValue(`teamData.budgetItems.${index}.totalCents`, qty * unit)
                                      calculateTotal()
                                    }}
                                  />
                                </div>
                                <div className="col-span-6 sm:col-span-4">
                                  <FormLabel className="text-xs text-zinc-400">Unit Cost ($)</FormLabel>
                                  <Input type="number" step="0.01" 
                                    className="h-8 bg-zinc-900 border-zinc-700 text-zinc-100"
                                    onChange={(e) => {
                                      const dollars = parseFloat(e.target.value) || 0
                                      const unit = Math.round(dollars * 100)
                                      const qty = form.getValues(`teamData.budgetItems.${index}.qty`) || 0
                                      form.setValue(`teamData.budgetItems.${index}.unitCostCents`, unit)
                                      form.setValue(`teamData.budgetItems.${index}.totalCents`, qty * unit)
                                      calculateTotal()
                                    }}
                                  />
                                </div>
                                <div className="col-span-2 sm:col-span-1 flex justify-center pb-1">
                                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:bg-red-950/50 hover:text-red-300" onClick={() => { removeBudget(index); calculateTotal(); }}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                            {budgetFields.length === 0 && (
                              <div className="text-center py-6 border-2 border-dashed border-zinc-800 rounded-lg text-zinc-500">
                                No budget items added yet.
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-4 bg-zinc-50 p-4 rounded-lg flex justify-between items-center font-bold text-zinc-900">
                            <span>Total Funding Request:</span>
                            <span className="text-xl">${(form.watch('teamData.financialAskCents') / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                <div className="flex justify-between pt-6 border-t border-zinc-800/80 mt-8">
                  {step > 1 ? (
                    <Button type="button" variant="outline" onClick={prevStep} className="bg-zinc-950 border-zinc-800 text-zinc-50 hover:bg-zinc-900">
                      <ChevronLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                  ) : (
                    <div></div>
                  )}
                  
                  {step < totalSteps ? (
                    <Button type="button" onClick={nextStep} className="bg-zinc-50 text-zinc-900 hover:bg-zinc-200">
                      Next <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button type="submit" size="lg" disabled={isPending} className="bg-zinc-50 text-zinc-900 hover:bg-zinc-200 font-semibold px-8">
                      {isPending ? 'Submitting...' : 'Complete Registration'}
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="border-t border-zinc-800/50 flex justify-center py-5">
            <p className="text-sm text-zinc-400">
              Already have an account? <Link href="/login" className="text-zinc-200 hover:underline font-medium">Log in</Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </section>
  )
}

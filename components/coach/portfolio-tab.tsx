'use client'

import { useState, useTransition, useCallback, useEffect, useRef } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { teamOnboardingSchema, type TeamOnboardingInput } from '@/lib/schemas/team'
import { updateTeam } from '@/app/actions/team'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Trash, Image as ImageIcon, Upload, GripVertical, Plus, Sparkles, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import type { Team, TeamAchievement } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export function PortfolioTab({ team, achievements }: { team: Team, achievements: TeamAchievement[] }) {
  const [isPending, startTransition] = useTransition()
  const [draggingOver, setDraggingOver] = useState(false)
  const [uploadingDrop, setUploadingDrop] = useState(false)

  const isIncubator = team.status === 'incubator'

  const form = useForm<any>({
    resolver: zodResolver(teamOnboardingSchema) as any,
    defaultValues: {
      status: team.status,
      ftcTeamNumber: team.ftc_team_number ?? '',
      teamName: team.team_name,
      tagline: team.organization || '',
      organization: team.organization || '',
      city: team.city || '',
      state: team.state || '',
      missionStatement: team.mission_statement || '',
      taxStatus: team.tax_status,
      communityInterestText: team.community_interest_text || '',
      studentInterestCount: (team as any).student_interest_count ?? 0,
      sustainabilityPlan: (team as any).sustainability_plan || '',
      seedFundingGoalsCents: team.seed_funding_goals_cents ?? 0,
      technicalSummary: team.technical_summary || '',
      outreachSummary: team.outreach_summary || '',
      drivetrain: (team as any).drivetrain || '',
      buildSystem: (team as any).build_system || '',
      programming: (team as any).programming || '',
      mediaUrls: team.media_urls || [],
      youtubeUrl: team.youtube_url || '',
      budgetItems: team.budget_items?.map((item: any) => ({
        label: item.label,
        qty: item.qty,
        unitCostCents: item.unit_cost_cents,
        totalCents: item.total_cents,
      })) || [],
      financialAskCents: team.financial_ask_cents || 0,
      cadSoftware: (team as any).cad_software || '',
      controlSystem: (team as any).control_system || '',
      sensors: ((team as any).sensors as string[] | undefined)?.join(', ') ?? '',
      githubLink: (team as any).github_link || '',
      autonomousDescription: (team as any).autonomous_description || '',
      manufacturingCapabilities: Array.isArray((team as any).manufacturing_capabilities) 
        ? ((team as any).manufacturing_capabilities as string[]).join(', ') 
        : (team as any).manufacturing_capabilities || '',
      visualPitchItems: (team as any).visual_pitch_items || [],
      achievements: achievements.map(a => ({
        season: a.season || '',
        eventName: a.event_name,
        award: a.award || '',
        description: a.description || '',
      })),
      coachPhotoUrl: (team as any).coach_photo_url || '',
      subteamBreakdown: (team as any).subteam_breakdown || '',
    } as TeamOnboardingInput,
  })

  const { fields: visualItems, append: appendVisual, remove: removeVisual } = useFieldArray({
    control: form.control,
    name: 'visualPitchItems',
  })

  const { fields: achItems, append: appendAch, remove: removeAch } = useFieldArray({
    control: form.control,
    name: 'achievements',
  })

  async function uploadFile(file: File) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
      toast.error('Only JPG, PNG, WebP, or GIF files are supported')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be under 5 MB')
      return
    }

    const filePath = `${user.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('pitch-storage').upload(filePath, file)
    if (error) { toast.error(error.message); return }
    const { data: urlData } = supabase.storage.from('pitch-storage').getPublicUrl(filePath)
    appendVisual({ url: urlData.publicUrl, caption: '' })
    return urlData.publicUrl
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    toast.loading('Uploading…', { id: 'upload' })
    await uploadFile(file)
    toast.success('Uploaded!', { id: 'upload' })
  }

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setDraggingOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return
    setUploadingDrop(true)
    toast.loading(`Uploading ${files.length} image${files.length > 1 ? 's' : ''}…`, { id: 'drop-upload' })
    await Promise.all(files.map(uploadFile))
    toast.success('All images uploaded!', { id: 'drop-upload' })
    setUploadingDrop(false)
  }, [])

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name?.startsWith('budgetItems')) {
        const items = value.budgetItems || []
        const total = items.reduce((sum: number, item: any) => sum + (item.totalCents || 0), 0)
        if (form.getValues('financialAskCents') !== total) {
          form.setValue('financialAskCents', total)
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [form])

  async function onSubmit(values: any) {
    startTransition(async () => {
      const result = await updateTeam(team.id, values)
      if (result.error) toast.error('Failed to update: ' + result.error)
      else toast.success('Portfolio updated!')
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-medium text-foreground">
              {isIncubator ? "Founder's Portfolio" : "Team Portfolio"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isIncubator 
                ? "Manage your vision, community evidence, and startup plan."
                : "Manage your team's specs, media, and narrative."}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : 'Save Changes'}
            </Button>
            {Object.keys(form.formState.errors).length > 0 && (
              <p className="text-[10px] text-destructive font-medium animate-pulse">
                Please fix {Object.keys(form.formState.errors).length} error{Object.keys(form.formState.errors).length > 1 ? 's' : ''} above
              </p>
            )}
          </div>
        </div>

        {/* Global Identity section — missing fields fix */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
            Team Identity
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField control={form.control} name="teamName" render={({ field }) => (
              <FormItem>
                <FormLabel>Team Name</FormLabel>
                <FormControl><Input placeholder="e.g. Robot Knights" {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="organization" render={({ field }) => (
              <FormItem>
                <FormLabel>Organization / School</FormLabel>
                <FormControl><Input placeholder="e.g. Oak High School" {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="city" render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl><Input placeholder="e.g. San Jose" {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="state" render={({ field }) => (
              <FormItem>
                <FormLabel>State</FormLabel>
                <FormControl><Input placeholder="e.g. California" {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="taxStatus" render={({ field }) => (
              <FormItem>
                <FormLabel>Tax Status</FormLabel>
                <FormControl>
                  <select 
                    {...field} 
                    className="flex h-9 w-full rounded-md border border-input bg-zinc-950 px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="501c3">501(c)(3) Non-profit</option>
                    <option value="School">School-based Team</option>
                    <option value="None">None / Other</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="tagline" render={({ field }) => (
              <FormItem className="col-span-1 md:col-span-2">
                <FormLabel>Tagline / Motto</FormLabel>
                <FormControl><Input placeholder="Building the future, one bolt at a time." {...field} value={field.value ?? ''} /></FormControl>
                <FormDescription>A short phrase that captures your team&apos;s spirit.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        {isIncubator && (
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-6 space-y-5">
            <div className="flex items-center gap-2 text-indigo-400">
              <Sparkles className="h-5 w-5" />
              <h3 className="text-sm font-semibold uppercase tracking-widest border-b border-indigo-500/20 pb-2 flex-1">
                The Founder's Pitch
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="missionStatement" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>The "Why": Motivation</FormLabel>
                  <FormDescription>Explain why you want to start a team in your specific community.</FormDescription>
                  <FormControl>
                    <Textarea className="min-h-[120px]" placeholder="Our motivation is to bring STEM access to..." {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="studentInterestCount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Student Interest Count</FormLabel>
                  <FormDescription>How many students are committed to joining?</FormDescription>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      value={field.value === 0 ? '' : field.value} 
                      onChange={e => field.onChange(e.target.value === '' ? 0 : parseInt(e.target.value) || 0)} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="communityInterestText" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Evidence of Community Interest</FormLabel>
                  <FormDescription>Describe local support, waitlists, or school buy-in.</FormDescription>
                  <FormControl>
                    <Textarea className="min-h-[100px]" placeholder="We have local parents and the PTA supportive of..." {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="sustainabilityPlan" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Sustainability Plan</FormLabel>
                  <FormDescription>How will the team survive after the first year?</FormDescription>
                  <FormControl>
                    <Textarea className="min-h-[100px]" placeholder="Our plan for year 2 and beyond is..." {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="seedFundingGoalsCents" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Seed Funding Goal ($)</FormLabel>
                  <FormDescription>How much total funding do you need to launch?</FormDescription>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      value={field.value === 0 ? '' : field.value / 100} 
                      onChange={e => {
                        const val = e.target.value === '' ? 0 : Math.round(parseFloat(e.target.value) * 100) || 0
                        field.onChange(val)
                      }} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </div>
        )}

        {!isIncubator && (
          <>
            {/* Robot Identity */}
            <div className="rounded-xl border border-border bg-card p-6 space-y-5">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
                Robot Identity
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormField control={form.control} name="drivetrain" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Drivetrain</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Mecanum, Swerve, Tank…" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="buildSystem" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Build System</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. GoBILDA, REV, Custom…" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="controlSystem" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Control System</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. REV Control Hub, Android Phone…" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="cadSoftware" render={({ field }) => (
                  <FormItem>
                    <FormLabel>CAD Software</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Onshape, SolidWorks, Fusion 360…" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="githubLink" render={({ field }) => (
                  <FormItem className="col-span-1 md:col-span-2">
                    <FormLabel>GitHub Link</FormLabel>
                    <FormControl>
                      <Input placeholder="https://github.com/your-team" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            {/* Software & Autonomy */}
            <div className="rounded-xl border border-border bg-card p-6 space-y-5">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
                Software & Autonomy
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormField control={form.control} name="programming" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Programming Language</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Java, Blocks, Python…" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="sensors" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sensors & Algorithms</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Odometry, PID, Computer Vision…" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="autonomousDescription" render={({ field }) => (
                  <FormItem className="col-span-1 md:col-span-2">
                    <FormLabel>Autonomous Routine Description</FormLabel>
                    <FormControl>
                      <Textarea maxLength={750} placeholder="Describe your autonomous capabilities…" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            {/* Awards & Experience */}
            <div className="rounded-xl border border-border bg-card p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Awards & Experience</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendAch({ season: '', eventName: '', award: '', description: '' })}
                  className="h-8 text-xs gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Achievement
                </Button>
              </div>
              <div className="space-y-4">
                {achItems.map((field, index) => (
                  <div key={field.id} className="relative grid grid-cols-1 md:grid-cols-[120px,1fr,1fr,auto] gap-3 items-end border border-border/50 rounded-lg p-4 bg-accent/5">
                    <FormField control={form.control} name={`achievements.${index}.season`} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Season</FormLabel>
                        <FormControl><Input placeholder="2024-25" {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name={`achievements.${index}.eventName`} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Event Name</FormLabel>
                        <FormControl><Input placeholder="Qualifying Tournament" {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name={`achievements.${index}.award`} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Award (Optional)</FormLabel>
                        <FormControl><Input placeholder="Inspire Award" {...field} value={field.value ?? ''} /></FormControl>
                      </FormItem>
                    )} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-destructive transition-colors"
                      onClick={() => removeAch(index)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                    <FormField control={form.control} name={`achievements.${index}.description`} render={({ field }) => (
                      <FormItem className="col-span-1 md:col-span-3">
                        <FormLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Description / Context</FormLabel>
                        <FormControl><Input placeholder="Briefly describe the significance…" {...field} value={field.value ?? ''} /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                ))}
                {achItems.length === 0 && (
                  <div className="text-center py-8 border border-dashed border-border rounded-lg bg-accent/5">
                    <p className="text-sm text-muted-foreground italic">No achievements listed yet. Add your first award or event experience!</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Visual Pitch Assets */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              {isIncubator ? "Concept & Community Media" : "Visual Pitch Assets"}
            </h3>
            <label className="cursor-pointer inline-flex items-center gap-2 rounded-md border border-border bg-accent px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent/80 transition-colors">
              <Upload className="h-3.5 w-3.5" /> Browse
              <input type="file" className="hidden" accept="image/png,image/jpeg,image/webp,image/gif" multiple onChange={handleUpload} />
            </label>
          </div>
          <div
            onDragOver={e => { e.preventDefault(); setDraggingOver(true) }}
            onDragLeave={() => setDraggingOver(false)}
            onDrop={handleDrop}
            className={cn(
              'relative rounded-xl border-2 border-dashed transition-all duration-200 overflow-hidden',
              draggingOver ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border bg-background/40',
              visualItems.length === 0 ? 'min-h-[160px] flex items-center justify-center' : ''
            )}
          >
            {visualItems.length === 0 ? (
              <div className="text-center py-12 px-6 pointer-events-none">
                <ImageIcon className="mx-auto h-8 w-8 mb-3 text-zinc-600" />
                <p className="text-sm text-zinc-500">Drop images here or click Browse above</p>
                <p className="text-xs text-zinc-700 mt-1">PNG, JPG, WebP, GIF up to 5 MB each</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3">
                {visualItems.map((item: any, index) => (
                  <div key={item.id} className="relative rounded-lg overflow-hidden border border-border bg-accent/50 aspect-video group">
                    <Image src={item.url} alt={`Slide ${index + 1}`} fill className="object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2.5">
                      <button type="button" onClick={() => removeVisual(index)} className="self-end p-1.5 bg-red-500/20 text-red-300 rounded hover:bg-red-500/40 transition-colors">
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                      <FormField control={form.control} name={`visualPitchItems.${index}.caption`} render={({ field }) => (
                        <FormControl><Input className="bg-zinc-950/80 border-none text-xs h-8 placeholder:text-zinc-500" placeholder="Add caption…" {...field} value={field.value ?? ''} /></FormControl>
                      )} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Team Structure */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
            {isIncubator ? "Leadership & Planning" : "Team Structure & Capabilities"}
          </h3>
          {!isIncubator && (
            <FormField control={form.control} name="manufacturingCapabilities" render={({ field }) => (
              <FormItem>
                <FormLabel>Manufacturing Capabilities</FormLabel>
                <FormControl><Input placeholder="e.g. 3D Printing, CNC, Lathe…" {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          )}
          <FormField control={form.control} name="subteamBreakdown" render={({ field }) => (
            <FormItem>
              <FormLabel>{isIncubator ? "Proposed Roles" : "Subteam Breakdown"}</FormLabel>
              <FormControl><Textarea maxLength={1000} placeholder={isIncubator ? "How will you organize your initial members?" : "Describe your team structure..."} {...field} value={field.value ?? ''} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {/* Narrative / Mission — for existing teams */}
        {!isIncubator && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
              Narrative
            </h3>
            <FormField control={form.control} name="missionStatement" render={({ field }) => (
              <FormItem>
                <FormLabel>Mission Statement</FormLabel>
                <FormControl><Textarea className="min-h-[100px]" placeholder="Our objective is…" {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="technicalSummary" render={({ field }) => (
              <FormItem>
                <FormLabel>Technical Summary</FormLabel>
                <FormControl><Textarea className="min-h-[100px]" placeholder="An overview of your technical strategy…" {...field} value={field.value ?? ''} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="outreachSummary" render={({ field }) => (
              <FormItem>
                <FormLabel>Outreach Summary</FormLabel>
                <FormControl><Textarea className="min-h-[100px]" placeholder="Your team's community impact…" {...field} value={field.value ?? ''} /></FormControl>
              </FormItem>
            )} />
          </div>
        )}
        {/* Budget & Funding */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Budget & Funding
            </h3>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="h-8 text-xs"
              onClick={() => {
                const current = form.getValues('budgetItems') || []
                form.setValue('budgetItems', [...current, { label: '', qty: 1, unitCostCents: 0, totalCents: 0 }])
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Item
            </Button>
          </div>
          
          <div className="space-y-4">
            <FormField control={form.control} name="budgetItems" render={({ field }) => (
              <div className="space-y-3">
                {(field.value || []).map((item: any, index: number) => (
                  <div key={index} className="grid grid-cols-12 gap-3 items-end bg-zinc-950/30 p-3 rounded-lg border border-border/50">
                    <div className="col-span-6">
                      <FormLabel className="text-[10px] uppercase text-muted-foreground">Item</FormLabel>
                      <Input 
                        placeholder="e.g. REV Control Hub" 
                        className="h-8 text-sm"
                        value={item.label}
                        onChange={e => {
                          const newItems = [...field.value]
                          newItems[index].label = e.target.value
                          field.onChange(newItems)
                        }}
                      />
                    </div>
                    <div className="col-span-2">
                      <FormLabel className="text-[10px] uppercase text-muted-foreground">Qty</FormLabel>
                      <Input 
                        type="number" 
                        className="h-8 text-sm"
                        value={item.qty === 0 ? '' : item.qty}
                        onChange={e => {
                          const newItems = [...field.value]
                          const qty = e.target.value === '' ? 0 : parseInt(e.target.value) || 0
                          newItems[index].qty = qty
                          newItems[index].totalCents = qty * newItems[index].unitCostCents
                          field.onChange(newItems)
                        }}
                      />
                    </div>
                    <div className="col-span-3">
                      <FormLabel className="text-[10px] uppercase text-muted-foreground">Cost ($)</FormLabel>
                      <Input 
                        type="number" 
                        className="h-8 text-sm"
                        value={item.unitCostCents === 0 ? '' : item.unitCostCents / 100}
                        onChange={e => {
                          const newItems = [...field.value]
                          const cost = e.target.value === '' ? 0 : Math.round(parseFloat(e.target.value) * 100) || 0
                          newItems[index].unitCostCents = cost
                          newItems[index].totalCents = newItems[index].qty * cost
                          field.onChange(newItems)
                        }}
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button 
                        type="button"
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        onClick={() => {
                          const newItems = field.value.filter((_: any, i: number) => i !== index)
                          field.onChange(newItems)
                        }}
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {(!field.value || field.value.length === 0) && (
                  <div className="text-center py-6 border border-dashed border-border rounded-lg text-xs text-muted-foreground">
                    No budget items yet. Add one to request funding.
                  </div>
                )}
              </div>
            )} />
            
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm font-medium text-foreground">Total Request</span>
              <span className="text-lg font-bold text-indigo-400">
                ${((form.watch('financialAskCents') || 0) / 100).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isPending} className="px-8 h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg shadow-indigo-500/20">
            {isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Form>
  )
}

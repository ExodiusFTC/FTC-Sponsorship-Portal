'use client'

import { useState, useTransition, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { teamOnboardingSchema, type TeamOnboardingInput } from '@/lib/schemas/team'
import { updateTeam } from '@/app/actions/team'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Trash, Image as ImageIcon, Upload, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import type { Team } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export function PortfolioTab({ team }: { team: Team }) {
  const [isPending, startTransition] = useTransition()
  const [draggingOver, setDraggingOver] = useState(false)
  const [uploadingDrop, setUploadingDrop] = useState(false)

  const form = useForm<TeamOnboardingInput>({
    resolver: zodResolver(teamOnboardingSchema),
    defaultValues: {
      status: team.status,
      ftcTeamNumber: team.ftc_team_number || undefined,
      teamName: team.team_name,
      tagline: team.organization || '',
      organization: team.organization || '',
      city: team.city || '',
      state: team.state || '',
      missionStatement: team.mission_statement || '',
      taxStatus: team.tax_status,
      communityInterestText: team.community_interest_text || undefined,
      seedFundingGoalsCents: team.seed_funding_goals_cents || undefined,
      technicalSummary: team.technical_summary || undefined,
      outreachSummary: team.outreach_summary || undefined,
      // Free text instead of enum dropdowns
      drivetrain: (team as any).drivetrain || '',
      buildSystem: (team as any).build_system || '',
      programming: (team as any).programming || '',

      mediaUrls: team.media_urls || [],
      youtubeUrl: team.youtube_url || undefined,
      budgetItems: team.budget_items?.map((item: any) => ({
        label: item.label,
        qty: item.qty,
        unitCostCents: item.unit_cost_cents,
        totalCents: item.total_cents,
      })) || [],
      financialAskCents: team.financial_ask_cents || 0,
      cadSoftware: (team as any).cad_software || '',
      controlSystem: (team as any).control_system || '',
      // sensors & mfg capabilities as comma-joined strings (schema uses z.string)
      sensors: ((team as any).sensors as string[] | undefined)?.join(', ') ?? '',
      githubLink: (team as any).github_link || '',
      autonomousDescription: (team as any).autonomous_description || '',
      proudestMechanismName: (team as any).proudest_mechanism_name || '',
      proudestMechanismProblem: (team as any).proudest_mechanism_problem || '',
      proudestMechanismSolution: (team as any).proudest_mechanism_solution || '',
      subteamBreakdown: (team as any).subteam_breakdown || '',
      manufacturingCapabilities: ((team as any).manufacturing_capabilities as string[] | undefined)?.join(', ') ?? '',
      visualPitchItems: (team as any).visual_pitch_items || [],
    },
  })

  const { fields: visualItems, append: appendVisual, remove: removeVisual } = useFieldArray({
    control: form.control,
    name: 'visualPitchItems',
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
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  function onSubmit(values: TeamOnboardingInput) {
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
            <h2 className="text-xl font-medium text-zinc-100">Team Portfolio</h2>
            <p className="text-sm text-zinc-400 mt-1">Manage your team's specs, media, and narrative.</p>
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>

        {/* Robot Identity — all text inputs */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6 space-y-5">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-500 border-b border-zinc-900 pb-2">
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
                  <Input placeholder="e.g. Onshape, SolidWorks, Fusion 360…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="githubLink" render={({ field }) => (
              <FormItem className="col-span-1 md:col-span-2">
                <FormLabel>GitHub Link</FormLabel>
                <FormControl>
                  <Input placeholder="https://github.com/your-team" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        {/* Software & Autonomy — text inputs only */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6 space-y-5">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-500 border-b border-zinc-900 pb-2">
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
                  <Textarea maxLength={750} placeholder="Describe your autonomous capabilities…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        {/* Proudest Mechanism */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6 space-y-5">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-500 border-b border-zinc-900 pb-2">
            Proudest Mechanism
          </h3>
          <FormField control={form.control} name="proudestMechanismName" render={({ field }) => (
            <FormItem>
              <FormLabel>Mechanism Name</FormLabel>
              <FormControl><Input placeholder="e.g. Outtake Arm" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="proudestMechanismProblem" render={({ field }) => (
            <FormItem>
              <FormLabel>Problem Statement</FormLabel>
              <FormControl><Textarea placeholder="What problem were you solving?" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="proudestMechanismSolution" render={({ field }) => (
            <FormItem>
              <FormLabel>Solution</FormLabel>
              <FormControl><Textarea maxLength={1000} placeholder="How did you solve it?" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {/* Team Structure — text inputs */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6 space-y-5">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-500 border-b border-zinc-900 pb-2">
            Team Structure & Capabilities
          </h3>
          <FormField control={form.control} name="manufacturingCapabilities" render={({ field }) => (
            <FormItem>
              <FormLabel>Manufacturing Capabilities</FormLabel>
              <FormControl>
                <Input placeholder="e.g. 3D Printing, CNC, Lathe, Laser Cutter…" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="subteamBreakdown" render={({ field }) => (
            <FormItem>
              <FormLabel>Subteam Breakdown</FormLabel>
              <FormControl><Textarea maxLength={1000} placeholder="Describe your team structure and roles…" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {/* Visual Pitch Assets — drag & drop */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">Visual Pitch Assets</h3>
            <label className="cursor-pointer inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition-colors">
              <Upload className="h-3.5 w-3.5" /> Browse
              <input type="file" className="hidden" accept="image/png,image/jpeg,image/webp,image/gif" multiple onChange={handleUpload} />
            </label>
          </div>

          {/* Drag & Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDraggingOver(true) }}
            onDragLeave={() => setDraggingOver(false)}
            onDrop={handleDrop}
            className={cn(
              'relative rounded-xl border-2 border-dashed transition-all duration-200 overflow-hidden',
              draggingOver
                ? 'border-indigo-500 bg-indigo-500/5 scale-[1.01]'
                : 'border-zinc-800 bg-zinc-950/40',
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
                {visualItems.map((item, index) => (
                  <div key={item.id} className="relative rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900/50 aspect-video group">
                    <Image src={item.url} alt={`Slide ${index + 1}`} fill className="object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2.5">
                      <button
                        type="button"
                        onClick={() => removeVisual(index)}
                        className="self-end p-1.5 bg-red-500/20 text-red-300 rounded hover:bg-red-500/40 transition-colors"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                      <FormField control={form.control} name={`visualPitchItems.${index}.caption`} render={({ field }) => (
                        <FormControl>
                          <Input
                            className="bg-zinc-950/80 border-none text-xs h-8 placeholder:text-zinc-500"
                            placeholder="Add caption…"
                            {...field}
                          />
                        </FormControl>
                      )} />
                    </div>
                    <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-60 transition-opacity">
                      <GripVertical className="h-4 w-4 text-white" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {draggingOver && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="rounded-xl bg-indigo-600/90 px-6 py-4 text-sm font-semibold text-white shadow-2xl">
                  Drop to upload
                </div>
              </div>
            )}
            {uploadingDrop && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/70 pointer-events-none">
                <div className="rounded-xl bg-zinc-900 border border-zinc-700 px-6 py-4 text-sm text-zinc-200">
                  Uploading…
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Narrative / Mission */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6 space-y-5">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-500 border-b border-zinc-900 pb-2">
            Narrative
          </h3>
          <FormField control={form.control} name="missionStatement" render={({ field }) => (
            <FormItem>
              <FormLabel>Mission Statement</FormLabel>
              <FormControl><Textarea className="min-h-[100px]" placeholder="Our objective is…" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="technicalSummary" render={({ field }) => (
            <FormItem>
              <FormLabel>Technical Summary</FormLabel>
              <FormControl><Textarea className="min-h-[100px]" placeholder="An overview of your technical strategy…" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="outreachSummary" render={({ field }) => (
            <FormItem>
              <FormLabel>Outreach Summary</FormLabel>
              <FormControl><Textarea className="min-h-[100px]" placeholder="Your team's community impact…" {...field} /></FormControl>
            </FormItem>
          )} />
        </div>
      </form>
    </Form>
  )
}

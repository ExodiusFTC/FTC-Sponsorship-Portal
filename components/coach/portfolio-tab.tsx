'use client'

import { useTransition } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { teamOnboardingSchema, type TeamOnboardingInput, DRIVETRAIN_OPTIONS, BUILD_SYSTEM_OPTIONS, PROGRAMMING_OPTIONS } from '@/lib/schemas/team'
import { updateTeam } from '@/app/actions/team'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Trash, Image as ImageIcon, Upload } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import type { Team } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const SENSOR_OPTIONS = [
  { id: 'odometry', label: 'Odometry' },
  { id: 'pid', label: 'PID Control' },
  { id: 'computer_vision', label: 'Computer Vision' },
  { id: 'custom_algorithms', label: 'Custom Algorithms' },
]

const MFG_OPTIONS = [
  { id: '3d_printing', label: '3D Printing' },
  { id: 'cnc', label: 'CNC Machining' },
  { id: 'lathe', label: 'Lathe' },
  { id: 'laser_cutter', label: 'Laser Cutter' },
]

export function PortfolioTab({ team }: { team: Team }) {
  const [isPending, startTransition] = useTransition()
  
  const form = useForm<TeamOnboardingInput>({
    resolver: zodResolver(teamOnboardingSchema),
    defaultValues: {
      status: team.status,
      ftcTeamNumber: team.ftc_team_number || undefined,
      teamName: team.team_name,
      tagline: team.organization || '', // Note: we repurpose org/tagline appropriately below but schema requires string
      organization: team.organization || '',
      city: team.city || '',
      state: team.state || '',
      missionStatement: team.mission_statement || '',
      taxStatus: team.tax_status,
      communityInterestText: team.community_interest_text || undefined,
      seedFundingGoalsCents: team.seed_funding_goals_cents || undefined,
      technicalSummary: team.technical_summary || undefined,
      outreachSummary: team.outreach_summary || undefined,
      drivetrain: (team as any).drivetrain || undefined,
      buildSystem: (team as any).build_system || undefined,
      programming: (team as any).programming || undefined,
      mediaUrls: team.media_urls || [],
      youtubeUrl: team.youtube_url || undefined,
      budgetItems: team.budget_items?.map((item: any) => ({
        label: item.label,
        qty: item.qty,
        unitCostCents: item.unit_cost_cents,
        totalCents: item.total_cents
      })) || [],
      financialAskCents: team.financial_ask_cents || 0,
      cadSoftware: (team as any).cad_software || '',
      controlSystem: (team as any).control_system || '',
      sensors: (team as any).sensors || [],
      githubLink: (team as any).github_link || '',
      autonomousDescription: (team as any).autonomous_description || '',
      proudestMechanismName: (team as any).proudest_mechanism_name || '',
      proudestMechanismProblem: (team as any).proudest_mechanism_problem || '',
      proudestMechanismSolution: (team as any).proudest_mechanism_solution || '',
      subteamBreakdown: (team as any).subteam_breakdown || '',
      manufacturingCapabilities: (team as any).manufacturing_capabilities || [],
      visualPitchItems: (team as any).visual_pitch_items || [],
    }
  })

  const { fields: visualItems, append: appendVisual, remove: removeVisual } = useFieldArray({
    control: form.control,
    name: 'visualPitchItems'
  })

  // Basic Image Upload for visually appealing elements
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    toast.loading('Uploading image...', { id: 'upload' })
    const ext = file.name.split('.').pop()?.toLowerCase()
    const filePath = `${user.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('pitch-storage').upload(filePath, file)
    if (error) {
       toast.error(error.message, { id: 'upload' })
       return
    }
    const { data: urlData } = supabase.storage.from('pitch-storage').getPublicUrl(filePath)
    appendVisual({ url: urlData.publicUrl, caption: '' })
    toast.success('Image uploaded', { id: 'upload' })
  }

  function onSubmit(values: TeamOnboardingInput) {
    startTransition(async () => {
      const result = await updateTeam(team.id, values)
      if (result.error) {
        toast.error('Failed to update: ' + result.error)
      } else {
        toast.success('Portfolio updated!')
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-4xl">
        <div className="flex items-center justify-between">
           <div>
             <h2 className="text-xl font-medium text-zinc-100">Team Portfolio</h2>
             <p className="text-sm text-zinc-400 mt-1">Manage your team's robot specs, media, and narrative.</p>
           </div>
           <Button type="submit" disabled={isPending}>
             {isPending ? 'Saving...' : 'Save Changes'}
           </Button>
        </div>

        {/* Robot Identity */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6 space-y-6">
          <h3 className="text-lg font-medium text-zinc-100 border-b border-zinc-900 pb-2">Robot Identity</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField control={form.control} name="drivetrain" render={({ field }) => (
              <FormItem>
                <FormLabel>Drivetrain</FormLabel>
                <FormControl>
                  <NativeSelect {...field} value={field.value ?? ''}>
                    <option value="" disabled>Select Drivetrain</option>
                    {DRIVETRAIN_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </NativeSelect>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="buildSystem" render={({ field }) => (
              <FormItem>
                <FormLabel>Build System</FormLabel>
                <FormControl>
                  <NativeSelect {...field} value={field.value ?? ''}>
                    <option value="" disabled>Select System</option>
                    {BUILD_SYSTEM_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </NativeSelect>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="controlSystem" render={({ field }) => (
              <FormItem>
                <FormLabel>Control System</FormLabel>
                <FormControl>
                  <NativeSelect {...field} value={field.value ?? ''}>
                    <option value="" disabled>Select Control</option>
                    <option value="rev_control_hub">REV Control Hub</option>
                    <option value="android_phone">Android Phone</option>
                    <option value="other">Other</option>
                  </NativeSelect>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="cadSoftware" render={({ field }) => (
              <FormItem>
                <FormLabel>CAD Software</FormLabel>
                <FormControl><Input placeholder="e.g. SolidWorks, Onshape" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="githubLink" render={({ field }) => (
              <FormItem className="col-span-1 md:col-span-2">
                <FormLabel>GitHub Link</FormLabel>
                <FormControl><Input placeholder="https://github.com/your-team" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        {/* Software & Autonomy */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6 space-y-6">
          <h3 className="text-lg font-medium text-zinc-100 border-b border-zinc-900 pb-2">Software & Autonomy</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField control={form.control} name="programming" render={({ field }) => (
              <FormItem>
                <FormLabel>Primary Language</FormLabel>
                <FormControl>
                  <NativeSelect {...field} value={field.value ?? ''}>
                    <option value="" disabled>Select Language</option>
                    {PROGRAMMING_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </NativeSelect>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="sensors" render={() => (
              <FormItem>
                <FormLabel>Sensors & Algorithms</FormLabel>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {SENSOR_OPTIONS.map(sensor => (
                    <FormField key={sensor.id} control={form.control} name="sensors" render={({ field }) => {
                       return (
                         <FormItem key={sensor.id} className="flex flex-row items-start space-x-3 space-y-0">
                           <FormControl>
                             <Checkbox checked={field.value?.includes(sensor.id as any)} onCheckedChange={(checked) => {
                               return checked 
                                ? field.onChange([...(field.value || []), sensor.id])
                                : field.onChange(field.value?.filter((v) => v !== sensor.id))
                             }} />
                           </FormControl>
                           <FormLabel className="font-normal text-sm">{sensor.label}</FormLabel>
                         </FormItem>
                       )
                    }} />
                  ))}
                </div>
              </FormItem>
            )} />
            <FormField control={form.control} name="autonomousDescription" render={({ field }) => (
              <FormItem className="col-span-1 md:col-span-2">
                <FormLabel>Autonomous Routine Description (Up to 750 chars)</FormLabel>
                <FormControl><Textarea maxLength={750} placeholder="Describe your autonomous capabilities..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        {/* Proudest Mechanism */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6 space-y-6">
          <h3 className="text-lg font-medium text-zinc-100 border-b border-zinc-900 pb-2">Proudest Mechanism</h3>
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
              <FormLabel>Solution (Up to 1000 chars)</FormLabel>
              <FormControl><Textarea maxLength={1000} placeholder="How did you solve it?" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {/* Team Structure */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6 space-y-6">
          <h3 className="text-lg font-medium text-zinc-100 border-b border-zinc-900 pb-2">Team Structure & Capabilities</h3>
          <FormField control={form.control} name="manufacturingCapabilities" render={() => (
            <FormItem>
              <FormLabel>Manufacturing Capabilities</FormLabel>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                {MFG_OPTIONS.map(opt => (
                  <FormField key={opt.id} control={form.control} name="manufacturingCapabilities" render={({ field }) => {
                     return (
                       <FormItem key={opt.id} className="flex flex-row items-start space-x-2 space-y-0">
                         <FormControl>
                           <Checkbox checked={field.value?.includes(opt.id as any)} onCheckedChange={(checked) => {
                             return checked 
                              ? field.onChange([...(field.value || []), opt.id])
                              : field.onChange(field.value?.filter((v) => v !== opt.id))
                           }} />
                         </FormControl>
                         <FormLabel className="font-normal text-xs">{opt.label}</FormLabel>
                       </FormItem>
                     )
                  }} />
                ))}
              </div>
            </FormItem>
          )} />
          <FormField control={form.control} name="subteamBreakdown" render={({ field }) => (
            <FormItem>
              <FormLabel>Subteam Breakdown (Up to 1000 chars)</FormLabel>
              <FormControl><Textarea maxLength={1000} placeholder="Describe your team structure..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {/* Visual Pitch Carousel */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
            <h3 className="text-lg font-medium text-zinc-100">Visual Pitch Assets</h3>
            <div>
              <label className="cursor-pointer inline-flex items-center gap-2 rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-950 hover:bg-white transition-colors">
                <Upload className="h-4 w-4" /> Upload Image
                <input type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleUpload} />
              </label>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visualItems.map((item, index) => (
              <div key={item.id} className="relative rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900/50 aspect-video group">
                 <Image src={item.url} alt={`Slide ${index}`} fill className="object-cover" />
                 <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                   <button type="button" onClick={() => removeVisual(index)} className="self-end p-1.5 bg-red-500/20 text-red-300 rounded hover:bg-red-500/40 transition-colors">
                     <Trash className="h-4 w-4" />
                   </button>
                   <FormField control={form.control} name={`visualPitchItems.${index}.caption`} render={({field}) => (
                      <FormControl>
                        <Input className="bg-zinc-950/80 border-none text-xs h-8 placeholder:text-zinc-400" placeholder="Add caption..." {...field} />
                      </FormControl>
                   )} />
                 </div>
              </div>
            ))}
            {visualItems.length === 0 && (
              <div className="col-span-full py-12 border-2 border-dashed border-zinc-800 rounded-lg text-center text-zinc-500 text-sm">
                 <ImageIcon className="mx-auto h-8 w-8 mb-2 opacity-50" />
                 Upload images to build your visual pitch carousel
              </div>
            )}
          </div>
        </div>

        {/* Narrative / Mission */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6 space-y-6">
          <h3 className="text-lg font-medium text-zinc-100 border-b border-zinc-900 pb-2">Narrative</h3>
          <FormField control={form.control} name="missionStatement" render={({ field }) => (
            <FormItem>
              <FormLabel>Mission Statement</FormLabel>
              <FormControl><Textarea className="min-h-[100px]" placeholder="Our objective is..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="technicalSummary" render={({ field }) => (
            <FormItem>
              <FormLabel>Technical Summary</FormLabel>
              <FormControl><Textarea className="min-h-[100px]" placeholder="An overview of your technical strategy..." {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="outreachSummary" render={({ field }) => (
            <FormItem>
              <FormLabel>Outreach Summary</FormLabel>
              <FormControl><Textarea className="min-h-[100px]" placeholder="Your team's impact..." {...field} /></FormControl>
            </FormItem>
          )} />
        </div>
      </form>
    </Form>
  )
}

function NativeSelect({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
        'ring-offset-background focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}

'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { pitchSchema, type PitchInput } from '@/lib/schemas/pitch'
import { savePitch } from '@/app/actions/pitch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Trash2, Plus } from 'lucide-react'

export function PitchForm() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const form = useForm<PitchInput>({
    resolver: zodResolver(pitchSchema),
    defaultValues: {
      title: '',
      summary: '',
      costExplanation: '',
      lineItems: [{ label: '', qty: 1, unitCostCents: 0, totalCents: 0 }],
      financialAskCents: 0,
    },
  })

  const { fields, append, remove } = useFieldArray({
    name: 'lineItems',
    control: form.control,
  })

  // Watch line items to recalculate totals
  const lineItems = form.watch('lineItems')
  
  const calculateTotal = (items: typeof lineItems) => {
    return items.reduce((acc, item) => acc + (item.qty * item.unitCostCents), 0)
  }

  const handleLineItemChange = (index: number, field: 'qty' | 'unitCostCents', value: string) => {
    const numValue = parseInt(value) || 0
    form.setValue(`lineItems.${index}.${field}`, numValue)
    
    // Recalculate row total
    const item = form.getValues(`lineItems.${index}`)
    const totalCents = item.qty * item.unitCostCents
    form.setValue(`lineItems.${index}.totalCents`, totalCents)
    
    // Recalculate grand total
    const allItems = form.getValues('lineItems')
    form.setValue('financialAskCents', calculateTotal(allItems))
  }

  async function onSubmit(values: PitchInput, status: 'draft' | 'submitted') {
    setIsPending(true)
    setError(null)
    const result = await savePitch(values, status)
    if (result?.error) {
      setError(result.error)
      setIsPending(false)
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Create Pitch</CardTitle>
        <CardDescription>
          Build a comprehensive sponsorship pitch to send to targeted companies.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-8">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">1. Overview</h3>
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pitch Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 2024 World Championship Fund" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="summary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Executive Summary</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Briefly describe what you are raising money for and the impact it will have." 
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">2. Financial Ask</h3>
              
              <FormField
                control={form.control}
                name="costExplanation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Explanation</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Explain why you need these specific items and how they support your team's goals." 
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <FormLabel>Budget Line Items</FormLabel>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => append({ label: '', qty: 1, unitCostCents: 0, totalCents: 0 })}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add Item
                  </Button>
                </div>
                
                <div className="border rounded-md divide-y">
                  <div className="grid grid-cols-12 gap-4 p-4 bg-muted/50 font-medium text-sm">
                    <div className="col-span-5">Item / Service</div>
                    <div className="col-span-2 text-center">Qty</div>
                    <div className="col-span-2 text-right">Unit Cost ($)</div>
                    <div className="col-span-2 text-right">Total ($)</div>
                    <div className="col-span-1"></div>
                  </div>
                  
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-12 gap-4 p-4 items-center">
                      <div className="col-span-5">
                        <FormField
                          control={form.control}
                          name={`lineItems.${index}.label`}
                          render={({ field: inputField }) => (
                            <FormItem>
                              <FormControl>
                                <Input placeholder="e.g., Robot Parts Kit" {...inputField} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name={`lineItems.${index}.qty`}
                          render={({ field: inputField }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  className="text-center"
                                  {...inputField} 
                                  onChange={(e) => handleLineItemChange(index, 'qty', e.target.value)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name={`lineItems.${index}.unitCostCents`}
                          render={({ field: inputField }) => (
                            <FormItem>
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-2 text-muted-foreground text-sm">$</span>
                                  <Input 
                                    type="number" 
                                    min="0" 
                                    step="0.01"
                                    className="pl-6 text-right"
                                    value={inputField.value ? inputField.value / 100 : ''}
                                    onChange={(e) => {
                                      const cents = Math.round(parseFloat(e.target.value) * 100) || 0
                                      handleLineItemChange(index, 'unitCostCents', cents.toString())
                                    }}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-2 text-right font-medium">
                        ${(form.watch(`lineItems.${index}.totalCents`) / 100).toFixed(2)}
                      </div>
                      <div className="col-span-1 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => {
                            remove(index)
                            setTimeout(() => {
                              form.setValue('financialAskCents', calculateTotal(form.getValues('lineItems')))
                            }, 0)
                          }}
                          disabled={fields.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-end p-4 bg-muted/30 rounded-md">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground mb-1">Total Financial Ask</p>
                    <p className="text-2xl font-bold">${(form.watch('financialAskCents') / 100).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-6 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={form.handleSubmit((v) => onSubmit(v, 'draft'))}
                disabled={isPending}
              >
                Save as Draft
              </Button>
              <Button 
                type="button" 
                onClick={form.handleSubmit((v) => onSubmit(v, 'submitted'))}
                disabled={isPending}
              >
                {isPending ? 'Saving...' : 'Submit for Review'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

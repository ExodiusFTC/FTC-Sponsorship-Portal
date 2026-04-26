# Premium Input Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace primitive `<textarea>` inputs on 5 core narrative fields with a TipTap rich-text editor, and intercept logo/pitch-image uploads with a client-side aspect-ratio crop dialog before Supabase storage upload.

**Architecture:** Two new `components/ui/` primitives (`RichTextEditor` and `ImageCropperDialog`) are self-contained and drop-in compatible with `react-hook-form` Controller. Schema sanitization via `isomorphic-dompurify` runs server-side inside server actions; plain-text length validation strips HTML tags before measuring. No backend changes.

**Tech Stack:** TipTap (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-placeholder`), `isomorphic-dompurify`, `react-easy-crop`, Vitest (schema unit tests), Next.js dynamic import for SSR guard.

---

## File Manifest

| File | Action |
|---|---|
| `vitest.config.ts` | Create |
| `lib/__tests__/submission-schema.test.ts` | Create |
| `lib/__tests__/team-schema.test.ts` | Create |
| `lib/schemas/submission.ts` | Modify |
| `lib/schemas/team.ts` | Modify |
| `components/ui/rich-text-editor-inner.tsx` | Create |
| `components/ui/rich-text-editor.tsx` | Create |
| `components/portfolio-builder/portfolio-form.tsx` | Modify |
| `components/team/edit-form.tsx` | Modify |
| `components/ui/image-cropper-dialog.tsx` | Create |
| `components/coach/portfolio-tab.tsx` | Modify |

---

## Task 1: Install dependencies + Vitest setup

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (scripts only, via npm install)

- [ ] **Step 1: Install runtime dependencies**

```bash
cd "/Users/anish/Documents/Exodius/FTC Sponsorship Portal"
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-placeholder isomorphic-dompurify react-easy-crop
```

Expected: packages added to `dependencies` in `package.json`, no peer dependency errors.

- [ ] **Step 2: Install Vitest and test utilities**

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @types/dompurify
```

Expected: packages added to `devDependencies`.

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: [],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

- [ ] **Step 4: Add test script to `package.json`**

Open `package.json` and add `"test": "vitest run"` to the `scripts` block:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "typecheck": "tsc --noEmit",
  "test": "vitest run"
}
```

- [ ] **Step 5: Verify Vitest is runnable**

```bash
npx vitest run --reporter=verbose 2>&1 | head -10
```

Expected: output contains "No test files found" or similar — not an install error.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "chore: install tiptap, react-easy-crop, dompurify, vitest"
```

---

## Task 2: Update `submission.ts` schema — sanitize + plain-text length validation

**Files:**
- Create: `lib/__tests__/submission-schema.test.ts`
- Modify: `lib/schemas/submission.ts`

- [ ] **Step 1: Create the failing test file**

```ts
// lib/__tests__/submission-schema.test.ts
import { describe, it, expect } from 'vitest'
import { submissionSchema } from '../schemas/submission'

const VALID_BASE = {
  sponsorId: '00000000-0000-0000-0000-000000000001',
  customPitchAlignment: 'A'.repeat(60),
  specificNeedsStatement: 'B'.repeat(60),
}

describe('submissionSchema — customPitchAlignment', () => {
  it('strips <script> XSS from customPitchAlignment', () => {
    const result = submissionSchema.safeParse({
      ...VALID_BASE,
      customPitchAlignment: '<script>alert(1)</script>' + 'A'.repeat(60),
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.customPitchAlignment).not.toContain('<script>')
    }
  })

  it('fails when plain-text content is under 50 chars (ignores HTML tags)', () => {
    const result = submissionSchema.safeParse({
      ...VALID_BASE,
      customPitchAlignment: '<p><strong>' + 'A'.repeat(30) + '</strong></p>',
    })
    expect(result.success).toBe(false)
  })

  it('passes when plain-text is over 50 chars even if HTML string is long', () => {
    const manyTags = '<p><strong><em>' + 'A'.repeat(60) + '</em></strong></p>'
    const result = submissionSchema.safeParse({
      ...VALID_BASE,
      customPitchAlignment: manyTags,
    })
    expect(result.success).toBe(true)
  })

  it('fails when plain-text exceeds 1500 chars', () => {
    const result = submissionSchema.safeParse({
      ...VALID_BASE,
      customPitchAlignment: 'A'.repeat(1501),
    })
    expect(result.success).toBe(false)
  })
})

describe('submissionSchema — specificNeedsStatement', () => {
  it('strips XSS from specificNeedsStatement', () => {
    const result = submissionSchema.safeParse({
      ...VALID_BASE,
      specificNeedsStatement: '<img src=x onerror=alert(1)>' + 'B'.repeat(60),
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.specificNeedsStatement).not.toContain('onerror')
    }
  })

  it('fails when plain-text is under 50 chars', () => {
    const result = submissionSchema.safeParse({
      ...VALID_BASE,
      specificNeedsStatement: 'Short',
    })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npx vitest run lib/__tests__/submission-schema.test.ts --reporter=verbose
```

Expected: FAIL — `submissionSchema` doesn't sanitize yet.

- [ ] **Step 3: Update `lib/schemas/submission.ts`**

Replace the entire file contents:

```ts
import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'

function richTextField(min: number, max: number, minMsg: string, maxMsg: string) {
  return z
    .string()
    .trim()
    .transform((val) => DOMPurify.sanitize(val))
    .superRefine((val, ctx) => {
      const text = val.replace(/<[^>]*>?/gm, '').trim()
      if (text.length < min) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_small,
          minimum: min,
          type: 'string',
          inclusive: true,
          message: minMsg,
        })
      }
      if (text.length > max) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_big,
          maximum: max,
          type: 'string',
          inclusive: true,
          message: maxMsg,
        })
      }
    })
}

export const submissionSchema = z.object({
  sponsorId: z.string().uuid('Sponsor is required'),
  customPitchAlignment: richTextField(
    50,
    1500,
    'Please explain why your team aligns with this company (min 50 chars).',
    'Pitch alignment must be 1500 characters or fewer'
  ),
  specificNeedsStatement: richTextField(
    50,
    1500,
    'Please detail your specific financial or material needs.',
    'Specific needs must be 1500 characters or fewer'
  ),
  localConnectionNotes: z.string().max(1000, 'Must be 1000 characters or fewer').optional(),
})

export type SubmissionInput = z.infer<typeof submissionSchema>
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npx vitest run lib/__tests__/submission-schema.test.ts --reporter=verbose
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck 2>&1 | tail -5
```

Expected: no errors (or only pre-existing errors unrelated to this file).

- [ ] **Step 6: Commit**

```bash
git add lib/schemas/submission.ts lib/__tests__/submission-schema.test.ts
git commit -m "feat: sanitize and validate rich-text submission fields against plain-text length"
```

---

## Task 3: Update `team.ts` schema — sanitize + plain-text length validation

**Files:**
- Create: `lib/__tests__/team-schema.test.ts`
- Modify: `lib/schemas/team.ts`

- [ ] **Step 1: Create the failing test file**

```ts
// lib/__tests__/team-schema.test.ts
import { describe, it, expect } from 'vitest'
import { teamOnboardingSchema } from '../schemas/team'

const VALID_EXISTING_BASE = {
  status: 'existing' as const,
  ftcTeamNumber: 12345,
  teamName: 'Test Robotics',
  city: 'San Jose',
  state: 'California',
  missionStatement: 'A'.repeat(60),
  taxStatus: '501c3' as const,
  budgetItems: [],
  financialAskCents: 0,
}

describe('teamOnboardingSchema — missionStatement', () => {
  it('strips XSS script tag from missionStatement', () => {
    const result = teamOnboardingSchema.safeParse({
      ...VALID_EXISTING_BASE,
      missionStatement: '<script>alert(1)</script>' + 'A'.repeat(60),
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.missionStatement).not.toContain('<script>')
    }
  })

  it('fails when plain-text is under 50 chars', () => {
    const result = teamOnboardingSchema.safeParse({
      ...VALID_EXISTING_BASE,
      missionStatement: '<p>' + 'A'.repeat(30) + '</p>',
    })
    expect(result.success).toBe(false)
  })

  it('passes when formatted HTML has 60+ plain-text chars', () => {
    const result = teamOnboardingSchema.safeParse({
      ...VALID_EXISTING_BASE,
      missionStatement: '<p><strong>' + 'A'.repeat(60) + '</strong></p>',
    })
    expect(result.success).toBe(true)
  })

  it('fails when plain-text exceeds 1500 chars', () => {
    const result = teamOnboardingSchema.safeParse({
      ...VALID_EXISTING_BASE,
      missionStatement: 'A'.repeat(1501),
    })
    expect(result.success).toBe(false)
  })
})

describe('teamOnboardingSchema — technicalSummary', () => {
  it('strips XSS from technicalSummary', () => {
    const result = teamOnboardingSchema.safeParse({
      ...VALID_EXISTING_BASE,
      technicalSummary: '<img src=x onerror=alert(1)>valid content here',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.technicalSummary).not.toContain('onerror')
    }
  })

  it('passes when technicalSummary is undefined (optional)', () => {
    const result = teamOnboardingSchema.safeParse({
      ...VALID_EXISTING_BASE,
      technicalSummary: undefined,
    })
    expect(result.success).toBe(true)
  })

  it('fails when plain-text exceeds 2000 chars', () => {
    const result = teamOnboardingSchema.safeParse({
      ...VALID_EXISTING_BASE,
      technicalSummary: 'A'.repeat(2001),
    })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npx vitest run lib/__tests__/team-schema.test.ts --reporter=verbose
```

Expected: FAIL — schema doesn't sanitize yet.

- [ ] **Step 3: Update `lib/schemas/team.ts`**

Add the import and `richTextField` helper at the top, then replace the three field definitions. The rest of the file stays unchanged.

Add at the very top of the file (before the `z` import line, after it):
```ts
import DOMPurify from 'isomorphic-dompurify'
```

Add this helper function after the `emptyToUndefined` declaration:
```ts
function richTextField(min: number | null, max: number, minMsg: string | null, maxMsg: string) {
  return z
    .string()
    .trim()
    .transform((val) => DOMPurify.sanitize(val))
    .superRefine((val, ctx) => {
      const text = val.replace(/<[^>]*>?/gm, '').trim()
      if (min !== null && text.length < min) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_small,
          minimum: min,
          type: 'string',
          inclusive: true,
          message: minMsg!,
        })
      }
      if (text.length > max) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_big,
          maximum: max,
          type: 'string',
          inclusive: true,
          message: maxMsg,
        })
      }
    })
}
```

Replace the `missionStatement` field definition:
```ts
  // BEFORE:
  missionStatement: z
    .string()
    .trim()
    .min(50, 'Mission statement should be at least 50 characters')
    .max(1500, 'Mission statement must be 1500 characters or fewer'),

  // AFTER:
  missionStatement: richTextField(
    50, 1500,
    'Mission statement should be at least 50 characters',
    'Mission statement must be 1500 characters or fewer'
  ),
```

Replace the `technicalSummary` field definition:
```ts
  // BEFORE:
  technicalSummary: z.string().trim().max(2000, 'Must be 2000 characters or fewer').optional(),

  // AFTER:
  technicalSummary: richTextField(null, 2000, null, 'Must be 2000 characters or fewer').optional(),
```

Replace the `outreachSummary` field definition:
```ts
  // BEFORE:
  outreachSummary: z.string().trim().max(2000, 'Must be 2000 characters or fewer').optional(),

  // AFTER:
  outreachSummary: richTextField(null, 2000, null, 'Must be 2000 characters or fewer').optional(),
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npx vitest run lib/__tests__/team-schema.test.ts --reporter=verbose
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck 2>&1 | tail -5
```

Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add lib/schemas/team.ts lib/__tests__/team-schema.test.ts
git commit -m "feat: sanitize and validate rich-text team portfolio fields against plain-text length"
```

---

## Task 4: Build `rich-text-editor-inner.tsx` (TipTap component)

**Files:**
- Create: `components/ui/rich-text-editor-inner.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/ui/rich-text-editor-inner.tsx
'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Link as TiptapLink } from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, List, ListOrdered, Link, Unlink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RichTextEditorInnerProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export default function RichTextEditorInner({
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: RichTextEditorInnerProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapLink.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: placeholder ?? 'Start typing…' }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[80px] p-3',
      },
    },
  })

  // Sync external value resets (e.g. form.reset()) without moving the cursor on every keystroke
  const currentHTML = editor?.getHTML()
  if (editor && currentHTML !== value && !editor.isFocused) {
    editor.commands.setContent(value ?? '', false)
  }

  const setLink = () => {
    const url = window.prompt('Enter URL')
    if (url === null) return
    if (url === '') {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor
      ?.chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: url })
      .run()
  }

  return (
    <div
      className={cn(
        'rounded-md border border-input bg-background',
        'focus-within:ring-1 focus-within:ring-ring',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      {!disabled && (
        <div className="flex gap-0.5 rounded-t-md border-b border-input bg-muted/40 p-1">
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBold().run()}
            active={editor?.isActive('bold') ?? false}
            title="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            active={editor?.isActive('italic') ?? false}
            title="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            active={editor?.isActive('bulletList') ?? false}
            title="Bullet list"
          >
            <List className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            active={editor?.isActive('orderedList') ?? false}
            title="Ordered list"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </ToolbarButton>
          {editor?.isActive('link') ? (
            <ToolbarButton
              onClick={() => editor.chain().focus().unsetLink().run()}
              active={false}
              title="Remove link"
            >
              <Unlink className="h-3.5 w-3.5" />
            </ToolbarButton>
          ) : (
            <ToolbarButton onClick={setLink} active={false} title="Add link">
              <Link className="h-3.5 w-3.5" />
            </ToolbarButton>
          )}
        </div>
      )}
      <EditorContent
        editor={editor}
        className={cn(
          '[&_.tiptap]:outline-none',
          '[&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-5',
          '[&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-5',
          '[&_.tiptap_li]:my-0.5',
          '[&_.tiptap_a]:text-primary [&_.tiptap_a]:underline',
          '[&_.tiptap_strong]:font-semibold',
          '[&_.tiptap_em]:italic',
          '[&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none',
          '[&_.tiptap_p.is-editor-empty:first-child::before]:float-left',
          '[&_.tiptap_p.is-editor-empty:first-child::before]:h-0',
          '[&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground',
          '[&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
        )}
      />
    </div>
  )
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void
  active: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
        active && 'bg-accent text-accent-foreground'
      )}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck 2>&1 | grep "rich-text-editor-inner" | head -10
```

Expected: no errors on this file.

- [ ] **Step 3: Commit**

```bash
git add components/ui/rich-text-editor-inner.tsx
git commit -m "feat: add TipTap rich-text editor inner component with Bold/Italic/List/Link toolbar"
```

---

## Task 5: Build `rich-text-editor.tsx` (SSR wrapper)

**Files:**
- Create: `components/ui/rich-text-editor.tsx`

- [ ] **Step 1: Create the SSR wrapper**

```tsx
// components/ui/rich-text-editor.tsx
'use client'

import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'

export interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

const RichTextEditorInner = dynamic(
  () => import('./rich-text-editor-inner'),
  {
    ssr: false,
    loading: () => (
      <div
        className={cn(
          'min-h-[100px] animate-pulse rounded-md border border-input bg-muted'
        )}
      />
    ),
  }
)

export function RichTextEditor(props: RichTextEditorProps) {
  return <RichTextEditorInner {...props} />
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck 2>&1 | grep "rich-text-editor" | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/ui/rich-text-editor.tsx
git commit -m "feat: add RichTextEditor SSR wrapper with dynamic import guard"
```

---

## Task 6: Wire `RichTextEditor` into `portfolio-form.tsx`

**Files:**
- Modify: `components/portfolio-builder/portfolio-form.tsx`

The two fields to update are `customPitchAlignment` and `specificNeedsStatement`. `localConnectionNotes` stays as `<Textarea>`.

- [ ] **Step 1: Add the import**

Add to the import block at the top of `portfolio-form.tsx` (after the existing shadcn imports):

```ts
import { RichTextEditor } from '@/components/ui/rich-text-editor'
```

Remove `Textarea` from the import if it is no longer used after this task. Check after making both swaps.

- [ ] **Step 2: Replace `customPitchAlignment` textarea**

Find and replace in `portfolio-form.tsx`:

```tsx
// FIND:
              <FormField
                control={form.control}
                name="customPitchAlignment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Pitch Alignment</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Explain why your team aligns with this company..."
                        className="min-h-[100px]"
                        disabled={readOnly}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

// REPLACE WITH:
              <FormField
                control={form.control}
                name="customPitchAlignment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Pitch Alignment</FormLabel>
                    <FormControl>
                      <RichTextEditor
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        placeholder="Explain why your team aligns with this company..."
                        disabled={readOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
```

- [ ] **Step 3: Replace `specificNeedsStatement` textarea**

```tsx
// FIND:
              <FormField
                control={form.control}
                name="specificNeedsStatement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specific Needs Statement</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Detail your specific financial or material needs..."
                        className="min-h-[100px]"
                        disabled={readOnly}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

// REPLACE WITH:
              <FormField
                control={form.control}
                name="specificNeedsStatement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specific Needs Statement</FormLabel>
                    <FormControl>
                      <RichTextEditor
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        placeholder="Detail your specific financial or material needs..."
                        disabled={readOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
```

- [ ] **Step 4: Remove unused `Textarea` import if no longer referenced**

Check if `Textarea` is still used (it is — `localConnectionNotes` keeps it). Leave the import.

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck 2>&1 | grep "portfolio-form" | head -10
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/portfolio-builder/portfolio-form.tsx
git commit -m "feat: replace pitch alignment and needs statement textareas with RichTextEditor"
```

---

## Task 7: Wire `RichTextEditor` into `edit-form.tsx`

**Files:**
- Modify: `components/team/edit-form.tsx`

Three fields: `missionStatement`, `technicalSummary`, `outreachSummary`.

- [ ] **Step 1: Add the import**

Add after the existing shadcn imports in `edit-form.tsx`:

```ts
import { RichTextEditor } from '@/components/ui/rich-text-editor'
```

- [ ] **Step 2: Replace `missionStatement` textarea**

```tsx
// FIND:
              <FormField
                control={form.control as any}
                name="missionStatement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mission Statement</FormLabel>
                    <FormControl><Textarea className="min-h-[100px]" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

// REPLACE WITH:
              <FormField
                control={form.control as any}
                name="missionStatement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mission Statement</FormLabel>
                    <FormControl>
                      <RichTextEditor
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        placeholder="Describe your team's mission and values…"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
```

- [ ] **Step 3: Replace `technicalSummary` textarea**

```tsx
// FIND:
              <FormField
                control={form.control as any}
                name="technicalSummary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Engineering & Technical Portfolio</FormLabel>
                    <FormControl><Textarea className="min-h-[100px]" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

// REPLACE WITH:
              <FormField
                control={form.control as any}
                name="technicalSummary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Engineering & Technical Portfolio</FormLabel>
                    <FormControl>
                      <RichTextEditor
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        placeholder="Describe your robot design, mechanisms, and technical achievements…"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
```

- [ ] **Step 4: Replace `outreachSummary` textarea**

```tsx
// FIND:
              <FormField
                control={form.control as any}
                name="outreachSummary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Community Outreach</FormLabel>
                    <FormControl><Textarea className="min-h-[100px]" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

// REPLACE WITH:
              <FormField
                control={form.control as any}
                name="outreachSummary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Community Outreach</FormLabel>
                    <FormControl>
                      <RichTextEditor
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        placeholder="Describe your community outreach events and impact…"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
```

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck 2>&1 | grep "edit-form" | head -10
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/team/edit-form.tsx
git commit -m "feat: replace portfolio narrative textareas with RichTextEditor in edit-form"
```

---

## Task 8: Build `image-cropper-dialog.tsx`

**Files:**
- Create: `components/ui/image-cropper-dialog.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/ui/image-cropper-dialog.tsx
'use client'

import { useState, useCallback, useEffect } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider' // shadcn slider — already present

export interface ImageCropperDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: File | null
  aspect: number
  onConfirm: (blob: Blob) => void
}

export function ImageCropperDialog({
  open,
  onOpenChange,
  file,
  aspect,
  onConfirm,
}: ImageCropperDialogProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setImageSrc(url)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return
    setIsProcessing(true)
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels)
      onConfirm(blob)
      onOpenChange(false)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Crop Image</DialogTitle>
        </DialogHeader>
        <div className="relative h-72 w-full overflow-hidden rounded-xl bg-muted">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>
        <div className="flex items-center gap-3 px-1">
          <span className="text-xs text-muted-foreground w-10">Zoom</span>
          <Slider
            min={1}
            max={3}
            step={0.05}
            value={[zoom]}
            onValueChange={([v]) => setZoom(v)}
            className="flex-1"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isProcessing}>
            {isProcessing ? 'Processing…' : 'Crop & Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', reject)
    img.setAttribute('crossOrigin', 'anonymous')
    img.src = url
  })
}

export async function getCroppedBlob(
  imageSrc: string,
  pixelCrop: Area
): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas is empty'))),
      'image/webp',
      0.92
    )
  })
}

/** Computes a center-crop Area for a given image size and target aspect ratio. */
export function computeCenterCrop(
  imageWidth: number,
  imageHeight: number,
  aspect: number
): Area {
  let cropWidth: number
  let cropHeight: number
  if (imageWidth / imageHeight > aspect) {
    cropHeight = imageHeight
    cropWidth = cropHeight * aspect
  } else {
    cropWidth = imageWidth
    cropHeight = cropWidth / aspect
  }
  return {
    x: (imageWidth - cropWidth) / 2,
    y: (imageHeight - cropHeight) / 2,
    width: cropWidth,
    height: cropHeight,
  }
}
```

> **Note on Slider:** `components/ui/slider.tsx` is not in the current UI directory. If it doesn't exist, install it first:
> ```bash
> npx shadcn@latest add slider
> ```
> Then re-run typecheck.

- [ ] **Step 2: Verify slider component exists or install it**

```bash
ls "/Users/anish/Documents/Exodius/FTC Sponsorship Portal/components/ui/slider.tsx" 2>/dev/null && echo "exists" || npx shadcn@latest add slider --yes
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck 2>&1 | grep "image-cropper" | head -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/ui/image-cropper-dialog.tsx
git commit -m "feat: add ImageCropperDialog with react-easy-crop, center-crop utility, WebP output"
```

---

## Task 9: Wire logo cropper into `edit-form.tsx`

**Files:**
- Modify: `components/team/edit-form.tsx`

- [ ] **Step 1: Add imports**

Add at the top of `edit-form.tsx` (after existing imports):

```ts
import { ImageCropperDialog } from '@/components/ui/image-cropper-dialog'
```

- [ ] **Step 2: Add crop state variables**

Inside the `TeamEditForm` component, after the existing `useState` declarations, add:

```ts
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null)
  const [logoCropperOpen, setLogoCropperOpen] = useState(false)
```

- [ ] **Step 3: Replace `handleLogoUpload` and add crop confirm handler**

Find and replace the existing `handleLogoUpload` function:

```ts
// FIND:
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    setLogoError(null)
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadTeamLogo(team.id, fd)
    setLogoUploading(false)
    if ('error' in result && result.error) {
      setLogoError(result.error)
    } else if ('url' in result && result.url) {
      setLogoUrl(result.url as string)
    }
  }

// REPLACE WITH:
  function handleLogoFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingLogoFile(file)
    setLogoCropperOpen(true)
    // Reset input so the same file can be re-selected after cancel
    e.target.value = ''
  }

  async function handleLogoCropConfirm(blob: Blob) {
    setLogoUploading(true)
    setLogoError(null)
    const croppedFile = new File([blob], 'logo.webp', { type: 'image/webp' })
    const fd = new FormData()
    fd.append('file', croppedFile)
    const result = await uploadTeamLogo(team.id, fd)
    setLogoUploading(false)
    if ('error' in result && result.error) {
      setLogoError(result.error)
    } else if ('url' in result && result.url) {
      setLogoUrl(result.url as string)
    }
  }
```

- [ ] **Step 4: Update the file input's `onChange` handler and add dialog**

In the JSX, find the `<Input>` for the logo upload and change `onChange={handleLogoUpload}` to `onChange={handleLogoFileSelect}`.

Then add the `<ImageCropperDialog>` just after the logo `<Card>` closing tag (before `<Form ...>`):

```tsx
      <ImageCropperDialog
        open={logoCropperOpen}
        onOpenChange={setLogoCropperOpen}
        file={pendingLogoFile}
        aspect={1}
        onConfirm={handleLogoCropConfirm}
      />
```

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck 2>&1 | grep "edit-form" | head -10
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/team/edit-form.tsx
git commit -m "feat: intercept logo upload with 1:1 crop dialog in edit-form"
```

---

## Task 10: Wire `RichTextEditor` + pitch image cropper into `portfolio-tab.tsx`

**Files:**
- Modify: `components/coach/portfolio-tab.tsx`

This is the largest change — three RichTextEditor swaps plus the pitch-image upload intercept.

- [ ] **Step 1: Add imports**

Add after the existing imports in `portfolio-tab.tsx`:

```ts
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { ImageCropperDialog, getCroppedBlob, computeCenterCrop } from '@/components/ui/image-cropper-dialog'
```

- [ ] **Step 2: Add crop state variables**

Inside `PortfolioTab`, after the existing `useState` declarations:

```ts
  const [pendingPitchFile, setPendingPitchFile] = useState<File | null>(null)
  const [pitchCropperOpen, setPitchCropperOpen] = useState(false)
```

- [ ] **Step 3: Replace the `handleUpload` function (single-file input)**

```ts
// FIND:
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    toast.loading('Uploading…', { id: 'upload' })
    await uploadFile(file)
    toast.success('Uploaded!', { id: 'upload' })
  }

// REPLACE WITH:
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingPitchFile(file)
    setPitchCropperOpen(true)
    e.target.value = ''
  }

  const handlePitchCropConfirm = async (blob: Blob) => {
    toast.loading('Uploading…', { id: 'upload' })
    const croppedFile = new File([blob], `pitch-${Date.now()}.webp`, { type: 'image/webp' })
    await uploadFile(croppedFile)
    toast.success('Uploaded!', { id: 'upload' })
  }
```

- [ ] **Step 4: Replace the `handleDrop` function (multi-file — auto center-crop)**

```ts
// FIND:
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

// REPLACE WITH:
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setDraggingOver(false)
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(f.type)
    )
    if (files.length === 0) return
    setUploadingDrop(true)
    toast.loading(`Uploading ${files.length} image${files.length > 1 ? 's' : ''}…`, { id: 'drop-upload' })
    await Promise.all(
      files.map(async (file) => {
        // Auto center-crop dropped files at 16:9 — no modal for batch uploads
        const url1 = URL.createObjectURL(file)
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image()
          el.onload = () => resolve(el)
          el.onerror = reject
          el.src = url1
        })
        const cropArea = computeCenterCrop(img.naturalWidth, img.naturalHeight, 16 / 9)
        URL.revokeObjectURL(url1)
        const url2 = URL.createObjectURL(file)
        const blob = await getCroppedBlob(url2, cropArea)
        URL.revokeObjectURL(url2)
        const croppedFile = new File([blob], `pitch-${Date.now()}.webp`, { type: 'image/webp' })
        await uploadFile(croppedFile)
      })
    )
    toast.success('All images uploaded!', { id: 'drop-upload' })
    setUploadingDrop(false)
  }, [])
```

> **Note:** The double `URL.createObjectURL(file)` in the drop handler creates two separate object URLs. The first is for loading image dimensions, the second for `getCroppedBlob`. Each is revoked immediately after use. This is intentional — object URLs from the same File are independent handles.

- [ ] **Step 5: Add `<ImageCropperDialog>` to JSX**

In the return JSX, just before the closing `</Form>` tag, add:

```tsx
        <ImageCropperDialog
          open={pitchCropperOpen}
          onOpenChange={setPitchCropperOpen}
          file={pendingPitchFile}
          aspect={16 / 9}
          onConfirm={handlePitchCropConfirm}
        />
```

- [ ] **Step 6: Replace all three field textareas — there are 4 total replacements**

`missionStatement` appears **twice** (once in the incubator block ~line 247, once in the `!isIncubator` Narrative block ~line 550). `technicalSummary` and `outreachSummary` each appear once in the Narrative block (~lines 557, 563).

**Replacement A — missionStatement in incubator block:**

```tsx
// FIND:
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

// REPLACE WITH:
              <FormField control={form.control} name="missionStatement" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>The "Why": Motivation</FormLabel>
                  <FormDescription>Explain why you want to start a team in your specific community.</FormDescription>
                  <FormControl>
                    <RichTextEditor
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      placeholder="Our motivation is to bring STEM access to…"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
```

**Replacement B — missionStatement in the `!isIncubator` Narrative block:**

```tsx
// FIND:
            <FormField control={form.control} name="missionStatement" render={({ field }) => (
              <FormItem>
                <FormLabel>Mission Statement</FormLabel>
                <FormControl><Textarea className="min-h-[100px]" placeholder="Our objective is…" {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

// REPLACE WITH:
            <FormField control={form.control} name="missionStatement" render={({ field }) => (
              <FormItem>
                <FormLabel>Mission Statement</FormLabel>
                <FormControl>
                  <RichTextEditor
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    placeholder="Our objective is…"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
```

**Replacement C — technicalSummary in the `!isIncubator` Narrative block:**

```tsx
// FIND:
            <FormField control={form.control} name="technicalSummary" render={({ field }) => (
              <FormItem>
                <FormLabel>Technical Summary</FormLabel>
                <FormControl><Textarea className="min-h-[100px]" placeholder="An overview of your technical strategy…" {...field} value={field.value ?? ''} /></FormControl>
              </FormItem>
            )} />

// REPLACE WITH:
            <FormField control={form.control} name="technicalSummary" render={({ field }) => (
              <FormItem>
                <FormLabel>Technical Summary</FormLabel>
                <FormControl>
                  <RichTextEditor
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    placeholder="An overview of your technical strategy…"
                  />
                </FormControl>
              </FormItem>
            )} />
```

**Replacement D — outreachSummary in the `!isIncubator` Narrative block:**

```tsx
// FIND:
            <FormField control={form.control} name="outreachSummary" render={({ field }) => (
              <FormItem>
                <FormLabel>Outreach Summary</FormLabel>
                <FormControl><Textarea className="min-h-[100px]" placeholder="Your team's community impact…" {...field} value={field.value ?? ''} /></FormControl>
              </FormItem>
            )} />

// REPLACE WITH:
            <FormField control={form.control} name="outreachSummary" render={({ field }) => (
              <FormItem>
                <FormLabel>Outreach Summary</FormLabel>
                <FormControl>
                  <RichTextEditor
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    placeholder="Your team's community impact…"
                  />
                </FormControl>
              </FormItem>
            )} />
```

- [ ] **Step 7: Typecheck**

```bash
npm run typecheck 2>&1 | grep "portfolio-tab" | head -20
```

Expected: no errors.

- [ ] **Step 8: Run full typecheck**

```bash
npm run typecheck 2>&1 | tail -5
```

Expected: `Found 0 errors.` (or only pre-existing errors).

- [ ] **Step 9: Run schema unit tests**

```bash
npx vitest run --reporter=verbose
```

Expected: all tests pass.

- [ ] **Step 10: Commit**

```bash
git add components/coach/portfolio-tab.tsx
git commit -m "feat: wire RichTextEditor and 16:9 image cropper into portfolio tab"
```

---

## Task 11: Build verification

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run --reporter=verbose
```

Expected: all tests pass.

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: `Found 0 errors.`

- [ ] **Step 3: Lint**

```bash
npm run lint 2>&1 | tail -10
```

Expected: no new errors.

- [ ] **Step 4: Build**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds. Watch for any `dynamic import` warnings and confirm no SSR errors for TipTap.

- [ ] **Step 5: Smoke-test checklist (manual)**

Start the dev server (`npm run dev`) and verify:
- [ ] Portfolio form (`/dashboard`) shows RichTextEditor for pitch alignment and needs fields
- [ ] Bold/Italic/List/Link toolbar buttons are visible and functional
- [ ] Placeholder text appears in empty editors
- [ ] Autosave indicator still fires 2 seconds after typing
- [ ] Logo upload on team edit page opens the 1:1 crop dialog; confirming uploads a WebP
- [ ] Cancelling the crop dialog does NOT trigger an upload
- [ ] Visual pitch image upload in portfolio tab opens 16:9 crop dialog
- [ ] Drag-dropping multiple images uploads all without opening modals
- [ ] Existing plain-text content in the DB renders correctly inside TipTap

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete premium input components — rich text editor and image cropper"
```

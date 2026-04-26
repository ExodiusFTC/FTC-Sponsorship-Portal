# Design: Premium Input Components — Rich Text Editor + Image Cropper

**Date:** 2026-04-25  
**Scope:** Agent 1 of 4 — `components/ui/*`, `components/portfolio-builder/*`, `components/coach/*`, `components/team/*`, `lib/schemas/*`  
**Status:** Approved

---

## Problem

The sponsorship portal's data-entry pipeline uses primitive HTML inputs for high-stakes narrative content:

1. **Textareas** — `mission_statement`, `technical_summary`, `outreach_summary`, `custom_pitch_alignment`, and `specific_needs_statement` accept raw unformatted text. Coaches cannot bold key points, create bullet lists, or add links. Sponsor-facing views show flat prose, which underperforms relative to formatted pitches.
2. **Raw file inputs** — Logo and visual pitch image uploads use bare `<input type="file">`. No aspect-ratio enforcement means inconsistent image dimensions break the sponsor-facing grid layouts.

## Goals

- Replace the 5 core narrative textareas with a TipTap-based rich text editor that stores sanitized HTML.
- Enforce 1:1 aspect ratio on logo uploads and 16:9 on visual pitch image uploads via a client-side crop-before-upload dialog.
- Zero backend schema changes. Zero server action changes. All mutations remain in existing actions.

## Non-Goals

- Replacing every textarea in the app (only the 5 named fields).
- Changing DB column types (they remain `TEXT`; HTML is valid text).
- Adding new storage buckets or RLS policies.

---

## Phase 1 — Rich Text Editor

### New Component: `components/ui/rich-text-editor.tsx`

**Architecture:** Two-file SSR guard pattern.

- `rich-text-editor.tsx` — public export. Uses `dynamic(() => import('./rich-text-editor-inner'), { ssr: false })`. Safe to import in any server-component tree. No `'use client'` directive needed here.
- `rich-text-editor-inner.tsx` — `'use client'` at the top. Holds the actual TipTap `useEditor` hook and toolbar JSX. Never imported directly by consumers; only loaded via the dynamic import above.

**Props interface:**
```ts
interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}
```

Drop-in replacement for shadcn `<Textarea>`. Compatible with `react-hook-form` `<Controller>` and `<FormControl>`.

**TipTap extensions:** `StarterKit`, `Link`, `Placeholder`.

**Toolbar items:** Bold, Italic, BulletList, OrderedList, Link (toggle insert/remove).  
Icons: `lucide-react` (already installed) — `Bold`, `Italic`, `List`, `ListOrdered`, `Link`, `Unlink`.

**Styling rules:**
- Outer wrapper: `border border-input rounded-md bg-background` + `ring-1 ring-ring` on focus-within.
- Toolbar: `flex gap-1 p-1 border-b border-input bg-muted/40`. Active toolbar buttons get `bg-accent text-accent-foreground`.
- Editor content area: `prose prose-sm dark:prose-invert max-w-none p-3 min-h-[100px] focus:outline-none`.
- Placeholder: TipTap `Placeholder` extension, `text-muted-foreground` via `.tiptap p.is-editor-empty:first-child::before`.
- `disabled` prop sets `editable={false}` on the editor and applies `opacity-50 cursor-not-allowed` to the wrapper.

**Dependencies to install:** `@tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-placeholder isomorphic-dompurify @types/dompurify`

---

### Schema Updates

**Affected files:** `lib/schemas/submission.ts`, `lib/schemas/team.ts`

**Pattern applied to each of the 5 fields:**

```ts
z.string()
  .transform(val => DOMPurify.sanitize(val))
  .superRefine((val, ctx) => {
    const text = val.replace(/<[^>]*>?/gm, '').trim()
    if (text.length < MIN) {
      ctx.addIssue({ code: z.ZodIssueCode.too_small, minimum: MIN, type: 'string', inclusive: true, message: '...' })
    }
    if (text.length > MAX) {
      ctx.addIssue({ code: z.ZodIssueCode.too_big, maximum: MAX, type: 'string', inclusive: true, message: '...' })
    }
  })
```

**Fields and their limits (unchanged — validated against plain text):**

| Field | Schema file | Min | Max |
|---|---|---|---|
| `missionStatement` | `team.ts` | 50 | 1500 |
| `technicalSummary` | `team.ts` | — | 2000 |
| `outreachSummary` | `team.ts` | — | 2000 |
| `customPitchAlignment` | `submission.ts` | 50 | 1500 |
| `specificNeedsStatement` | `submission.ts` | 50 | 1500 |

`DOMPurify.sanitize` runs **before** the `superRefine` length check, so the stored value is always sanitized HTML and the length check is always against visible characters.

---

### Form Integration

**3 files to update:**

1. `components/portfolio-builder/portfolio-form.tsx` — replace `<Textarea>` with `<RichTextEditor>` for `customPitchAlignment` and `specificNeedsStatement`. `localConnectionNotes` stays as `<Textarea>` (optional, no min, low-stakes).

2. `components/team/edit-form.tsx` — replace `<Textarea>` with `<RichTextEditor>` for `missionStatement`, `technicalSummary`, `outreachSummary`.

3. `components/coach/portfolio-tab.tsx` — replace `<Textarea>` with `<RichTextEditor>` for `missionStatement`, `technicalSummary`, and `outreachSummary` only. `communityInterestText`, `sustainabilityPlan`, and all other textareas in the form stay as plain `<Textarea>`.

**Autosave compatibility:** TipTap calls `onChange` (via `onUpdate`) on every edit. The existing 2-second debounce in `portfolio-form.tsx` fires exactly as before — no changes needed to the autosave logic.

**Read-only support:** Pass `disabled={readOnly}` to `<RichTextEditor>`. The inner component sets `editor.setEditable(false)`.

---

## Phase 2 — Image Cropper Dialog

### New Component: `components/ui/image-cropper-dialog.tsx`

**Library:** `react-easy-crop` — chosen over `react-image-crop` for its built-in pinch/zoom gesture support and fully controlled state model.

**Props interface:**
```ts
interface ImageCropperDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: File | null
  aspect: number          // 1 for logos, 16/9 for pitch images
  onConfirm: (blob: Blob) => void
}
```

**Internal flow:**
1. On `open=true` with a `file`, convert file to object URL via `URL.createObjectURL`.
2. Mount `<Cropper>` from `react-easy-crop` with `aspect` prop.
3. Track `crop`, `zoom`, and `croppedAreaPixels` in local state.
4. On "Crop & Upload" button: call `getCroppedBlob(imageSrc, croppedAreaPixels)` utility (canvas-based extraction) → call `onConfirm(blob)` → close dialog.
5. On cancel or dialog close: revoke the object URL (`URL.revokeObjectURL`) to avoid memory leaks.

**`getCroppedBlob` utility** (defined in same file, not exported):
- Creates an offscreen `<canvas>` sized to `croppedAreaPixels.width × croppedAreaPixels.height`.
- Draws the source image region onto the canvas.
- Returns `canvas.toBlob('image/webp', 0.92)` — WebP for smaller file sizes.

**Styling:** Uses the existing `Dialog` / `DialogContent` / `DialogFooter` from `components/ui/dialog.tsx`. Crop area is `relative h-[300px] w-full bg-muted rounded-lg overflow-hidden`. Zoom slider below the crop area. Cancel + "Crop & Upload" buttons in `DialogFooter`.

**Dependencies to install:** `react-easy-crop`

---

### Upload Integration

**Logo upload** (`components/team/edit-form.tsx`):

Current flow: `input[type=file] onChange → handleLogoUpload(file) → uploadTeamLogo(formData)`

New flow: `input[type=file] onChange → set pendingLogoFile + openCropper=true → ImageCropperDialog onConfirm(blob) → blob→File → uploadTeamLogo(formData)`

State additions: `pendingLogoFile: File | null`, `cropperOpen: boolean`.

**Visual pitch uploads** (`components/coach/portfolio-tab.tsx`):

Current flow: `input[type=file] / drop → uploadFile(file) → supabase.storage.upload → appendVisual`

New flow (single file via input): `input[type=file] → set pendingPitchFile + cropperOpen=true → ImageCropperDialog onConfirm(blob) → blob→File → uploadFile(croppedFile) → appendVisual`

New flow (multi-file drag-drop): Each dropped file gets an automatic center crop (no modal) using the same `getCroppedBlob` utility with a center-computed `croppedAreaPixels`. Opening a crop modal per file in a multi-file drop is disruptive UX; center-crop is the right default for batch uploads.

---

## File Manifest

| File | Action |
|---|---|
| `components/ui/rich-text-editor.tsx` | Create (SSR wrapper) |
| `components/ui/rich-text-editor-inner.tsx` | Create (TipTap component) |
| `components/ui/image-cropper-dialog.tsx` | Create |
| `lib/schemas/team.ts` | Modify (3 fields) |
| `lib/schemas/submission.ts` | Modify (2 fields) |
| `components/portfolio-builder/portfolio-form.tsx` | Modify (2 fields) |
| `components/team/edit-form.tsx` | Modify (3 fields + logo cropper) |
| `components/coach/portfolio-tab.tsx` | Modify (5 fields + pitch image cropper) |

## Forbidden Files (do not touch)

`supabase/migrations/*`, `app/actions/team.ts`, `app/actions/submission.ts`, `app/actions/auth.ts`, any API routes.

---

## Testing Checklist

- [ ] RichTextEditor renders without SSR errors in Next.js App Router
- [ ] Bold/Italic/List/Link toolbar buttons toggle correctly
- [ ] `onChange` fires on every keystroke; autosave debounce still triggers
- [ ] `disabled` prop disables editing and applies visual opacity
- [ ] Zod rejects empty submissions (plain-text length < 50)
- [ ] Zod accepts content where HTML pushes raw string past the max but plain text is under
- [ ] XSS payload (`<script>alert(1)</script>`) is stripped by DOMPurify before schema validation
- [ ] Logo upload opens cropper at 1:1, confirms with cropped WebP
- [ ] Visual pitch upload opens cropper at 16:9, confirms with cropped WebP
- [ ] Multi-file drop opens cropper sequentially for each file
- [ ] Cancelling the cropper discards the file; no upload occurs
- [ ] Object URLs are revoked on dialog close (no memory leaks)
- [ ] Existing plain-text content in DB renders correctly inside TipTap (plain text is valid TipTap content)

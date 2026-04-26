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
    loading: () => <div className={cn('min-h-[100px] animate-pulse rounded-md border border-input bg-muted')} />,
  }
)

export function RichTextEditor(props: RichTextEditorProps) {
  return <RichTextEditorInner {...props} />
}

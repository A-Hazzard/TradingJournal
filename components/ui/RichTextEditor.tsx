'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import { Bold, Italic, List, ListOrdered, Heading2, Quote, Minus } from 'lucide-react'
import { cn } from '@/lib/formatters'
import { useEffect } from 'react'

type Props = {
  content: string
  onChange?: (html: string) => void
  placeholder?: string
  readOnly?: boolean
  className?: string
}

function ToolbarButton({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className={cn(
        'p-1.5 rounded transition-colors',
        active ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text-primary hover:bg-surface-alt'
      )}
    >
      {children}
    </button>
  )
}

export function RichTextEditor({ content, onChange, placeholder = 'Write your notes...', readOnly = false, className }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
  })

  // Sync content prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content])

  if (readOnly) {
    return (
      <div
        className={cn('prose prose-invert prose-sm max-w-none text-text-primary', className)}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    )
  }

  return (
    <div className={cn('tiptap-editor bg-surface-alt border border-border rounded-xl overflow-hidden', className)}>
      {!readOnly && editor && (
        <div className="flex items-center gap-1 px-3 py-2 border-b border-border flex-wrap">
          <ToolbarButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold size={14} />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic size={14} />
          </ToolbarButton>
          <div className="w-px h-4 bg-border mx-1" />
          <ToolbarButton active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            <Heading2 size={14} />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <List size={14} />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <ListOrdered size={14} />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
            <Quote size={14} />
          </ToolbarButton>
          <ToolbarButton active={false} onClick={() => editor.chain().focus().setHorizontalRule().run()}>
            <Minus size={14} />
          </ToolbarButton>
        </div>
      )}
      <EditorContent editor={editor} className="px-4 py-3 min-h-[120px]" />
    </div>
  )
}

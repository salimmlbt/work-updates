'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Toolbar } from './toolbar'
import Underline from '@tiptap/extension-underline'
import { useEffect } from 'react'
import type { Profile } from '@/lib/types'
import { Button } from '../ui/button'
import { Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface RichTextEditorProps {
  initialContent: any
  userProfile: Profile | null
  onUpdate: (content: any) => void
  isDirty: boolean
}

export function RichTextEditor({
  initialContent,
  userProfile,
  onUpdate,
}: RichTextEditorProps) {
  const { toast } = useToast()

  const permissions = userProfile?.roles?.permissions as Record<string, string>
  const isEditor = permissions?.tasks === 'Editor' || userProfile?.roles?.name === 'Falaq Admin'

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: initialContent,
    editable: isEditor,
    editorProps: {
      attributes: {
        class: cn(
          'prose dark:prose-invert max-w-full min-h-[150px] focus:outline-none',
          isEditor && 'rounded-bl-md rounded-br-md p-4',
          !isEditor && 'p-4'
        ),
      },
    },
    onUpdate: ({ editor }) => {
      onUpdate(editor.getJSON())
    },
  })

  // When initialContent changes (e.g., viewing a different task), reset the editor state.
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      // Check if content is actually different to prevent unnecessary updates and cursor jumps.
      if (JSON.stringify(editor.getJSON()) !== JSON.stringify(initialContent)) {
        editor.commands.setContent(initialContent, false) // `false` prevents firing the onUpdate
      }
    }
  }, [initialContent, editor])

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.setEditable(isEditor)
    }
  }, [isEditor, editor])

  const handleCopy = () => {
    if (editor) {
      const text = editor.getText()
      navigator.clipboard.writeText(text).then(() => {
        toast({ title: 'Copied to clipboard!' })
      })
    }
  }

  return (
    <div className="flex flex-col justify-stretch">
      {isEditor ? (
        <>
          <div className="flex justify-between items-center rounded-tl-md rounded-tr-md p-2">
            <Toolbar editor={editor} />
          </div>
          <EditorContent editor={editor} />
        </>
      ) : (
        <div className="relative">
          <div className="prose dark:prose-invert max-w-full rounded-md p-4 min-h-[150px] bg-transparent">
            {editor && <EditorContent editor={editor} />}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2"
            onClick={handleCopy}
            title="Copy text"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

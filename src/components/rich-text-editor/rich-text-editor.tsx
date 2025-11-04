'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Toolbar } from './toolbar'
import Underline from '@tiptap/extension-underline'
import { useEffect, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import type { Profile } from '@/lib/types'
import { Button } from '../ui/button'
import { Copy, Save } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
  taskId: string
  initialContent: any
  userProfile: Profile | null
}

export function RichTextEditor({
  taskId,
  initialContent,
  userProfile,
}: RichTextEditorProps) {
  const [content, setContent] = useState(initialContent)
  const [isDirty, setIsDirty] = useState(false)
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()
  const { toast } = useToast()

  const permissions = userProfile?.roles?.permissions as Record<string, string>
  const isEditor = permissions?.tasks === 'Editor' || userProfile?.roles?.name === 'Falaq Admin'

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: content,
    editable: isEditor,
    editorProps: {
      attributes: {
        class: cn(
          'rounded-bl-md rounded-br-md border border-input p-4 prose dark:prose-invert max-w-full min-h-[150px] focus:outline-none',
          !isEditor && 'bg-muted'
        ),
      },
    },
    onUpdate: ({ editor }) => {
      setContent(editor.getJSON())
      setIsDirty(true)
    },
  })

  // When initialContent changes (e.g., viewing a different task), reset the editor state.
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.commands.setContent(initialContent, false) // `false` prevents firing the onUpdate
      setContent(initialContent)
      setIsDirty(false)
    }
  }, [initialContent, editor])

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.setEditable(isEditor)
    }
  }, [isEditor, editor])

  const handleSave = () => {
    startTransition(async () => {
      const { error } = await supabase
        .from('tasks')
        .update({ rich_description: content })
        .eq('id', taskId)

      if (error) {
        toast({
          title: 'Error saving description',
          description: error.message,
          variant: 'destructive',
        })
      } else {
        toast({ title: 'Description saved successfully!' })
        setIsDirty(false)
      }
    })
  }

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
          <div className="flex justify-between items-center border border-b-0 border-input rounded-tl-md rounded-tr-md p-2">
            <Toolbar editor={editor} />
            {isDirty && (
              <Button onClick={handleSave} size="sm" disabled={isPending}>
                <Save className="h-4 w-4 mr-2" />
                {isPending ? 'Saving...' : 'Save'}
              </Button>
            )}
          </div>

          <EditorContent editor={editor} />
        </>
      ) : (
        <div className="relative">
          <div className="prose dark:prose-invert max-w-full border border-input rounded-md p-4 min-h-[150px] bg-muted">
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

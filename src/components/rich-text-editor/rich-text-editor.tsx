'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Toolbar } from './toolbar'
import Underline from '@tiptap/extension-underline'
import { useDebounce } from 'use-debounce'
import { useEffect, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import type { Profile } from '@/lib/types'
import { Button } from '../ui/button'
import { Copy } from 'lucide-react'

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
  const [debouncedContent] = useDebounce(content, 500)
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
        class:
          'rounded-bl-md rounded-br-md border border-gray-300 p-4 prose dark:prose-invert max-w-full min-h-[150px] focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      setContent(editor.getJSON())
    },
  })

  useEffect(() => {
    if (debouncedContent) {
      startTransition(async () => {
        const { error } = await supabase
          .from('tasks')
          .update({ rich_description: debouncedContent })
          .eq('id', taskId)

        if (error) {
          toast({
            title: 'Error saving description',
            description: error.message,
            variant: 'destructive',
          })
        }
      })
    }
  }, [debouncedContent, taskId, supabase, toast])

  const handleCopy = () => {
    if (editor) {
      const text = editor.getText();
      navigator.clipboard.writeText(text).then(() => {
        toast({ title: 'Copied to clipboard!' });
      });
    }
  };


  return (
    <div className="flex flex-col justify-stretch">
      {isEditor ? (
        <>
          <Toolbar editor={editor} />
          <EditorContent editor={editor} />
        </>
      ) : (
        <div className="relative">
          <div className="prose dark:prose-invert max-w-full border border-gray-300 rounded-md p-4 min-h-[150px]">
            {editor && <EditorContent editor={editor} />}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2"
            onClick={handleCopy}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

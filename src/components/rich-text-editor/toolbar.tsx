'use client'

import type { Editor } from '@tiptap/react'
import {
  Bold,
  Strikethrough,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Underline,
  Quote,
  Undo,
  Redo,
  Code,
} from 'lucide-react'

type Props = {
  editor: Editor | null
}

export function Toolbar({ editor }: Props) {
  if (!editor) {
    return null
  }
  return (
    <div className="flex flex-wrap items-center gap-1">
        <button
          onClick={(e) => {
            e.preventDefault()
            editor.chain().focus().toggleBold().run()
          }}
          className={
            editor.isActive('bold')
              ? 'bg-primary text-primary-foreground p-2 rounded-lg'
              : 'p-2 rounded-lg hover:bg-accent'
          }
          type="button"
        >
          <Bold className="w-5 h-5" />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault()
            editor.chain().focus().toggleItalic().run()
          }}
          className={
            editor.isActive('italic')
              ? 'bg-primary text-primary-foreground p-2 rounded-lg'
              : 'p-2 rounded-lg hover:bg-accent'
          }
          type="button"
        >
          <Italic className="w-5 h-5" />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault()
            editor.chain().focus().toggleUnderline().run()
          }}
          className={
            editor.isActive('underline')
              ? 'bg-primary text-primary-foreground p-2 rounded-lg'
              : 'p-2 rounded-lg hover:bg-accent'
          }
          type="button"
        >
          <Underline className="w-5 h-5" />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault()
            editor.chain().focus().toggleStrike().run()
          }}
          className={
            editor.isActive('strike')
              ? 'bg-primary text-primary-foreground p-2 rounded-lg'
              : 'p-2 rounded-lg hover:bg-accent'
          }
          type="button"
        >
          <Strikethrough className="w-5 h-5" />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault()
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }}
          className={
            editor.isActive('heading', { level: 2 })
              ? 'bg-primary text-primary-foreground p-2 rounded-lg'
              : 'p-2 rounded-lg hover:bg-accent'
          }
          type="button"
        >
          <Heading2 className="w-5 h-5" />
        </button>

        <button
          onClick={(e) => {
            e.preventDefault()
            editor.chain().focus().toggleBulletList().run()
          }}
          className={
            editor.isActive('bulletList')
              ? 'bg-primary text-primary-foreground p-2 rounded-lg'
              : 'p-2 rounded-lg hover:bg-accent'
          }
          type="button"
        >
          <List className="w-5 h-5" />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault()
            editor.chain().focus().toggleOrderedList().run()
          }}
          className={
            editor.isActive('orderedList')
              ? 'bg-primary text-primary-foreground p-2 rounded-lg'
              : 'p-2 rounded-lg hover:bg-accent'
          }
          type="button"
        >
          <ListOrdered className="w-5 h-5" />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault()
            editor.chain().focus().toggleBlockquote().run()
          }}
          className={
            editor.isActive('blockquote')
              ? 'bg-primary text-primary-foreground p-2 rounded-lg'
              : 'p-2 rounded-lg hover:bg-accent'
          }
          type="button"
        >
          <Quote className="w-5 h-5" />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault()
            editor.chain().focus().setCode().run()
          }}
          className={
            editor.isActive('code')
              ? 'bg-primary text-primary-foreground p-2 rounded-lg'
              : 'p-2 rounded-lg hover:bg-accent'
          }
          type="button"
        >
          <Code className="w-5 h-5" />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault()
            editor.chain().focus().undo().run()
          }}
          className="p-2 rounded-lg hover:bg-accent"
          type="button"
        >
          <Undo className="w-5 h-5" />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault()
            editor.chain().focus().redo().run()
          }}
          className="p-2 rounded-lg hover:bg-accent"
          type="button"
        >
          <Redo className="w-5 h-5" />
        </button>
    </div>
  )
}

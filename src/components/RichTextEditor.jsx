import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'

/**
 * Editor de texto enriquecido chiquito, al estilo de KidsMin: negrita, cursiva,
 * listas y links nada más (sin pegar HTML libre, para mantener el riesgo bajo).
 * Guarda HTML en `value` — quien lo muestre debe sanitizarlo con <RichTextView>.
 */
export default function RichTextEditor({ value, onChange, placeholder = 'Escribe aquí…', compact = false }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer nofollow' } }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: `rich-content focus:outline-none ${compact ? 'min-h-[70px]' : 'min-h-[140px]'}`,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.isEmpty ? '' : editor.getHTML()
      onChange(html)
    },
  })

  if (!editor) return null

  function ponerLink() {
    const url = window.prompt('¿A qué link quieres apuntar?', editor.getAttributes('link').href || 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const botones = [
    { key: 'bold', label: 'B', title: 'Negrita', activo: editor.isActive('bold'), onClick: () => editor.chain().focus().toggleBold().run(), className: 'font-black' },
    { key: 'italic', label: 'I', title: 'Cursiva', activo: editor.isActive('italic'), onClick: () => editor.chain().focus().toggleItalic().run(), className: 'italic font-bold' },
    { key: 'bulletList', label: '•≡', title: 'Lista', activo: editor.isActive('bulletList'), onClick: () => editor.chain().focus().toggleBulletList().run(), className: 'font-bold' },
    { key: 'orderedList', label: '1≡', title: 'Lista numerada', activo: editor.isActive('orderedList'), onClick: () => editor.chain().focus().toggleOrderedList().run(), className: 'font-bold text-sm' },
    { key: 'link', label: '🔗', title: 'Link', activo: editor.isActive('link'), onClick: ponerLink, className: '' },
  ]

  return (
    <div className="overflow-hidden rounded-chunky border-2 border-ink/10 bg-white transition-colors duration-150 focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-100">
      <div className="flex flex-wrap items-center gap-1 border-b-2 border-ink/10 bg-sky-50/50 p-1.5">
        {botones.map((b) => (
          <button
            key={b.key}
            type="button"
            title={b.title}
            onClick={b.onClick}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors ${b.className} ${
              b.activo ? 'bg-sky-400 text-white shadow-soft' : 'text-ink/50 hover:bg-white hover:text-ink'
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>
      <EditorContent editor={editor} className={`px-3 py-2.5 sm:px-4 sm:py-3 ${compact ? 'text-base' : 'text-base sm:text-lg'}`} />
    </div>
  )
}

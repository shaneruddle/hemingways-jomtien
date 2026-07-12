import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { useEffect } from 'react';
import {
  Bold, Italic, Heading2, Heading3, List, ListOrdered,
  Link as LinkIcon, Quote, Undo2, Redo2, Strikethrough
} from 'lucide-react';

interface Props {
  value: string;
  onChange: (html: string) => void;
}

const btn = (active: boolean) =>
  'p-2 rounded hover:bg-gray-100 ' + (active ? 'bg-gray-200 text-gray-900' : 'text-gray-600');

export default function RichTextEditor({ value, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'prose-editor min-h-[320px] max-h-[600px] overflow-y-auto px-4 py-3 focus:outline-none text-gray-900',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Sync external value changes (e.g. switching which post is being edited)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) return null;

  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL (leave empty to remove)', previous || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="border border-gray-300 rounded-md bg-white overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
        <button type="button" title="Bold" className={btn(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={16} /></button>
        <button type="button" title="Italic" className={btn(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={16} /></button>
        <button type="button" title="Strikethrough" className={btn(editor.isActive('strike'))} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={16} /></button>
        <span className="w-px h-5 bg-gray-300 mx-1" />
        <button type="button" title="Heading" className={btn(editor.isActive('heading', { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={16} /></button>
        <button type="button" title="Subheading" className={btn(editor.isActive('heading', { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={16} /></button>
        <span className="w-px h-5 bg-gray-300 mx-1" />
        <button type="button" title="Bullet list" className={btn(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={16} /></button>
        <button type="button" title="Numbered list" className={btn(editor.isActive('orderedList'))} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={16} /></button>
        <button type="button" title="Quote" className={btn(editor.isActive('blockquote'))} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={16} /></button>
        <span className="w-px h-5 bg-gray-300 mx-1" />
        <button type="button" title="Link" className={btn(editor.isActive('link'))} onClick={setLink}><LinkIcon size={16} /></button>
        <span className="flex-1" />
        <button type="button" title="Undo" className={btn(false)} onClick={() => editor.chain().focus().undo().run()}><Undo2 size={16} /></button>
        <button type="button" title="Redo" className={btn(false)} onClick={() => editor.chain().focus().redo().run()}><Redo2 size={16} /></button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

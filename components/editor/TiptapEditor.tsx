'use client';

import { useEffect, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import YouTube from '@tiptap/extension-youtube';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered,
  Quote, Link2, Image as ImageIcon, Youtube, Undo2, Redo2, AlignLeft, AlignCenter,
  AlignRight, Minus, Maximize2, Heading2, Heading3, Heading4,
} from 'lucide-react';

export type EditorValue = { json: unknown; text: string; words: number };

const BTN = 'tiptap-btn';

export default function TiptapEditor({
  initialJson,
  onChange,
}: {
  initialJson?: unknown;
  onChange: (value: EditorValue) => void;
}) {
  const [fullscreen, setFullscreen] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: { openOnClick: false } }),
      Image.configure({ inline: false, allowBase64: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Commencez à rédiger votre article…' }),
      CharacterCount.configure({}),
      YouTube.configure({ controls: true, nocookie: true }),
    ],
    content: (initialJson as any) ?? { type: 'doc', content: [{ type: 'paragraph' }] },
    editorProps: {
      attributes: { class: 'tiptap-prose', spellcheck: 'true' },
    },
    onUpdate: ({ editor: instance }) => {
      const text = instance.getText();
      onChange({
        json: instance.getJSON(),
        text,
        words: text.trim() ? text.trim().split(/\s+/).length : 0,
      });
    },
  });

  useEffect(() => {
    if (!editor || !initialJson) return;
    editor.commands.setContent(initialJson as any);
  }, [editor, initialJson]);

  if (!editor) return <div className="tiptap-loading">Chargement de l’éditeur…</div>;

  function addLink() {
    const previous = editor!.getAttributes('link').href ?? '';
    const url = window.prompt('Adresse du lien', previous);
    if (url === null) return;
    if (!url) { editor!.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    editor!.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  function addImage() {
    const url = window.prompt('URL de l’image');
    if (url) editor!.chain().focus().setImage({ src: url, alt: '' }).run();
  }

  function addVideo() {
    const url = window.prompt('URL de la vidéo YouTube');
    if (url) editor!.chain().focus().setYoutubeVideo({ src: url, width: 640, height: 360 }).run();
  }

  const words = editor.storage.characterCount?.words?.() ?? 0;
  const minutes = Math.max(1, Math.round(words / 220));

  return (
    <div className={'tiptap-shell' + (fullscreen ? ' is-fullscreen' : '')}>
      <div className="tiptap-toolbar" role="toolbar" aria-label="Mise en forme">
        <div className="tiptap-toolbar-group">
          <button type="button" className={BTN + (editor.isActive('bold') ? ' is-active' : '')} onClick={() => editor.chain().focus().toggleBold().run()} aria-label="Gras"><Bold size={16} /></button>
          <button type="button" className={BTN + (editor.isActive('italic') ? ' is-active' : '')} onClick={() => editor.chain().focus().toggleItalic().run()} aria-label="Italique"><Italic size={16} /></button>
          <button type="button" className={BTN + (editor.isActive('underline') ? ' is-active' : '')} onClick={() => editor.chain().focus().toggleUnderline().run()} aria-label="Souligné"><UnderlineIcon size={16} /></button>
          <button type="button" className={BTN + (editor.isActive('strike') ? ' is-active' : '')} onClick={() => editor.chain().focus().toggleStrike().run()} aria-label="Barré"><Strikethrough size={16} /></button>
        </div>
        <div className="tiptap-toolbar-group">
          <button type="button" className={BTN + (editor.isActive('heading', { level: 2 }) ? ' is-active' : '')} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} aria-label="Titre 2"><Heading2 size={16} /></button>
          <button type="button" className={BTN + (editor.isActive('heading', { level: 3 }) ? ' is-active' : '')} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} aria-label="Titre 3"><Heading3 size={16} /></button>
          <button type="button" className={BTN + (editor.isActive('heading', { level: 4 }) ? ' is-active' : '')} onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} aria-label="Titre 4"><Heading4 size={16} /></button>
        </div>
        <div className="tiptap-toolbar-group">
          <button type="button" className={BTN + (editor.isActive('bulletList') ? ' is-active' : '')} onClick={() => editor.chain().focus().toggleBulletList().run()} aria-label="Liste à puces"><List size={16} /></button>
          <button type="button" className={BTN + (editor.isActive('orderedList') ? ' is-active' : '')} onClick={() => editor.chain().focus().toggleOrderedList().run()} aria-label="Liste numérotée"><ListOrdered size={16} /></button>
          <button type="button" className={BTN + (editor.isActive('blockquote') ? ' is-active' : '')} onClick={() => editor.chain().focus().toggleBlockquote().run()} aria-label="Citation"><Quote size={16} /></button>
          <button type="button" className={BTN} onClick={() => editor.chain().focus().setHorizontalRule().run()} aria-label="Séparateur"><Minus size={16} /></button>
        </div>
        <div className="tiptap-toolbar-group">
          <button type="button" className={BTN + (editor.isActive({ textAlign: 'left' }) ? ' is-active' : '')} onClick={() => editor.chain().focus().setTextAlign('left').run()} aria-label="Aligner à gauche"><AlignLeft size={16} /></button>
          <button type="button" className={BTN + (editor.isActive({ textAlign: 'center' }) ? ' is-active' : '')} onClick={() => editor.chain().focus().setTextAlign('center').run()} aria-label="Centrer"><AlignCenter size={16} /></button>
          <button type="button" className={BTN + (editor.isActive({ textAlign: 'right' }) ? ' is-active' : '')} onClick={() => editor.chain().focus().setTextAlign('right').run()} aria-label="Aligner à droite"><AlignRight size={16} /></button>
        </div>
        <div className="tiptap-toolbar-group">
          <button type="button" className={BTN + (editor.isActive('link') ? ' is-active' : '')} onClick={addLink} aria-label="Lien"><Link2 size={16} /></button>
          <button type="button" className={BTN} onClick={addImage} aria-label="Image"><ImageIcon size={16} /></button>
          <button type="button" className={BTN} onClick={addVideo} aria-label="Vidéo YouTube"><Youtube size={16} /></button>
        </div>
        <div className="tiptap-toolbar-group">
          <button type="button" className={BTN} onClick={() => editor.chain().focus().undo().run()} aria-label="Annuler"><Undo2 size={16} /></button>
          <button type="button" className={BTN} onClick={() => editor.chain().focus().redo().run()} aria-label="Rétablir"><Redo2 size={16} /></button>
          <button type="button" className={BTN} onClick={() => setFullscreen((v) => !v)} aria-label="Plein écran"><Maximize2 size={16} /></button>
        </div>
      </div>

      <EditorContent editor={editor} className="tiptap-content" />

      <div className="tiptap-footer">
        <span>{words} mots</span>
        <span>· ≈ {minutes} min de lecture</span>
        <span className="tiptap-save-hint">La sauvegarde est automatique</span>
      </div>
    </div>
  );
}

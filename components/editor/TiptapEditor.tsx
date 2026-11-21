'use client';

import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { Mark, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import YouTube from '@tiptap/extension-youtube';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered,
  Quote, Link2, Image as ImageIcon, Youtube, Undo2, Redo2, AlignLeft, AlignCenter,
  AlignRight, Minus, Maximize2, Minimize2, Palette, Eraser, ChevronDown,
} from 'lucide-react';

export type EditorValue = { json: unknown; text: string; words: number };


// Mark contrôlée : seules les polices et tailles de la liste éditoriale sont autorisées.
const FONT_FAMILIES = [
  { value: '', label: 'Police par défaut' },
  { value: 'Barlow', label: 'Barlow' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Verdana', label: 'Verdana' },
];
const FONT_SIZES = ['', '12', '14', '16', '18', '20', '24', '28', '32', '36'];
const COLOR_PRESETS = ['#102547', '#111827', '#c71f36', '#0b4792', '#08785b', '#7735a4'];
const fonts = new Set(FONT_FAMILIES.map(font => font.value));
const sizes = new Set(FONT_SIZES);
function validColor(value: unknown) {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value : null;
}

const EditorialTextStyle = Mark.create({
  name: 'editorialTextStyle',
  addAttributes() {
    return {
      color: { default: null, parseHTML: element => validColor((element as HTMLElement).style.color) },
      fontFamily: {
        default: null,
        parseHTML: element => {
          const value = (element as HTMLElement).style.fontFamily.replaceAll(/["']/g, '');
          return fonts.has(value) && value ? value : null;
        },
      },
      fontSize: {
        default: null,
        parseHTML: element => {
          const value = (element as HTMLElement).style.fontSize.replace(/px$/, '');
          return sizes.has(value) && value ? value : null;
        },
      },
    };
  },
  parseHTML() { return [{ tag: 'span[style]' }]; },
  renderHTML({ HTMLAttributes }) {
    const styles: string[] = [];
    if (validColor(HTMLAttributes.color)) styles.push(`color: ${HTMLAttributes.color}`);
    if (fonts.has(HTMLAttributes.fontFamily) && HTMLAttributes.fontFamily)
      styles.push(`font-family: '${HTMLAttributes.fontFamily}'`);
    if (sizes.has(HTMLAttributes.fontSize) && HTMLAttributes.fontSize)
      styles.push(`font-size: ${HTMLAttributes.fontSize}px`);
    return ['span', mergeAttributes({ style: styles.join('; ') }), 0];
  },
});

const BTN = 'tiptap-btn';

export default function TiptapEditor({
  initialJson,
  onChange,
  autosaveHint = 'La sauvegarde est automatique',
}: {
  initialJson?: unknown;
  onChange: (value: EditorValue) => void;
  autosaveHint?: string;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const [, refreshSelection] = useState(0);
  const colorMenuRef = useRef<HTMLDetailsElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: { openOnClick: false } }),
      EditorialTextStyle,
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
    onSelectionUpdate: () => refreshSelection(version => version + 1),
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

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (colorMenuRef.current && !colorMenuRef.current.contains(event.target as Node)) {
        colorMenuRef.current.open = false;
      }
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, []);

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
  const style = editor.getAttributes('editorialTextStyle');
  const selectedColor = validColor(style.color) ?? '#102547';
  const selectedBlock = editor.isActive('heading', { level: 2 }) ? 'h2'
    : editor.isActive('heading', { level: 3 }) ? 'h3'
    : editor.isActive('heading', { level: 4 }) ? 'h4'
    : 'paragraph';

  const selectBlock = (block: string) => {
    if (block === 'paragraph') editor.chain().focus().setParagraph().run();
    else editor.chain().focus().setHeading({ level: Number(block.slice(1)) as 2 | 3 | 4 }).run();
  };
  const applyColor = (color: string) => {
    editor.chain().focus().setMark('editorialTextStyle', { color }).run();
    if (colorMenuRef.current) colorMenuRef.current.open = false;
  };

  return (
    <div className={'tiptap-shell tiptap-refined' + (fullscreen ? ' is-fullscreen' : '')}>
      <div className="tiptap-toolbar" role="toolbar" aria-label="Outils de rédaction">

        {/* Première ligne : réglages de typographie. Les couleurs restent dans un menu discret. */}
        <div className="tiptap-toolbar-top">
          <div className="tiptap-toolbar-intro">
            <span className="tiptap-toolbar-kicker">TYPOGRAPHIE</span>
          </div>
          <div className="tiptap-toolbar-typography" role="group" aria-label="Police, taille et couleur">
            <label className="tiptap-dropdown tiptap-font-select">
              <span className="sr-only">Police du texte sélectionné</span>
              <select aria-label="Police" title="Choisir la police" value={style.fontFamily ?? ''}
                onChange={event => {
                  editor.chain().focus().setMark('editorialTextStyle', { fontFamily: event.target.value || null }).run();
                }}>
                {FONT_FAMILIES.map(font => <option key={font.value} value={font.value}>{font.label}</option>)}
              </select>
            </label>
            <label className="tiptap-dropdown tiptap-size-select">
              <span className="sr-only">Taille du texte sélectionné</span>
              <select aria-label="Taille de la police" title="Taille du texte" value={style.fontSize ?? ''}
                onChange={event =>
                  editor.chain().focus().setMark('editorialTextStyle', { fontSize: event.target.value || null }).run()}>
                <option value="">Taille</option>
                {FONT_SIZES.filter(Boolean).map(size => <option key={size} value={size}>{size} px</option>)}
              </select>
            </label>
            <details className="tiptap-color-menu" ref={colorMenuRef}
              onKeyDown={event => { if (event.key === 'Escape') colorMenuRef.current!.open = false; }}>
              <summary className="tiptap-color-trigger" aria-label="Couleur de la police">
                <Palette size={16} aria-hidden="true" />
                <span>Couleur</span>
                <span className="tiptap-color-preview" style={{ backgroundColor: selectedColor }} aria-hidden="true" />
                <ChevronDown size={13} aria-hidden="true" />
              </summary>
              <div className="tiptap-color-panel">
                <p className="tiptap-color-panel-title">Couleur du texte</p>
                <div className="tiptap-color-swatches" role="group" aria-label="Couleurs prédéfinies">
                  {COLOR_PRESETS.map(color => (
                    <button key={color} type="button" className="tiptap-color-swatch"
                      style={{ backgroundColor: color }} title={'Appliquer ' + color}
                      aria-label={'Appliquer la couleur ' + color}
                      aria-pressed={selectedColor.toLowerCase() === color.toLowerCase()}
                      onClick={() => applyColor(color)} />
                  ))}
                </div>
                <label className="tiptap-custom-color">
                  <span>Couleur personnalisée</span>
                  <input type="color" aria-label="Choisir une couleur personnalisée" value={selectedColor}
                    onChange={event => applyColor(event.target.value)} />
                </label>
              </div>
            </details>
            <button type="button" className="tiptap-reset-button"
              title="Effacer la mise en forme de la sélection"
              onClick={() => editor.chain().focus().unsetMark('editorialTextStyle').run()}>
              <Eraser size={15} aria-hidden="true" />
              <span>Effacer le style</span>
            </button>
          </div>
          <span className="tiptap-toolbar-help">Sélectionnez du texte pour le personnaliser</span>
        </div>

        {/* Deuxième ligne : toutes les commandes de rédaction, sans retour à la ligne aléatoire. */}
        <div className="tiptap-toolbar-main" role="group" aria-label="Mise en forme et insertion">
          <div className="tiptap-toolbar-group tiptap-block-select" role="group" aria-label="Style de paragraphe">
            <label>
              <span className="sr-only">Style de paragraphe</span>
              <select value={selectedBlock} aria-label="Style de paragraphe"
                onChange={event => selectBlock(event.target.value)}>
                <option value="paragraph">Paragraphe</option>
                <option value="h2">Titre 2</option>
                <option value="h3">Titre 3</option>
                <option value="h4">Titre 4</option>
              </select>
            </label>
          </div>
          <div className="tiptap-toolbar-group" role="group" aria-label="Styles du texte">
            <button type="button" className={BTN + (editor.isActive('bold') ? ' is-active' : '')}
              onClick={() => editor.chain().focus().toggleBold().run()} aria-label="Gras" title="Gras (Ctrl+B)"
              aria-pressed={editor.isActive('bold')}><Bold size={17} /></button>
            <button type="button" className={BTN + (editor.isActive('italic') ? ' is-active' : '')}
              onClick={() => editor.chain().focus().toggleItalic().run()} aria-label="Italique" title="Italique (Ctrl+I)"
              aria-pressed={editor.isActive('italic')}><Italic size={17} /></button>
            <button type="button" className={BTN + (editor.isActive('underline') ? ' is-active' : '')}
              onClick={() => editor.chain().focus().toggleUnderline().run()} aria-label="Souligné" title="Souligné (Ctrl+U)"
              aria-pressed={editor.isActive('underline')}><UnderlineIcon size={17} /></button>
            <button type="button" className={BTN + (editor.isActive('strike') ? ' is-active' : '')}
              onClick={() => editor.chain().focus().toggleStrike().run()} aria-label="Barré" title="Barré"
              aria-pressed={editor.isActive('strike')}><Strikethrough size={17} /></button>
          </div>
          <div className="tiptap-toolbar-group" role="group" aria-label="Listes et citations">
            <button type="button" className={BTN + (editor.isActive('bulletList') ? ' is-active' : '')}
              onClick={() => editor.chain().focus().toggleBulletList().run()} aria-label="Liste à puces" title="Liste à puces"
              aria-pressed={editor.isActive('bulletList')}><List size={17} /></button>
            <button type="button" className={BTN + (editor.isActive('orderedList') ? ' is-active' : '')}
              onClick={() => editor.chain().focus().toggleOrderedList().run()} aria-label="Liste numérotée" title="Liste numérotée"
              aria-pressed={editor.isActive('orderedList')}><ListOrdered size={17} /></button>
            <button type="button" className={BTN + (editor.isActive('blockquote') ? ' is-active' : '')}
              onClick={() => editor.chain().focus().toggleBlockquote().run()} aria-label="Citation" title="Citation"
              aria-pressed={editor.isActive('blockquote')}><Quote size={17} /></button>
            <button type="button" className={BTN}
              onClick={() => editor.chain().focus().setHorizontalRule().run()} aria-label="Séparateur" title="Séparateur"
              ><Minus size={17} /></button>
          </div>
          <div className="tiptap-toolbar-group" role="group" aria-label="Alignement">
            <button type="button" className={BTN + (editor.isActive({ textAlign: 'left' }) ? ' is-active' : '')}
              onClick={() => editor.chain().focus().setTextAlign('left').run()} aria-label="Aligner à gauche" title="Aligner à gauche"
              aria-pressed={editor.isActive({ textAlign: 'left' })}><AlignLeft size={17} /></button>
            <button type="button" className={BTN + (editor.isActive({ textAlign: 'center' }) ? ' is-active' : '')}
              onClick={() => editor.chain().focus().setTextAlign('center').run()} aria-label="Centrer" title="Centrer"
              aria-pressed={editor.isActive({ textAlign: 'center' })}><AlignCenter size={17} /></button>
            <button type="button" className={BTN + (editor.isActive({ textAlign: 'right' }) ? ' is-active' : '')}
              onClick={() => editor.chain().focus().setTextAlign('right').run()} aria-label="Aligner à droite" title="Aligner à droite"
              aria-pressed={editor.isActive({ textAlign: 'right' })}><AlignRight size={17} /></button>
          </div>
          <div className="tiptap-toolbar-group" role="group" aria-label="Insérer un élément">
            <button type="button" className={BTN + (editor.isActive('link') ? ' is-active' : '')}
              onClick={addLink} aria-label="Ajouter un lien" title="Insérer un lien"
              aria-pressed={editor.isActive('link')}><Link2 size={17} /></button>
            <button type="button" className={BTN} onClick={addImage} aria-label="Insérer une image" title="Insérer une image">
              <ImageIcon size={17} /></button>
            <button type="button" className={BTN} onClick={addVideo} aria-label="Insérer une vidéo YouTube" title="Vidéo YouTube">
              <Youtube size={17} /></button>
          </div>
          <div className="tiptap-toolbar-group tiptap-toolbar-history" role="group" aria-label="Historique et affichage">
            <button type="button" className={BTN} onClick={() => editor.chain().focus().undo().run()}
              aria-label="Annuler la dernière action" title="Annuler (Ctrl+Z)"><Undo2 size={17} /></button>
            <button type="button" className={BTN} onClick={() => editor.chain().focus().redo().run()}
              aria-label="Rétablir la dernière action" title="Rétablir (Ctrl+Maj+Z)"><Redo2 size={17} /></button>
            <button type="button" className={BTN} onClick={() => setFullscreen(value => !value)}
              aria-label={fullscreen ? 'Quitter le plein écran' : 'Passer en plein écran'}
              title={fullscreen ? 'Quitter le plein écran' : 'Mode plein écran'}>
              {fullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
            </button>
          </div>
        </div>
      </div>

      <EditorContent editor={editor} className="tiptap-content" />

      <div className="tiptap-footer">
        <span><strong>{words}</strong> mots</span>
        <span className="tiptap-footer-divider" aria-hidden="true" />
        <span>≈ {minutes} min de lecture</span>
        <span className="tiptap-save-hint">{autosaveHint}</span>
      </div>
    </div>
  );
}

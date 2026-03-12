import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import Mention from '@tiptap/extension-mention';
import { HexColorPicker } from 'react-colorful';
import { createSuggestion } from './suggestion';
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
  Code, List, ListOrdered, CheckSquare, Undo, Redo, 
  Heading1, Heading2, Heading3, Link as LinkIcon, 
  Type, ChevronDown, MoreHorizontal,
  Subscript as SubscriptIcon, Superscript as SuperscriptIcon,
  Highlighter, Eraser, FlaskConical, Clock, Binary
} from 'lucide-react';
import type { Structure } from '../../lib/structuresService';

interface RichTextEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  allStructures?: Structure[];
}

const ToolbarButton: React.FC<{
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}> = ({ onClick, isActive, disabled, children, title }) => (
  <button
    type="button"
    onClick={(e) => {
      e.preventDefault();
      onClick();
    }}
    disabled={disabled}
    title={title}
    className={`p-1.5 rounded transition-colors flex items-center justify-center cursor-pointer ${
      isActive 
        ? 'bg-blue-500/20 text-blue-400' 
        : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    {children}
  </button>
);

const ToolbarDivider = () => <div className="w-px h-6 bg-neutral-800 mx-1 self-center" />;

const Dropdown: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
}> = ({ isOpen, onClose, trigger, children, align = 'left' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <div className="relative" ref={containerRef}>
      <div onClick={(e) => {
        if (!isOpen) { e.stopPropagation(); }
      }}>{trigger}</div>
      {isOpen && (
        <div className={`absolute top-full mt-1 z-50 min-w-[200px] bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl p-1 animate-in fade-in zoom-in duration-200 ${align === 'right' ? 'right-0' : 'left-0'}`}>
          {children}
        </div>
      )}
    </div>
  );
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  content, 
  onChange, 
  onBlur,
  placeholder = 'Start writing...',
  allStructures = []
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      TextStyle,
      Color,
      Subscript,
      Superscript,
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder,
      }),
      Markdown.configure({
        html: false,
        tightLists: true,
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention',
        },
        suggestion: createSuggestion(allStructures),
        renderText({ node }) {
          return `[[structure:${node.attrs.id}]]`;
        },
        renderHTML({ node }) {
          return [
            'span',
            { 'data-type': 'mention', 'data-id': node.attrs.id, class: 'mention' },
            `@${node.attrs.label}`,
          ];
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange((editor.storage as any).markdown.getMarkdown());
    },
    onBlur: () => {
      onBlur?.();
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm sm:prose-base focus:outline-none max-w-none min-h-[500px] px-8 py-6',
      },
    },
  });

  if (!editor) {
    return null;
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const toggleMenu = (menuId: string) => {
    setActiveMenu(activeMenu === menuId ? null : menuId);
  };

  const insertSymbol = (symbol: string) => {
    editor.chain().focus().insertContent(symbol).run();
    setActiveMenu(null);
  };

  const insertTimestamp = () => {
    const now = new Date();
    const timestamp = now.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
    editor.chain().focus().insertContent(`[${timestamp}] `).run();
    setActiveMenu(null);
  };

  const formatChemicalFormula = () => {
    const input = window.prompt('Enter chemical formula (e.g., H2O, CO2, C6H12O6):');
    if (!input) return;

    // Basic logic to wrap numbers in subscript
    // This is a simple implementation: digits after letters become subscripts
    const formatted = input.replace(/([A-Z][a-z]?|[\)])(\d+)/g, '$1<sub>$2</sub>');
    
    // We need to insert this as HTML since Tiptap doesn't have a direct "chemical" node, 
    // but the starter kit usually handles basic HTML tags or we can use marks.
    // Tiptap's Subscript extension handles <sub> tags.
    editor.chain().focus().insertContent(formatted).run();
    setActiveMenu(null);
  };

  return (
    <div className="flex flex-col w-full h-full bg-neutral-950 border border-neutral-800 rounded-xl focus-within:border-neutral-700 transition-colors">
      {/* TOOLBAR */}
      <div className="flex items-center flex-wrap gap-0.5 p-1 bg-neutral-900 border-b border-neutral-800 sticky top-0 z-20 rounded-t-xl">
        {/* History */}
        <div className="flex items-center">
          <ToolbarButton 
            onClick={() => editor.chain().focus().undo().run()} 
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().redo().run()} 
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </ToolbarButton>
        </div>

        <ToolbarDivider />

        {/* Headings */}
        <div className="flex items-center">
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} 
            isActive={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
            isActive={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} 
            isActive={editor.isActive('heading', { level: 3 })}
            title="Heading 3"
          >
            <Heading3 className="w-4 h-4" />
          </ToolbarButton>
        </div>

        <ToolbarDivider />

        {/* Basic Formatting */}
        <div className="flex items-center">
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleBold().run()} 
            isActive={editor.isActive('bold')}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleItalic().run()} 
            isActive={editor.isActive('italic')}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleUnderline().run()} 
            isActive={editor.isActive('underline')}
            title="Underline"
          >
            <UnderlineIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleStrike().run()} 
            isActive={editor.isActive('strike')}
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleCode().run()} 
            isActive={editor.isActive('code')}
            title="Code"
          >
            <Code className="w-4 h-4" />
          </ToolbarButton>
        </div>

        <ToolbarDivider />

        {/* Links & Colors */}
        <div className="flex items-center">
          <ToolbarButton 
            onClick={setLink} 
            isActive={editor.isActive('link')}
            title="Link"
          >
            <LinkIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleHighlight().run()} 
            isActive={editor.isActive('highlight')}
            title="Highlight"
          >
            <Highlighter className="w-4 h-4" />
          </ToolbarButton>
          
          <Dropdown
            isOpen={activeMenu === 'color'}
            onClose={() => setActiveMenu(null)}
            trigger={
              <button 
                onClick={() => toggleMenu('color')}
                className={`px-1.5 py-1 flex items-center rounded transition-colors ${activeMenu === 'color' ? 'bg-neutral-800 text-blue-400' : 'text-neutral-500 hover:text-neutral-300'}`}
              >
                <Type className="w-4 h-4" />
                <ChevronDown className="w-3 h-3 ml-0.5" />
              </button>
            }
          >
            <div className="p-3">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Text Color</p>
              <HexColorPicker 
                color={editor.getAttributes('textStyle').color || '#ffffff'} 
                onChange={(color) => editor.chain().focus().setColor(color).run()}
              />
              <button 
                onClick={() => editor.chain().focus().unsetColor().run()}
                className="w-full mt-3 flex items-center justify-center gap-2 px-2 py-1.5 text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded transition-colors"
              >
                <Eraser className="w-3 h-3" />
                <span>Reset to default</span>
              </button>
            </div>
          </Dropdown>
        </div>

        <ToolbarDivider />

        {/* Scripts */}
        <div className="flex items-center">
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleSubscript().run()} 
            isActive={editor.isActive('subscript')}
            title="Subscript"
          >
            <SubscriptIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleSuperscript().run()} 
            isActive={editor.isActive('superscript')}
            title="Superscript"
          >
            <SuperscriptIcon className="w-4 h-4" />
          </ToolbarButton>
        </div>

        <ToolbarDivider />

        {/* Lists */}
        <div className="flex items-center">
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleBulletList().run()} 
            isActive={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleOrderedList().run()} 
            isActive={editor.isActive('orderedList')}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleTaskList().run()} 
            isActive={editor.isActive('taskList')}
            title="Task List"
          >
            <CheckSquare className="w-4 h-4" />
          </ToolbarButton>
        </div>

        <div className="flex-1" />

        {/* AI & More */}
        <div className="flex items-center pr-2 gap-1">
          <Dropdown
            isOpen={activeMenu === 'scientific'}
            onClose={() => setActiveMenu(null)}
            align="right"
            trigger={
              <div 
                onClick={() => toggleMenu('scientific')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors cursor-pointer text-xs font-semibold ${activeMenu === 'scientific' ? 'bg-blue-500/30 text-blue-200' : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400'}`}
              >
                <FlaskConical className="w-3.5 h-3.5" />
                <span>Scientific</span>
                <ChevronDown className="w-2.5 h-2.5 opacity-50" />
              </div>
            }
          >
            <div className="w-56 p-2 space-y-3">
              <div>
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2 px-1">Common Symbols</p>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { s: 'α', t: 'Alpha' }, { s: 'β', t: 'Beta' }, { s: 'Δ', t: 'Delta' }, { s: 'λ', t: 'Lambda' },
                    { s: 'μ', t: 'Mu' }, { s: 'π', t: 'Pi' }, { s: 'σ', t: 'Sigma' }, { s: 'ω', t: 'Omega' },
                    { s: '×', t: 'Multiply' }, { s: '±', t: 'Plus-Minus' }, { s: 'Å', t: 'Angstrom' }, { s: '∞', t: 'Infinity' }
                  ].map(({ s, t }) => (
                    <button
                      key={s}
                      onClick={() => insertSymbol(s)}
                      title={t}
                      className="p-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white rounded transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-800">
                <button 
                  onClick={insertTimestamp}
                  className="w-full flex items-center gap-2.5 px-2 py-2 text-xs text-neutral-300 hover:bg-neutral-800 rounded-md transition-colors"
                >
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>Insert Timestamp</span>
                </button>
                <button 
                  onClick={formatChemicalFormula}
                  className="w-full flex items-center gap-2.5 px-2 py-2 text-xs text-neutral-300 hover:bg-neutral-800 rounded-md transition-colors"
                >
                  <Binary className="w-3.5 h-3.5 text-blue-400" />
                  <span>Chemical Formula</span>
                </button>
              </div>
            </div>
          </Dropdown>

          <Dropdown
            isOpen={activeMenu === 'more'}
            onClose={() => setActiveMenu(null)}
            align="right"
            trigger={
              <button 
                onClick={() => toggleMenu('more')}
                className={`p-1.5 rounded transition-colors flex items-center justify-center cursor-pointer ${activeMenu === 'more' ? 'bg-neutral-800 text-neutral-200' : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'}`}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            }
          >
            <div className="w-44 p-1">
              <button 
                onClick={() => editor.chain().focus().unsetAllMarks().run()}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800 rounded-md transition-colors"
              >
                <Eraser className="w-3.5 h-3.5 opacity-50" />
                <span>Clear formatting</span>
              </button>
              <button 
                onClick={() => editor.chain().focus().clearContent().run()}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400/70 hover:bg-red-500/10 hover:text-red-400 rounded-md transition-colors"
              >
                <Eraser className="w-3.5 h-3.5 opacity-50" />
                <span>Clear all content</span>
              </button>
            </div>
          </Dropdown>
        </div>
      </div>

      {/* EDITOR CONTENT */}
      <div className="flex-1 overflow-y-auto bg-neutral-950 rounded-b-xl">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

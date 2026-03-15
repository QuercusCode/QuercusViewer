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
import TextAlign from '@tiptap/extension-text-align';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { Markdown } from 'tiptap-markdown';
import Mention from '@tiptap/extension-mention';
import { HexColorPicker } from 'react-colorful';
import { SpreadsheetTable } from './SpreadsheetTable';
import { InlineChart } from './InlineChart';
import { ChemicalSketcher } from './ChemicalSketcher';
import { LabCalculator } from './LabCalculator';
import { CodeCell } from './CodeCell';
import { createSuggestion } from './suggestion';
import { CollaborationCursor } from './CollaborationCursor';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { useTheme } from '../../lib/ThemeContext';
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
  Code, List, ListOrdered, CheckSquare, Undo, Redo, 
  Heading1, Heading2, Heading3, Link as LinkIcon, 
  Type, ChevronDown, MoreHorizontal,
  Subscript as SubscriptIcon, Superscript as SuperscriptIcon,
  Highlighter, Eraser, FlaskConical, Clock, FileText,
  Table as TableIcon, Activity, Beaker, Calculator
} from 'lucide-react';
import type { Structure } from '../../lib/structuresService';

interface RichTextEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  allStructures?: Structure[];
  noteId?: string;
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
        : 'text-[var(--text-muted)] hover:bg-[var(--input-bg)] hover:text-[var(--text-primary)]'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    {children}
  </button>
);

const ToolbarDivider: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`w-px h-6 bg-[var(--border-main)] mx-1 self-center ${className}`} />
);

const Dropdown: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}> = ({ isOpen, onClose, trigger, children, align = 'left', className = '' }) => {
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
        <div className={`absolute top-full mt-1 z-50 min-w-[200px] bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-lg shadow-xl p-1 animate-in fade-in zoom-in duration-200 ${align === 'right' ? 'right-0' : 'left-0'} ${className}`}>
          {children}
        </div>
      )}
    </div>
  );
};

const TableGridPicker: React.FC<{
  onSelect: (rows: number, cols: number) => void;
}> = ({ onSelect }) => {
  const [hovered, setHovered] = useState({ r: 0, c: 0 });
  const max = 8;

  return (
    <div className="p-6 bg-[var(--bg-sidebar)] rounded-[24px] shadow-[0_30px_90px_rgba(0,0,0,0.7)] border border-[var(--border-main)] select-none min-w-[280px]">
      <div className="flex flex-col gap-1 mb-6 px-1">
        <span className="text-[10px] uppercase tracking-[0.3em] font-black text-neutral-500">Insert Table</span>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-mono font-black text-white leading-none">
            {hovered.r > 0 ? hovered.r : '0'}
          </span>
          <span className="text-xl font-mono font-bold text-neutral-600">×</span>
          <span className="text-3xl font-mono font-black text-blue-500 leading-none">
            {hovered.c > 0 ? hovered.c : '0'}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-8 gap-1.5 p-2 bg-[var(--bg-main)] rounded-xl border border-[var(--border-main)]/50">
        {Array.from({ length: max * max }).map((_, i) => {
          const r = Math.floor(i / max) + 1;
          const c = (i % max) + 1;
          const isActive = r <= hovered.r && c <= hovered.c;
          return (
            <div
              key={i}
              onMouseEnter={() => setHovered({ r, c })}
              onClick={() => onSelect(r, c)}
              className={`w-5 h-5 aspect-square rounded-[3px] border transition-all duration-100 cursor-pointer ${
                isActive 
                  ? 'bg-blue-500 border-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.5)] z-10 scale-105' 
                  : 'bg-[var(--input-bg)]/50 hover:bg-[var(--input-bg)]/80 border-[var(--border-main)]/50 hover:border-neutral-500'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  content, 
  onChange, 
  onBlur,
  placeholder = 'Start writing...',
  allStructures = [],
  noteId
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const { theme } = useTheme();
  const { user } = useAuth();

  const userColor = React.useMemo(() => {
    const colors = ['#f43f5e', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];
    const index = Math.abs((user?.id || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colors.length;
    return colors[index];
  }, [user]);

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
      TextAlign.configure({
        types: ['heading', 'paragraph', 'tableCell'],
      }),
      SpreadsheetTable.configure({
        resizable: true,
      }),
      CollaborationCursor,
      InlineChart,
      ChemicalSketcher,
      LabCalculator,
      CodeCell,
      TableRow,
      TableHeader,
      TableCell,
      Markdown.configure({
        html: false,
        tightLists: true,
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention',
        },
        suggestion: createSuggestion(allStructures),
        renderText({ node }: { node: any }) {
          return `[[structure:${node.attrs.id}]]`;
        },
        renderHTML({ node }: { node: any }) {
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
    onSelectionUpdate: ({ editor }) => {
      if (!noteId || !user) return;
      const pos = editor.state.selection.from;
      const channel = supabase.channel(`note:${noteId}`);
      channel.track({
        user_id: user.id,
        user_name: user.email?.split('@')[0] || 'Unknown',
        color: userColor,
        pos,
      });
    },
    onBlur: () => {
      onBlur?.();
    },
    editorProps: {
      attributes: {
        class: `prose ${theme !== 'light' ? 'prose-invert' : ''} prose-sm sm:prose-base focus:outline-none max-w-none min-h-[500px] px-4 sm:px-10 py-6 text-[var(--text-primary)]`,
      },
    },
  });

  useEffect(() => {
    if (!editor || !noteId || !user) return;

    const channel = supabase.channel(`note:${noteId}`);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const cursors: any[] = [];
        
        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.user_id !== user.id) {
              cursors.push({
                userId: p.user_id,
                userName: p.user_name,
                color: p.color,
                pos: p.pos,
              });
            }
          });
        });

        editor.commands.setCollaborationCursors(cursors);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            user_name: user.email?.split('@')[0] || 'Anon',
            color: userColor,
            pos: editor.state.selection.from,
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [editor, noteId, user, userColor]);

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

  const insertTemplate = (template: string) => {
    switch (template) {
      case 'table3x3':
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        break;
      case 'table4x4':
        editor.chain().focus().insertTable({ rows: 4, cols: 4, withHeaderRow: true }).run();
        break;
      case 'customTable':
        const rowsStr = window.prompt('Enter number of rows:', '3');
        const colsStr = window.prompt('Enter number of columns:', '3');
        const rows = parseInt(rowsStr || '3', 10);
        const cols = parseInt(colsStr || '3', 10);
        if (!isNaN(rows) && !isNaN(cols)) {
          editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
        }
        break;
      case 'well96':
        editor.chain().focus().insertTable({ rows: 9, cols: 13, withHeaderRow: true }).run();
        break;
      case 'well384':
        editor.chain().focus().insertTable({ rows: 17, cols: 25, withHeaderRow: true }).run();
        break;
      case 'molecule':
        editor.chain().focus().insertContent({ type: 'chemicalSketcher' }).run();
        break;
      case 'calculator':
        editor.chain().focus().insertContent({ type: 'labCalculator' }).run();
        break;
      case 'codeCell':
        editor.chain().focus().insertContent({ type: 'codeCell' }).run();
        break;
      case 'protocol':
        editor.chain().focus().insertContent('**Protocol:**\n\n- ').run();
        break;
      case 'observation':
        editor.chain().focus().insertContent('**Observation:**\n\n').run();
        break;
      case 'result':
        editor.chain().focus().insertContent('**Result:**\n\n').run();
        break;
      case 'setup':
        editor.chain().focus().insertContent('**Experiment Setup:**\n\nSample ID: \nBuffer: \nTemperature: \n\n').run();
        break;
      case 'safety':
        editor.chain().focus().insertContent('**Safety Checklist:**\n\n- [ ] PPE (Gloves, Goggles, Lab Coat)\n- [ ] Fume Hood Operational\n- [ ] Waste Disposal Plan\n- [ ] Emergency Equipment Clear\n\n').run();
        break;
      case 'startup':
        editor.chain().focus().insertContent('**Equipment Startup:**\n\n- [ ] Power On\n- [ ] Calibration Check\n- [ ] Reagent Levels Verified\n- [ ] Software Connection established\n\n').run();
        break;
      default:
        editor.chain().focus().insertContent(`**${template}:**\n\n`).run();
    }
    setActiveMenu(null);
  };

  return (
    <div className="flex flex-col w-full h-full bg-[var(--bg-main)] rounded-xl focus-within:border-neutral-700 transition-colors overflow-hidden">
      {/* TOOLBAR */}
      <div className="flex items-center flex-wrap gap-0.5 p-1 bg-[var(--bg-header)] border-b border-[var(--border-main)] sticky top-0 z-20 rounded-t-xl">
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
          <Dropdown
            isOpen={activeMenu === 'highlight'}
            onClose={() => setActiveMenu(null)}
            trigger={
              <button 
                onClick={() => toggleMenu('highlight')}
                className={`p-1.5 rounded transition-colors flex items-center justify-center cursor-pointer ${activeMenu === 'highlight' || editor.isActive('highlight') ? 'bg-blue-500/20 text-blue-400' : 'text-[var(--text-muted)] hover:bg-[var(--input-bg)] hover:text-[var(--text-primary)]'}`}
              >
                <Highlighter className="w-4 h-4" />
              </button>
            }
          >
            <div className="p-3 w-48">
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Highlight Color</p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { color: '#fef08a', name: 'Yellow' },
                  { color: '#bbf7d0', name: 'Green' },
                  { color: '#bfdbfe', name: 'Blue' },
                  { color: '#fbcfe8', name: 'Pink' },
                  { color: '#ffedd5', name: 'Orange' },
                  { color: '#e9d5ff', name: 'Purple' },
                ].map((c) => (
                  <button
                    key={c.color}
                    onClick={() => {
                      editor.chain().focus().setHighlight({ color: c.color }).run();
                      setActiveMenu(null);
                    }}
                    className="w-full h-8 rounded-md border border-white/10 hover:scale-110 transition-transform shadow-sm"
                    style={{ backgroundColor: c.color }}
                    title={c.name}
                  />
                ))}
              </div>
              <button 
                onClick={() => {
                  editor.chain().focus().unsetHighlight().run();
                  setActiveMenu(null);
                }}
                className="w-full flex items-center justify-center gap-2 px-2 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--input-bg)] rounded transition-colors"
              >
                <Eraser className="w-3 h-3" />
                <span>Clear highlight</span>
              </button>
            </div>
          </Dropdown>
          <Dropdown
            isOpen={activeMenu === 'color'}
            onClose={() => setActiveMenu(null)}
            trigger={
              <button 
                onClick={() => toggleMenu('color')}
                className={`px-1.5 py-1 flex items-center rounded transition-colors ${activeMenu === 'color' || editor.isActive('textStyle') ? 'bg-blue-500/20 text-blue-400' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
              >
                <Type className="w-4 h-4" />
                <ChevronDown className="w-3 h-3 ml-0.5" />
              </button>
            }
          >
            <div className="p-3">
              <HexColorPicker 
                color={editor.getAttributes('textStyle').color || (theme === 'light' ? '#000000' : '#ffffff')} 
                onChange={(color) => editor.chain().focus().setColor(color).run()}
              />
              <button 
                onClick={() => editor.chain().focus().unsetColor().run()}
                className="w-full mt-3 flex items-center justify-center gap-2 px-2 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--input-bg)] rounded transition-colors"
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

        {/* Scientific Tools */}
        <div className="flex items-center pr-2 gap-1">
          <Dropdown
            isOpen={activeMenu === 'scientific'}
            onClose={() => setActiveMenu(null)}
            align="right"
            className="w-64"
            trigger={
              <div 
                onClick={() => toggleMenu('scientific')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors cursor-pointer text-xs font-semibold ${activeMenu === 'scientific' ? 'bg-blue-500/30 text-blue-200' : 'bg-[var(--input-bg)] hover:bg-[var(--input-bg)]/80 text-[var(--text-secondary)]'}`}
              >
                <FlaskConical className="w-3.5 h-3.5" />
                <span>Insert</span>
                <ChevronDown className="w-2.5 h-2.5 opacity-50" />
              </div>
            }
          >
            <div className="p-2 space-y-1.5 min-w-[220px]">
              {/* Table Submenu */}
              <div className="relative group/sub">
                <button className="w-full flex items-center justify-between px-4 py-4 text-sm text-[var(--text-secondary)] hover:bg-[var(--input-bg)] rounded-xl transition-all group/btn">
                  <div className="flex items-center gap-4">
                    <TableIcon className="w-5 h-5 text-blue-400" />
                    <span className="font-semibold">Table</span>
                  </div>
                  <ChevronDown className="w-4 h-4 -rotate-90 opacity-30 group-hover/btn:opacity-100 transition-all" />
                </button>
                {/* Interaction Bridge: Precise overlap to eliminate gaps while maintaining stability */}
                <div className="absolute right-full top-[-10px] bottom-[-10px] pr-2 -mr-2 hidden group-hover/sub:block z-50">
                  <div className="h-full flex items-start pt-[10px]">
                    <TableGridPicker onSelect={(r, c) => {
                      editor.chain().focus().insertTable({ rows: r, cols: c, withHeaderRow: true }).run();
                      setActiveMenu(null);
                    }} />
                  </div>
                </div>
              </div>

              {/* Well Plate Submenu */}
              <div className="relative group/sub">
                <button className="w-full flex items-center justify-between px-4 py-4 text-sm text-[var(--text-secondary)] hover:bg-[var(--input-bg)] rounded-xl transition-all group/btn">
                  <div className="flex items-center gap-4">
                    <Activity className="w-5 h-5 text-emerald-400" />
                    <span className="font-semibold">Well plate</span>
                  </div>
                  <ChevronDown className="w-4 h-4 -rotate-90 opacity-30 group-hover/btn:opacity-100 transition-all" />
                </button>
                <div className="absolute right-full top-[-10px] bottom-[-10px] pr-2 -mr-2 hidden group-hover/sub:block z-50 min-w-[200px]">
                  <div className="h-full flex items-start pt-[10px]">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-[20px] shadow-[0_30px_90px_rgba(0,0,0,0.7)] p-2 space-y-1">
                      <button 
                        onClick={() => insertTemplate('well96')}
                        className="w-full text-left px-4 py-3 text-sm text-[var(--text-secondary)] hover:bg-[var(--input-bg)] rounded-xl transition-colors"
                      >
                        96-well (8x12)
                      </button>
                      <button
                        onClick={() => insertTemplate('well384')}
                        className="w-full text-left px-4 py-3 text-sm text-[var(--text-secondary)] hover:bg-[var(--input-bg)] rounded-xl transition-colors"
                      >
                        384-well (16x24)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => insertTemplate('molecule')}
                className="w-full flex items-center gap-4 px-4 py-4 text-sm text-[var(--text-secondary)] hover:bg-[var(--input-bg)] rounded-xl transition-all text-left"
              >
                <Beaker className="w-5 h-5 text-indigo-400" />
                <span className="font-semibold">Molecular Structure</span>
              </button>

              <button
                onClick={() => insertTemplate('calculator')}
                className="w-full flex items-center gap-4 px-4 py-4 text-sm text-[var(--text-secondary)] hover:bg-[var(--input-bg)] rounded-xl transition-all text-left"
              >
                <Calculator className="w-5 h-5 text-blue-400" />
                <span className="font-semibold">Scientific Calculator</span>
              </button>

              <button
                onClick={() => insertTemplate('codeCell')}
                className="w-full flex items-center gap-4 px-4 py-4 text-sm text-[var(--text-secondary)] hover:bg-[var(--input-bg)] rounded-xl transition-all text-left"
              >
                <Code className="w-5 h-5 text-emerald-400" />
                <span className="font-semibold">Code Cell (Python)</span>
              </button>

              <button
                onClick={() => insertTemplate('setup')}
                className="w-full flex items-center gap-4 px-4 py-4 text-sm text-[var(--text-secondary)] hover:bg-[var(--input-bg)] rounded-xl transition-all text-left"
              >
                <FileText className="w-5 h-5 text-purple-400" />
                <span className="font-semibold">Experiment Setup</span>
              </button>

              <ToolbarDivider className="!h-px !w-full !my-2 opacity-20" />

              <button 
                onClick={insertTimestamp}
                className="w-full flex items-center gap-4 px-4 py-4 text-sm text-[var(--text-secondary)] hover:bg-[var(--input-bg)] rounded-xl transition-all text-left"
              >
                <Clock className="w-5 h-5 text-blue-500" />
                <span className="font-semibold">Insert Timestamp</span>
              </button>

              <div className="relative group/sub">
                <button className="w-full flex items-center justify-between px-4 py-4 text-sm text-[var(--text-secondary)] hover:bg-[var(--input-bg)] rounded-xl transition-all group/btn">
                  <div className="flex items-center gap-4">
                    <FlaskConical className="w-5 h-5 text-indigo-400" />
                    <span className="font-semibold">Symbols</span>
                  </div>
                  <ChevronDown className="w-4 h-4 -rotate-90 opacity-30 group-hover/btn:opacity-100 transition-all" />
                </button>
                <div className="absolute right-full top-[-10px] bottom-[-10px] pr-2 -mr-2 hidden group-hover/sub:block z-50 min-w-[240px]">
                  <div className="h-full flex items-start pt-[10px]">
                    <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-[20px] shadow-[0_30px_90px_rgba(0,0,0,0.7)] p-4 h-80 overflow-y-auto custom-scrollbar z-50">
                      <div className="grid grid-cols-5 gap-2">
                        {[
                          'α', 'β', 'Δ', 'λ', 'μ', 'π', 'σ', 'ω', 'γ', 'θ', 
                          'ρ', 'τ', 'φ', 'χ', 'ψ', 'ζ', 'Å', '∞', '±', '×', 
                          '→', '⇌', '≈', '≠', '°', '′', '″', '≤', '≥', '∝'
                        ].map(s => (
                          <button
                            key={s}
                            onClick={() => insertSymbol(s)}
                            className="w-10 h-10 flex items-center justify-center text-base text-[var(--text-muted)] hover:bg-[var(--input-bg)] hover:text-[var(--text-primary)] rounded-xl transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
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
                className={`p-1.5 rounded transition-colors flex items-center justify-center cursor-pointer ${activeMenu === 'more' ? 'bg-[var(--input-bg)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:bg-[var(--input-bg)] hover:text-[var(--text-primary)]'}`}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            }
          >
            <div className="w-44 p-1">
              <button 
                onClick={() => editor.chain().focus().unsetAllMarks().run()}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--input-bg)] rounded-md transition-colors"
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
      <div className="flex-1 overflow-y-auto bg-[var(--bg-main)] rounded-b-xl">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

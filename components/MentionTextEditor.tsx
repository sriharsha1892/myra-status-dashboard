'use client';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Highlight from '@tiptap/extension-highlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { lowlight } from 'lowlight/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import json from 'highlight.js/lib/languages/json';
import sql from 'highlight.js/lib/languages/sql';
import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Bold, Italic, List, ListOrdered, AtSign, Send, Sparkles,
  Underline as UnderlineIcon, Link as LinkIcon, Table as TableIcon,
  Code, Palette, Highlighter, X
} from 'lucide-react';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import 'tippy.js/dist/tippy.css';

// Register languages for code highlighting
lowlight.register('javascript', javascript);
lowlight.register('typescript', typescript);
lowlight.register('python', python);
lowlight.register('json', json);
lowlight.register('sql', sql);

interface User {
  user_id: string;
  full_name: string | null;
  email: string;
}

interface MentionTextEditorProps {
  content?: string;
  placeholder?: string;
  onSubmit?: (content: string, mentions: string[]) => void;
  onChange?: (content: string, mentions: string[]) => void;
  onCancel?: () => void;
  submitButtonText?: string;
  minHeight?: string;
  showToolbar?: boolean;
}

export default function MentionTextEditor({
  content = '',
  placeholder = 'Type @ to mention someone...',
  onSubmit,
  onChange,
  onCancel,
  submitButtonText = 'Send',
  minHeight = '120px',
  showToolbar = true,
}: MentionTextEditorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const supabase = createClient();

  // Handle link insertion
  const setLink = () => {
    if (!editor || !linkUrl) return;

    if (linkUrl === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: linkUrl })
        .run();
    }

    setShowLinkInput(false);
    setLinkUrl('');
  };

  // Handle color change
  const setTextColor = (color: string) => {
    if (!editor) return;
    editor.chain().focus().setColor(color).run();
    setShowColorPicker(false);
  };

  // Fetch users for mentions
  const fetchUsers = async (query: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('user_id, full_name, email')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      return (data || []) as User[];
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // Disable default code block to use CodeBlockLowlight
      }),
      Placeholder.configure({
        placeholder,
      }),
      Underline,
      TextStyle,
      Color,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800 cursor-pointer',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full',
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
      Highlight.configure({
        multicolor: true,
        HTMLAttributes: {
          class: 'bg-yellow-200',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'code-block',
        },
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention',
        },
        suggestion: {
          items: async ({ query }: { query: string }) => {
            return await fetchUsers(query);
          },
          render: () => {
            let component: any;
            let popup: TippyInstance | null = null;

            return {
              onStart: (props: any) => {
                component = new MentionList(props);

                if (!props.clientRect) {
                  return;
                }

                popup = tippy('body', {
                  getReferenceClientRect: props.clientRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                });
              },
              onUpdate: (props: any) => {
                component.updateProps(props);

                if (!props.clientRect) {
                  return;
                }

                popup?.setProps({
                  getReferenceClientRect: props.clientRect,
                });
              },
              onKeyDown: (props: any) => {
                if (props.event.key === 'Escape') {
                  popup?.hide();
                  return true;
                }

                return component.onKeyDown(props);
              },
              onExit: () => {
                popup?.destroy();
                component.destroy();
              },
            };
          },
        },
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none',
        style: `min-height: ${minHeight}`,
      },
    },
    onUpdate: ({ editor }) => {
      // Call onChange when content changes (for form integration)
      if (onChange) {
        const html = editor.getHTML();
        const mentionedUserIds = getMentionedUserIds();
        onChange(html, mentionedUserIds);
      }
    },
  });

  // Extract mentioned user IDs from editor content
  const getMentionedUserIds = (): string[] => {
    if (!editor) return [];

    const mentions: string[] = [];
    const json = editor.getJSON();

    const extractMentions = (node: any) => {
      if (node.type === 'mention' && node.attrs?.id) {
        mentions.push(node.attrs.id);
      }
      if (node.content) {
        node.content.forEach(extractMentions);
      }
    };

    extractMentions(json);
    return [...new Set(mentions)]; // Remove duplicates
  };

  const handleSubmit = async () => {
    if (!editor) return;

    const html = editor.getHTML();
    if (!html || html === '<p></p>') return;

    setIsSubmitting(true);
    try {
      const mentionedUserIds = getMentionedUserIds();
      await onSubmit?.(html, mentionedUserIds);
      editor.commands.clearContent();
    } catch (error) {
      console.error('Error submitting:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    editor?.commands.clearContent();
    onCancel?.();
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
      {/* Enhanced Toolbar */}
      {showToolbar && (
        <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-slate-200 bg-slate-50">
          {/* Text Formatting */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 rounded hover:bg-slate-200 transition-colors ${
              editor.isActive('bold') ? 'bg-slate-200 text-blue-600' : 'text-slate-600'
            }`}
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 rounded hover:bg-slate-200 transition-colors ${
              editor.isActive('italic') ? 'bg-slate-200 text-blue-600' : 'text-slate-600'
            }`}
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-2 rounded hover:bg-slate-200 transition-colors ${
              editor.isActive('underline') ? 'bg-slate-200 text-blue-600' : 'text-slate-600'
            }`}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-slate-300 mx-1" />

          {/* Lists */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded hover:bg-slate-200 transition-colors ${
              editor.isActive('bulletList') ? 'bg-slate-200 text-blue-600' : 'text-slate-600'
            }`}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-2 rounded hover:bg-slate-200 transition-colors ${
              editor.isActive('orderedList') ? 'bg-slate-200 text-blue-600' : 'text-slate-600'
            }`}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-slate-300 mx-1" />

          {/* Link */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                const previousUrl = editor.getAttributes('link').href;
                setLinkUrl(previousUrl || '');
                setShowLinkInput(!showLinkInput);
              }}
              className={`p-2 rounded hover:bg-slate-200 transition-colors ${
                editor.isActive('link') ? 'bg-slate-200 text-blue-600' : 'text-slate-600'
              }`}
              title="Insert Link"
            >
              <LinkIcon className="w-4 h-4" />
            </button>
            {showLinkInput && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-3 w-64">
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="flex-1 px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={(e) => e.key === 'Enter' && setLink()}
                    autoFocus
                  />
                  <button
                    onClick={setLink}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Set
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Table */}
          <button
            type="button"
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            className={`p-2 rounded hover:bg-slate-200 transition-colors ${
              editor.isActive('table') ? 'bg-slate-200 text-blue-600' : 'text-slate-600'
            }`}
            title="Insert Table (3x3)"
          >
            <TableIcon className="w-4 h-4" />
          </button>

          {/* Code Block */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`p-2 rounded hover:bg-slate-200 transition-colors ${
              editor.isActive('codeBlock') ? 'bg-slate-200 text-blue-600' : 'text-slate-600'
            }`}
            title="Code Block"
          >
            <Code className="w-4 h-4" />
          </button>

          {/* Highlight */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={`p-2 rounded hover:bg-slate-200 transition-colors ${
              editor.isActive('highlight') ? 'bg-slate-200 text-yellow-600' : 'text-slate-600'
            }`}
            title="Highlight Text"
          >
            <Highlighter className="w-4 h-4" />
          </button>

          {/* Text Color */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-2 rounded hover:bg-slate-200 transition-colors text-slate-600"
              title="Text Color"
            >
              <Palette className="w-4 h-4" />
            </button>
            {showColorPicker && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-2">
                <div className="grid grid-cols-5 gap-1">
                  {['#000000', '#64748b', '#ef4444', '#f59e0b', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setTextColor(color)}
                      className="w-6 h-6 rounded border-2 border-slate-200 hover:border-blue-500 transition-colors"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex-1" />

          {/* Mentions Hint */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <AtSign className="w-3.5 h-3.5" />
            <span>@ mention</span>
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="px-4 py-3">
        <EditorContent editor={editor} />
      </div>

      {/* Footer with Actions */}
      {onSubmit && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Markdown supported</span>
          </div>
          <div className="flex items-center gap-2">
            {onCancel && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{submitButtonText}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Styles */}
      <style jsx global>{`
        .ProseMirror {
          min-height: ${minHeight};
          max-height: 400px;
          overflow-y: auto;
        }

        .ProseMirror p.is-editor-empty:first-child::before {
          color: #94a3b8;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }

        .ProseMirror:focus {
          outline: none;
        }

        /* Mentions */
        .ProseMirror .mention {
          background: #dbeafe;
          color: #1e40af;
          padding: 2px 6px;
          border-radius: 6px;
          font-weight: 500;
          font-size: 0.875rem;
          white-space: nowrap;
        }

        /* Tables */
        .ProseMirror table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 0.5rem 0;
          overflow: hidden;
        }

        .ProseMirror table td,
        .ProseMirror table th {
          min-width: 1em;
          border: 2px solid #e2e8f0;
          padding: 0.5rem;
          vertical-align: top;
          box-sizing: border-box;
          position: relative;
        }

        .ProseMirror table th {
          font-weight: bold;
          text-align: left;
          background-color: #f8fafc;
        }

        .ProseMirror table .selectedCell:after {
          z-index: 2;
          position: absolute;
          content: "";
          left: 0;
          right: 0;
          top: 0;
          bottom: 0;
          background: rgba(59, 130, 246, 0.1);
          pointer-events: none;
        }

        /* Code Blocks */
        .ProseMirror .code-block {
          background: #1e293b;
          color: #f1f5f9;
          font-family: 'JetBrainsMono', 'Fira Code', 'Monaco', 'Courier New', monospace;
          padding: 1rem;
          border-radius: 0.5rem;
          margin: 0.5rem 0;
          overflow-x: auto;
        }

        .ProseMirror code {
          background: #f1f5f9;
          color: #0f172a;
          padding: 0.2em 0.4em;
          border-radius: 0.25rem;
          font-size: 0.875em;
          font-family: 'Monaco', 'Courier New', monospace;
        }

        .ProseMirror pre code {
          background: none;
          color: inherit;
          padding: 0;
        }

        /* Links */
        .ProseMirror a {
          color: #3b82f6;
          cursor: pointer;
          text-decoration: underline;
        }

        .ProseMirror a:hover {
          color: #1d4ed8;
        }

        /* Highlight */
        .ProseMirror mark {
          background-color: #fef08a;
          padding: 0.1em 0;
          border-radius: 0.125rem;
        }
      `}</style>
    </div>
  );
}

// Mention List Component
class MentionList {
  items: User[];
  selectedIndex: number;
  element: HTMLDivElement;
  props: any;

  constructor(props: any) {
    this.items = props.items;
    this.selectedIndex = 0;
    this.props = props;

    this.element = document.createElement('div');
    this.element.className = 'mention-list';

    this.render();
  }

  updateProps(props: any) {
    this.props = props;
    this.items = props.items;
    this.selectedIndex = 0;
    this.render();
  }

  onKeyDown({ event }: { event: KeyboardEvent }) {
    if (event.key === 'ArrowUp') {
      this.upHandler();
      return true;
    }

    if (event.key === 'ArrowDown') {
      this.downHandler();
      return true;
    }

    if (event.key === 'Enter') {
      this.enterHandler();
      return true;
    }

    return false;
  }

  upHandler() {
    this.selectedIndex = (this.selectedIndex + this.items.length - 1) % this.items.length;
    this.render();
  }

  downHandler() {
    this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
    this.render();
  }

  enterHandler() {
    this.selectItem(this.selectedIndex);
  }

  selectItem(index: number) {
    const item = this.items[index];
    if (item) {
      this.props.command({ id: item.user_id, label: item.full_name || item.email });
    }
  }

  render() {
    this.element.innerHTML = '';

    if (this.items.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'mention-item-empty';
      emptyDiv.textContent = 'No users found';
      this.element.appendChild(emptyDiv);
      return;
    }

    this.items.forEach((item, index) => {
      const button = document.createElement('button');
      button.className = `mention-item ${index === this.selectedIndex ? 'is-selected' : ''}`;
      button.type = 'button';

      const avatar = document.createElement('div');
      avatar.className = 'mention-avatar';
      avatar.textContent = (item.full_name || item.email).charAt(0).toUpperCase();

      const details = document.createElement('div');
      details.className = 'mention-details';

      const name = document.createElement('div');
      name.className = 'mention-name';
      name.textContent = item.full_name || item.email;

      const email = document.createElement('div');
      email.className = 'mention-email';
      email.textContent = item.email;

      details.appendChild(name);
      if (item.full_name) {
        details.appendChild(email);
      }

      button.appendChild(avatar);
      button.appendChild(details);

      button.addEventListener('click', () => this.selectItem(index));

      this.element.appendChild(button);
    });

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .mention-list {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        padding: 4px;
        max-height: 300px;
        overflow-y: auto;
        min-width: 280px;
      }

      .mention-item {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        text-align: left;
        padding: 10px 12px;
        border-radius: 8px;
        border: none;
        background: none;
        cursor: pointer;
        transition: all 0.15s;
      }

      .mention-item:hover,
      .mention-item.is-selected {
        background: #f1f5f9;
      }

      .mention-avatar {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        background: linear-gradient(135deg, #3b82f6, #8b5cf6);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 14px;
        flex-shrink: 0;
      }

      .mention-details {
        flex: 1;
        min-width: 0;
      }

      .mention-name {
        font-size: 14px;
        font-weight: 500;
        color: #0f172a;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .mention-email {
        font-size: 12px;
        color: #64748b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .mention-item-empty {
        padding: 16px 12px;
        text-align: center;
        color: #94a3b8;
        font-size: 14px;
      }
    `;
    if (!document.querySelector('#mention-styles')) {
      style.id = 'mention-styles';
      document.head.appendChild(style);
    }
  }

  destroy() {
    this.element.remove();
  }
}

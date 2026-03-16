import { Extension } from '@tiptap/core';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorState } from '@tiptap/pm/state';

export interface RemoteCursor {
  userId: string;
  userName: string;
  color: string;
  pos: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    collaborationCursor: {
      setCollaborationCursors: (cursors: RemoteCursor[]) => ReturnType;
    };
  }
}

export const CollaborationCursor = Extension.create({
  name: 'collaborationCursor',

  addStorage() {
    return {
      remoteCursors: [] as RemoteCursor[],
    };
  },

  addCommands() {
    return {
      setCollaborationCursors: (cursors: RemoteCursor[]) => ({ editor }: { editor: any }) => {
        this.storage.remoteCursors = cursors;
        // Force a re-render of decorations by updating the editor state if needed
        editor.view.dispatch(editor.view.state.tr.setMeta('collaborationCursorUpdate', true));
        return true;
      },
    };
  },

  addProseMirrorPlugins() {
    const { storage } = this;

    return [
      new Plugin({
        key: new PluginKey('collaborationCursor'),
        props: {
          decorations(state: EditorState) {
            const remoteCursors = storage.remoteCursors as RemoteCursor[];
            const decorations: Decoration[] = [];

            remoteCursors.forEach((cursor) => {
              if (cursor.pos < 0 || cursor.pos > state.doc.content.size) return;

              const cursorEl = document.createElement('span');
              cursorEl.classList.add('collaboration-cursor');
              cursorEl.style.borderLeftColor = cursor.color;

              const labelEl = document.createElement('div');
              labelEl.classList.add('collaboration-cursor-label');
              labelEl.style.backgroundColor = cursor.color;
              labelEl.textContent = cursor.userName;

              cursorEl.appendChild(labelEl);

              decorations.push(
                Decoration.widget(cursor.pos, cursorEl, {
                  side: 0,
                  key: `cursor-${cursor.userId}`,
                })
              );
            });

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

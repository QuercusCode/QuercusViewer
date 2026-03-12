import { ReactRenderer } from '@tiptap/react';
import tippy, { type Instance as TippyInstance, type Props as TippyProps } from 'tippy.js';
import { MentionList } from './MentionList';
import type { Structure } from '../../lib/structuresService';

export const createSuggestion = (structures: Structure[]) => ({
  items: ({ query }: { query: string }) => {
    return structures
      .filter(item => 
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        (item.metadata?.title && item.metadata.title.toLowerCase().includes(query.toLowerCase()))
      )
      .slice(0, 5);
  },

  render: () => {
    let component: ReactRenderer;
    let popup: TippyInstance<TippyProps>[];

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(MentionList, {
          props,
          editor: props.editor,
        });

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

      onUpdate(props: any) {
        component.updateProps(props);

        if (!props.clientRect) {
          return;
        }

        popup[0].setProps({
          getReferenceClientRect: props.clientRect,
        });
      },

      onKeyDown(props: any) {
        if (props.event.key === 'Escape') {
          popup[0].hide();
          return true;
        }

        return (component.ref as any)?.onKeyDown(props);
      },

      onExit() {
        popup[0].destroy();
        component.destroy();
      },
    };
  },
});

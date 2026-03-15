import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ImageWorkbenchNode } from './ImageWorkbenchNode';

export const ImageWorkbench = Node.create({
  name: 'imageWorkbench',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      annotations: {
        default: [],
      },
      calibration: {
        default: { px: 0, um: 0, ratio: 1 }, // ratio = um / px
      },
      width: {
        default: '100%',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="image-workbench"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'image-workbench' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageWorkbenchNode);
  },

  addStorage() {
    return {
      markdown: {
        serialize: (state: any, node: any) => {
          // Base64 encode to prevent newlines from breaking Markdown paragraph parsing
          const payload = JSON.stringify({
            src: node.attrs.src,
            annotations: node.attrs.annotations,
            calibration: node.attrs.calibration
          });
          const base64 = typeof btoa !== 'undefined' 
            ? btoa(unescape(encodeURIComponent(payload)))
            : Buffer.from(payload).toString('base64');
          state.write(`[[image-workbench:${base64}]]`);
          state.closeBlock(node);
        },
        parse: {
          // Parsing back from markdown if needed
        }
      }
    }
  }
});

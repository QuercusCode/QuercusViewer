import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import ResizableImageComponent from './ResizableImageComponent';

export interface ResizableImageOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    resizableImage: {
      setResizableImage: (options: { src: string; alt?: string; title?: string; width?: string | number; height?: string | number }) => ReturnType;
    };
  }
}

export const ResizableImage = Node.create<ResizableImageOptions>({
  name: 'resizableImage',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  group: 'block',

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: '100%',
        renderHTML: attributes => ({
          width: attributes.width,
        }),
      },
      height: {
        default: 'auto',
        renderHTML: attributes => ({
          height: attributes.height,
        }),
      },
      style: {
        default: null,
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent);
  },

  addStorage() {
    return {
      markdown: {
        serialize: (state: any, node: any) => {
          const { src, width, height, alt, title } = node.attrs;
          // Use a simple format that doesn't crash on large strings
          // We'll use a unique block identifier
          state.write(`:::resizable-image\n`);
          state.write(JSON.stringify({ src, width, height, alt, title }));
          state.write(`\n:::`);
          state.closeBlock(node);
        },
        parse: {
          setup: (markdownit: any) => {
            markdownit.use((md: any) => {
              const defaultRender = md.renderer.rules.fence || function(tokens: any, idx: any, options: any, _env: any, self: any) {
                return self.renderToken(tokens, idx, options);
              };

              md.renderer.rules.fence = (tokens: any, idx: any, options: any, _env: any, self: any) => {
                const token = tokens[idx];
                if (token.info === 'resizable-image') {
                  try {
                    const attrs = JSON.parse(token.content.trim());
                    return `<img src="${attrs.src}" width="${attrs.width || '100%'}" height="${attrs.height || 'auto'}" alt="${attrs.alt || ''}" title="${attrs.title || ''}" class="resizable-image-node" />`;
                  } catch (e) {
                    return defaultRender(tokens, idx, options, _env, self);
                  }
                }
                return defaultRender(tokens, idx, options, _env, self);
              };
            });
          },
          // Tiptap-markdown specific parser rules
          updateDOM: (element: HTMLElement) => {
            // Find our custom images and convert them to the proper node type
            const images = element.querySelectorAll('img.resizable-image-node');
            images.forEach(img => {
              const parent = img.parentElement;
              if (parent) {
                // This will be picked up by the Tiptap editor during HTML parsing
                // since we have tag: 'img[src]' in parseHTML
              }
            });
          }
        }
      }
    }
  },

  addCommands() {
    return {
      setResizableImage: (options: { src: string; alt?: string; title?: string; width?: string | number; height?: string | number }) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        });
      },
    };
  },
});

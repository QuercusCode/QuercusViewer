import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'

// Explicit vendor chunk boundaries. Without this, Rollup's automatic chunking
// can group large, unrelated libraries into a single shared chunk purely
// because they happen to be reachable from the same set of dynamic-import
// entry points — e.g. NGL + Three.js ending up bundled alongside a few
// small landing-page files under a chunk named after whichever file Rollup
// picked as representative. Pinning each heavy library to its own chunk
// makes chunk boundaries predictable and lets the browser cache vendor code
// (which changes rarely) separately from app code (which changes often).
//
// Each entry here is deliberately its OWN chunk rather than grouped with
// sibling libraries: if two unrelated libraries share a chunk and only one
// of them is needed eagerly (e.g. qrcode via ShareModal) while the other is
// only needed lazily (e.g. html2canvas via the notebook's image editor),
// bundling them together would force the lazy one to load eagerly too.
const VENDOR_CHUNKS: [string, string[]][] = [
  // React/react-dom/scheduler/react-router are deliberately NOT pinned to a
  // manual chunk here: forcing React's own packages into a separate chunk
  // combined with this many React.lazy() boundaries produced a real runtime
  // crash ("Cannot read properties of undefined (reading 'createContext')")
  // from a module-initialization-order issue — a known class of problem
  // with manually chunking React specifically. Rollup's automatic chunking
  // already handles React (and anything else not listed below) correctly.
  ['vendor-supabase', ['/@supabase/']],
  ['vendor-i18n', ['/i18next/', '/react-i18next/', '/i18next-browser-languagedetector/']],
  ['vendor-ngl', ['/ngl/', '/three/', '/chroma-js/', '/signals/', '/sprintf-js/']],
  ['vendor-molstar', ['/molstar/']],
  ['vendor-pdf', ['/jspdf/', '/jspdf-autotable/', '/pdfjs-dist/']],
  ['vendor-pptx', ['/pptxgenjs/']],
  ['vendor-tiptap', ['/@tiptap/', '/prosemirror', '/tiptap-markdown/']],
  ['vendor-charts', ['/recharts/', '/d3-', '/victory-vendor/']],
  ['vendor-html2canvas', ['/html2canvas/']],
  ['vendor-jszip', ['/jszip/']],
  ['vendor-qrcode', ['/qrcode/']],
  ['vendor-markdown', ['/react-markdown/', '/remark-', '/rehype-', '/mdast-', '/micromark', '/unist-', '/vfile', '/hast-']],
  ['vendor-peer', ['/peerjs/']],
]

// Tiny, nearly-universally-used runtime bits (Vite's own dynamic-import
// preload helper, clsx, tslib, ...) that EVERY lazy-loaded component needs.
// Without a dedicated, guaranteed-separate home, Rollup can embed the one
// shared copy physically inside whichever specialized vendor chunk happens
// to need it first — e.g. vite/preload-helper ending up inside vendor-pdf —
// which then forces every OTHER lazy chunk that also needs it to eagerly
// pull in that entire specialized (and otherwise-unrelated) chunk just to
// get one tiny helper. Matched before VENDOR_CHUNKS and checked by raw
// module id rather than just "under node_modules", since Vite's preload
// helper is a virtual module.
const SHARED_RUNTIME_MARKERS = ['vite/preload-helper', 'commonjsHelpers', 'node_modules/clsx/', 'node_modules/tslib/', 'node_modules/tailwind-merge/']

function manualChunks(id: string) {
  if (SHARED_RUNTIME_MARKERS.some(marker => id.includes(marker))) return 'vendor-utils'
  if (!id.includes('node_modules')) return undefined
  for (const [chunkName, markers] of VENDOR_CHUNKS) {
    if (markers.some(marker => id.includes(marker))) return chunkName
  }
  return undefined
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg', 'logo/icon-black.png', 'logo/icon-white.png'],
      manifest: {
        name: 'Quercus Viewer',
        short_name: 'Quercus',
        description: 'Professional 3D Protein & Chemical structure viewer',
        theme_color: '#171717',
        background_color: '#171717',
        display: 'standalone',
        orientation: 'any',
        start_url: './',
        icons: [
          {
            src: 'logo/icon-white.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'logo/icon-black.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024 // 15 MiB to accommodate large Mol* chunks
      }
    }),
    // Opt-in bundle treemap: `ANALYZE=1 npm run build` writes dist/stats.html.
    ...(process.env.ANALYZE ? [visualizer({ filename: 'dist/stats.html', gzipSize: true, brotliSize: true, template: 'treemap' })] : []),
  ],
  base: '/',
  build: {
    // NGL, Mol*, and TipTap are each genuinely this large on their own and
    // are now correctly isolated into their own lazy-loaded chunks (see
    // manualChunks above) — the default 500kB warning is no longer actionable
    // for them specifically, so raise it past their known sizes.
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
})

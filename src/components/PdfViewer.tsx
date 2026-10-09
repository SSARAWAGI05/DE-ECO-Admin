import React, { useState, useEffect, useRef } from 'react'
import {
  FileText,
  ExternalLink,
  Download,
  ZoomIn,
  ZoomOut,
  Loader2,
  AlertCircle
} from 'lucide-react'

interface PdfViewerProps {
  url: string
  fileName?: string
  fileSize?: string
  headerExtra?: React.ReactNode
}

/**
 * Dynamically loads Mozilla's PDF.js library via CDN in the browser
 */
const loadPdfJs = async (): Promise<any> => {
  if (typeof window === 'undefined') throw new Error('Browser environment required');
  const win = window as any;
  if (win.pdfjsLib) return win.pdfjsLib;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    script.onload = () => {
      if (win.pdfjsLib) {
        try {
          const workerBlob = new Blob(
            [`importScripts('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js');`],
            { type: 'application/javascript' }
          );
          win.pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(workerBlob);
        } catch {
          win.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
        resolve(win.pdfjsLib);
      } else {
        reject(new Error('PDF.js failed to initialize'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js from CDN'));
    document.head.appendChild(script);
  });
};

export default function PdfViewer({
  url,
  fileName = 'Handwritten Answer Sheet.pdf',
  fileSize,
  headerExtra
}: PdfViewerProps) {
  // 'google': Google Docs Viewer (works universally on Android Chrome without "Open" blue button)
  // 'canvas': Client-side PDF.js canvas rendering (crisp handwritten rendering)
  // 'native': Raw browser iframe
  const [viewerMode, setViewerMode] = useState<'google' | 'canvas' | 'native'>('google');

  // Canvas mode states
  const [loadingCanvas, setLoadingCanvas] = useState(false)
  const [canvasError, setCanvasError] = useState<string | null>(null)
  const [zoomScale, setZoomScale] = useState<number>(1.0)
  const pagesContainerRef = useRef<HTMLDivElement>(null)
  const [iframeLoading, setIframeLoading] = useState(true)

  // Reset states when URL changes
  useEffect(() => {
    setIframeLoading(true)
    setCanvasError(null)
  }, [url])

  // PDF.js canvas rendering logic
  useEffect(() => {
    if (viewerMode !== 'canvas' || !url) return

    let isMounted = true
    let loadingTask: any = null

    const renderAllPages = async () => {
      setLoadingCanvas(true)
      setCanvasError(null)

      try {
        const pdfjsLib = await loadPdfJs()
        if (!isMounted) return

        loadingTask = pdfjsLib.getDocument({
          url,
          withCredentials: false
        })
        const pdfDoc = await loadingTask.promise
        if (!isMounted) return

        const container = pagesContainerRef.current
        if (!container) return
        container.innerHTML = '' // clear previous pages

        const containerWidth = container.clientWidth || 360

        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
          if (!isMounted) break
          const page = await pdfDoc.getPage(pageNum)
          if (!isMounted) break

          const unscaledViewport = page.getViewport({ scale: 1.0 })
          const fitScale = (containerWidth - 24) / unscaledViewport.width
          const effectiveScale = (fitScale > 0 ? fitScale : 1.0) * zoomScale
          const viewport = page.getViewport({ scale: effectiveScale })

          const pageWrapper = document.createElement('div')
          pageWrapper.className = 'mb-4 flex flex-col items-center bg-white shadow-md rounded-lg overflow-hidden border border-slate-200 dark:border-neutral-700'

          const pageBadge = document.createElement('div')
          pageBadge.className = 'w-full py-1 px-3 bg-slate-100 text-slate-500 text-[10px] font-bold border-b border-slate-200 flex justify-between'
          pageBadge.innerHTML = `<span>Page ${pageNum} of ${pdfDoc.numPages}</span>`
          pageWrapper.appendChild(pageBadge)

          const canvas = document.createElement('canvas')
          const pixelRatio = window.devicePixelRatio || 1
          canvas.width = Math.floor(viewport.width * pixelRatio)
          canvas.height = Math.floor(viewport.height * pixelRatio)
          canvas.style.width = `${Math.floor(viewport.width)}px`
          canvas.style.height = `${Math.floor(viewport.height)}px`
          canvas.className = 'max-w-full block bg-white'

          const ctx = canvas.getContext('2d')
          if (ctx) {
            const transform = pixelRatio !== 1 ? [pixelRatio, 0, 0, pixelRatio, 0, 0] : null
            const renderContext = {
              canvasContext: ctx,
              transform: transform,
              viewport: viewport
            }
            await page.render(renderContext).promise
          }

          pageWrapper.appendChild(canvas)
          container.appendChild(pageWrapper)
        }

        setLoadingCanvas(false)
      } catch (err: any) {
        if (!isMounted) return
        console.warn('PDF.js canvas render error, falling back to Google Docs viewer:', err)
        setCanvasError(err.message || 'Could not load PDF locally.')
        setLoadingCanvas(false)
        setViewerMode('google')
      }
    }

    renderAllPages()

    return () => {
      isMounted = false
      if (loadingTask) {
        try { loadingTask.destroy(); } catch {}
      }
    }
  }, [viewerMode, url, zoomScale])

  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`

  return (
    <div className="flex-1 w-full h-full flex flex-col min-h-0 bg-slate-100 dark:bg-neutral-950 overflow-hidden">
      {/* TOOLBAR */}
      <div className="shrink-0 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-slate-100 dark:bg-neutral-900 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between text-xs gap-1.5">
        
        {/* File info */}
        <div className="flex items-center gap-1.5 min-w-0 pr-1">
          <div className="p-1 rounded bg-indigo-600 text-white shrink-0">
            <FileText size={13} />
          </div>
          <span className="font-bold text-slate-800 dark:text-neutral-200 truncate text-[11px] sm:text-xs">
            {fileName}
          </span>
          {fileSize && (
            <span className="text-[10px] text-slate-400 dark:text-neutral-500 hidden sm:inline">
              ({fileSize})
            </span>
          )}
        </div>

        {/* Actions & controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* External extra controls (Min/Expand from mobile parent) */}
          {headerExtra}

          {/* Engine Mode Toggle */}
          <div className="flex items-center bg-slate-200/90 dark:bg-neutral-800 rounded-lg p-0.5 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setViewerMode('google')}
              className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                viewerMode === 'google'
                  ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-400 shadow-2xs font-extrabold'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900'
              }`}
              title="Google Docs Online Viewer (Bypasses Android PDF Download screen)"
            >
              Online
            </button>
            <button
              type="button"
              onClick={() => setViewerMode('canvas')}
              className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                viewerMode === 'canvas'
                  ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-400 shadow-2xs font-extrabold'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900'
              }`}
              title="Native Canvas Renderer"
            >
              Canvas
            </button>
          </div>

          {/* Canvas Zoom Controls (Only when in canvas mode) */}
          {viewerMode === 'canvas' && (
            <div className="flex items-center bg-slate-200/90 dark:bg-neutral-800 rounded-lg p-0.5 text-[10px]">
              <button
                type="button"
                onClick={() => setZoomScale(Math.max(0.6, zoomScale - 0.2))}
                className="p-1 hover:bg-white dark:hover:bg-neutral-700 rounded transition cursor-pointer text-slate-700 dark:text-neutral-300"
                title="Zoom Out"
              >
                <ZoomOut size={11} />
              </button>
              <span className="px-1 text-[9px] font-bold text-slate-600 dark:text-neutral-400">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomScale(Math.min(2.5, zoomScale + 0.2))}
                className="p-1 hover:bg-white dark:hover:bg-neutral-700 rounded transition cursor-pointer text-slate-700 dark:text-neutral-300"
                title="Zoom In"
              >
                <ZoomIn size={11} />
              </button>
            </div>
          )}

          {/* Open in New Window */}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold shadow-xs transition"
            title="Open raw PDF in new tab"
          >
            <ExternalLink size={11} />
            <span className="hidden sm:inline">Open ↗</span>
          </a>

          {/* Download */}
          <a
            href={url}
            download={fileName}
            className="p-1 rounded-lg bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 hover:bg-slate-50 transition"
            title="Download PDF"
          >
            <Download size={12} />
          </a>
        </div>
      </div>

      {/* VIEWER DISPLAY PANE */}
      <div
        className="flex-1 w-full min-h-0 bg-slate-900/90 dark:bg-black relative overflow-hidden flex flex-col"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* MODE 1: GOOGLE DOCS EMBEDDED VIEWER (Guaranteed on Android Chrome without blue 'Open' button) */}
        {viewerMode === 'google' && (
          <div className="absolute inset-0 w-full h-full flex flex-col bg-slate-900">
            {iframeLoading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/80 text-white p-4">
                <Loader2 size={24} className="animate-spin text-indigo-400 mb-2" />
                <p className="text-xs font-semibold">Loading student answer sheet...</p>
                <p className="text-[10px] text-slate-400 mt-1">Rendering inline document preview</p>
              </div>
            )}
            <iframe
              src={googleViewerUrl}
              title="Student Answer Sheet - Online Preview"
              onLoad={() => setIframeLoading(false)}
              className="w-full h-full border-0 bg-white"
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          </div>
        )}

        {/* MODE 2: CLIENT-SIDE CANVAS RENDERER */}
        {viewerMode === 'canvas' && (
          <div className="absolute inset-0 w-full h-full overflow-y-auto p-3 sm:p-4 custom-scrollbar">
            {loadingCanvas && (
              <div className="py-12 flex flex-col items-center justify-center text-white">
                <Loader2 size={26} className="animate-spin text-indigo-400 mb-2" />
                <p className="text-xs font-semibold">Parsing & rendering PDF pages...</p>
                <p className="text-[10px] text-slate-400 mt-1">High-resolution canvas rendering</p>
              </div>
            )}

            {canvasError && (
              <div className="p-4 m-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs text-center space-y-2">
                <AlertCircle size={20} className="mx-auto text-rose-400" />
                <p className="font-bold">Could not render on canvas: {canvasError}</p>
                <button
                  type="button"
                  onClick={() => setViewerMode('google')}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold transition hover:bg-indigo-700"
                >
                  Switch to Online Preview
                </button>
              </div>
            )}

            <div
              ref={pagesContainerRef}
              className="w-full flex flex-col items-center"
            />
          </div>
        )}

        {/* MODE 3: DIRECT EMBED */}
        {viewerMode === 'native' && (
          <iframe
            src={`${url}#toolbar=1&navpanes=0`}
            title="Student Answer Sheet - Direct Preview"
            className="absolute inset-0 w-full h-full border-0 bg-white"
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        )}
      </div>
    </div>
  )
}

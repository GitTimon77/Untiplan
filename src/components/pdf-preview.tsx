"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist";

const MAX_PREVIEW_PAGES = 20;

function PdfPage({ document, pageNumber }: { document: PDFDocumentProxy; pageNumber: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    let page: PDFPageProxy | undefined;
    let renderTask: RenderTask | undefined;

    void document.getPage(pageNumber).then(loadedPage => {
      page = loadedPage;
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (cancelled || !canvas || !context) return;
      const viewport = loadedPage.getViewport({ scale: 1.35 });
      const outputScale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.aspectRatio = `${viewport.width} / ${viewport.height}`;
      renderTask = loadedPage.render({
        canvasContext: context,
        viewport,
        transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
        background: "rgb(255,255,255)",
      });
      return renderTask.promise;
    }).catch(error => {
      if (!cancelled && error?.name !== "RenderingCancelledException") console.error("PDF-Seite konnte nicht gerendert werden.", error);
    });

    return () => {
      cancelled = true;
      renderTask?.cancel();
      page?.cleanup();
    };
  }, [document, pageNumber]);

  return <canvas ref={canvasRef} className="message-pdf-page" aria-label={`PDF-Seite ${pageNumber}`} />;
}

export function PdfPreview({ url, name }: { url: string; name: string }) {
  const [document, setDocument] = useState<PDFDocumentProxy>();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let loadingTask: import("pdfjs-dist").PDFDocumentLoadingTask | undefined;

    void import("pdfjs-dist").then(pdfjs => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      loadingTask = pdfjs.getDocument({ url, withCredentials: true });
      return loadingTask.promise;
    }).then(loadedDocument => {
      if (active) setDocument(loadedDocument);
      else void loadedDocument.destroy();
    }).catch(loadError => {
      if (active) {
        console.error("PDF-Vorschau konnte nicht geladen werden.", loadError);
        setError("Die PDF-Vorschau konnte nicht geladen werden.");
      }
    });

    return () => {
      active = false;
      void loadingTask?.destroy();
    };
  }, [url]);

  if (error) return <p className="message-pdf-error" role="alert">{error} Nutze bei Bedarf „Herunterladen“.</p>;
  if (!document) return <p className="muted" role="status">PDF wird geladen …</p>;

  const pageCount = Math.min(document.numPages, MAX_PREVIEW_PAGES);
  return <div className="message-pdf-preview" aria-label={`PDF-Vorschau: ${name}`}>
    {Array.from({ length: pageCount }, (_, index) => <PdfPage key={index + 1} document={document} pageNumber={index + 1} />)}
    {document.numPages > MAX_PREVIEW_PAGES && <p className="muted">Vorschau auf die ersten {MAX_PREVIEW_PAGES} Seiten begrenzt.</p>}
  </div>;
}

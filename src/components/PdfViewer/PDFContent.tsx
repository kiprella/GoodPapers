import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocumentProxy } from 'pdfjs-dist';

interface PDFContentProps {
  url: string;
  isHighlighting: boolean;
  selectedColor: string;
  onError?: (error: Error) => void;
}

// Set worker path for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export const PDFContent = ({ url, isHighlighting, selectedColor, onError }: PDFContentProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.5);

  // Load PDF document
  useEffect(() => {
    const loadPDF = async () => {
      try {
        const paperId = url.split('/').pop()?.replace('.pdf', '') || '';
        const proxyUrl = `http://localhost:8001/api/pdf/${paperId}.pdf`;
        
        const loadingTask = pdfjsLib.getDocument(proxyUrl);
        const pdf = await loadingTask.promise;
        setPdf(pdf);
        setNumPages(pdf.numPages);
        renderPage(1, pdf);
      } catch (error) {
        console.error('Error:', error);
        onError?.(error instanceof Error ? error : new Error('Failed to load PDF'));
      }
    };

    loadPDF();
  }, [url]);

  // Render a specific page
  const renderPage = async (pageNum: number, pdfDoc: PDFDocumentProxy) => {
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      
      const container = containerRef.current;
      if (!container) return;

      // Create or get the canvas for this page
      let canvas = container.querySelector(`#page-${pageNum}`) as HTMLCanvasElement;
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = `page-${pageNum}`;
        canvas.className = 'mb-4 w-full';
        container.appendChild(canvas);
      }

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: canvas.getContext('2d')!,
        viewport: viewport,
      }).promise;

      // Create text layer
      const textContent = await page.getTextContent();
      const textLayer = document.createElement('div');
      textLayer.className = 'absolute inset-0 select-text';
      textLayer.style.height = `${viewport.height}px`;
      textLayer.style.width = `${viewport.width}px`;

      const textLayerParams = {
        textContent: textContent,
        container: textLayer,
        viewport: viewport,
        textDivs: [],
      };


      // Wrap canvas and text layer
      const wrapper = document.createElement('div');
      wrapper.className = 'relative mb-4';
      wrapper.style.height = `${viewport.height}px`;
      wrapper.appendChild(canvas);
      wrapper.appendChild(textLayer);

      container.appendChild(wrapper);
    } catch (error) {
      console.error('Error rendering page:', error);
    }
  };

  // Handle scroll to load more pages
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !pdf) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && currentPage < numPages) {
            setCurrentPage(prev => {
              const nextPage = prev + 1;
              renderPage(nextPage, pdf);
              return nextPage;
            });
          }
        });
      },
      { threshold: 0.1 }
    );

    const sentinel = document.createElement('div');
    sentinel.style.height = '10px';
    container.appendChild(sentinel);
    observer.observe(sentinel);

    return () => {
      observer.disconnect();
      container.removeChild(sentinel);
    };
  }, [pdf, currentPage, numPages]);


  return (
    <div ref={containerRef} className="w-full h-full overflow-auto">
    </div>
  );
}; 
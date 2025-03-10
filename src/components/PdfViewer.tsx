import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, ExternalLink, GripVertical, Copy, Check, Highlighter, MessageSquare, Plus, Palette } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import React from "react";
import { PDFContent } from './PdfViewer/PDFContent';
import { v4 as uuidv4 } from 'uuid';

interface PdfViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paperId: string;
  abstract: string;
}



export const PdfViewer = ({ open, onOpenChange, paperId, abstract }: PdfViewerProps) => {
  const [summary, setSummary] = useState<string>("");
  const [summarizing, setSummarizing] = useState(false);
  const [panelWidth, setPanelWidth] = useState(384); // Default width (w-96 = 24rem = 384px)
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isHighlighting, setIsHighlighting] = useState(false);
  const [selectedColor, setSelectedColor] = useState("#ffeb3b");
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Handle resize functionality
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      // Calculate new width based on mouse position
      const dialogRect = resizeRef.current?.parentElement?.getBoundingClientRect();
      if (dialogRect) {
        const newWidth = Math.max(
          300, // Minimum width
          Math.min(
            600, // Maximum width
            dialogRect.width - e.clientX + dialogRect.left
          )
        );
        setPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.pspdfkit.com/pdfjs/latest/pdf.min.js";
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);



  const cleanSummary = (text: string) => {
    // Remove <n> tags
    let cleaned = text.replace(/<n>/g, ' ');
    
    // Replace math placeholders with more readable text
    cleaned = cleaned.replace(/@xmath\d+/g, '[MATH]');
    cleaned = cleaned.replace(/@xcite/g, '[CITATION]');
    
    // Clean up repetitive phrases at the end
    cleaned = cleaned.replace(/\s+in the wave(front|function)(\s*was\s*the\s*wave(front)?)*\s*[,.-]*\s*/g, ' ');
    cleaned = cleaned.replace(/(\s*,\s*,)+/g, ',');
    
    // Fix the "x x" pattern that appears in math expressions
    cleaned = cleaned.replace(/\bx\s+x\b/g, 'x');
    
    // Remove sentences that end abruptly or are nonsensical
    const sentences = cleaned.split('.');
    if (sentences.length > 3) {
      // Keep only complete, meaningful sentences
      const goodSentences = sentences.filter(s => {
        const trimmed = s.trim();
        // Keep sentences that are reasonably long and don't have repetitive patterns
        return trimmed.length > 15 && 
               !trimmed.match(/(\s*,\s*)+$/) && 
               !trimmed.match(/\s+the\s+wave(\s+was)*\s*$/) &&
               !trimmed.match(/^\s*let\s+x\s*$/i) &&
               !trimmed.match(/^\s*x\s+is\s+the\s+following\s*:/i);
      });
      
      // If we have at least 3 good sentences, use those
      if (goodSentences.length >= 3) {
        cleaned = goodSentences.join('. ') + '.';
      }
    }
    
    // Clean up extra spaces and punctuation
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    cleaned = cleaned.replace(/[,.:;]+\s*$/g, '.');
    cleaned = cleaned.replace(/\.\s*\./g, '.');
    
    // Make it sound more human by improving the flow
    cleaned = cleaned.replace(/let\s+\[MATH\]\s+be/gi, 'where [MATH] represents');
    cleaned = cleaned.replace(/let\s+/gi, 'Consider ');
    cleaned = cleaned.replace(/\bis\s+the\s+following\s*:/gi, 'can be expressed as:');
    
    return cleaned;
  };

  // Function to render text with math placeholders
  const renderWithMath = (text: string) => {
    // Split the text by [MATH] placeholders
    const parts = text.split('[MATH]');
    
    if (parts.length === 1) {
      // No math expressions
      return <p>{text}</p>;
    }
    
    // Render with math expressions highlighted
    return (
      <p>
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            {part}
            {index < parts.length - 1 && (
              <span className="px-1 py-0.5 bg-blue-100 text-blue-800 rounded">x</span>
            )}
          </React.Fragment>
        ))}
      </p>
    );
  };

  // New function to format the structured summary
  const renderStructuredSummary = (text: string) => {
    // Check if the summary contains the expected sections
    const hasHumanLikeSummary = text.includes("**Human-Like Summary:**") || text.includes("### 🔷 **Human-Like Summary**");
    const hasMainPoints = text.includes("**Main Points:**") || text.includes("### 🔷 **Main Points**");
    const hasConclusion = text.includes("**Conclusion:**") || text.includes("### 🔷 **Conclusion**");

    if (!hasHumanLikeSummary && !hasMainPoints && !hasConclusion) {
      // If the summary doesn't have the expected structure, render it as is
      return renderWithMath(text);
    }

    // Split the text into sections
    let humanSummary = "";
    let mainPoints = "";
    let conclusion = "";

    // Extract Human-Like Summary
    if (hasHumanLikeSummary) {
      const summaryMatch = text.match(/(?:\*\*Human-Like Summary:\*\*|### 🔷 \*\*Human-Like Summary\*\*)(.+?)(?:\*\*Main Points:|### 🔷 \*\*Main Points\*\*|$)/s);
      if (summaryMatch && summaryMatch[1]) {
        humanSummary = summaryMatch[1].trim();
      }
    }

    // Extract Main Points
    if (hasMainPoints) {
      const pointsMatch = text.match(/(?:\*\*Main Points:\*\*|### 🔷 \*\*Main Points\*\*)(.+?)(?:\*\*Conclusion:|### 🔷 \*\*Conclusion\*\*|$)/s);
      if (pointsMatch && pointsMatch[1]) {
        mainPoints = pointsMatch[1].trim();
      }
    }

    // Extract Conclusion
    if (hasConclusion) {
      const conclusionMatch = text.match(/(?:\*\*Conclusion:\*\*|### 🔷 \*\*Conclusion\*\*)(.+?)$/s);
      if (conclusionMatch && conclusionMatch[1]) {
        conclusion = conclusionMatch[1].trim();
      }
    }

    return (
      <div className="space-y-4">
        {humanSummary && (
          <div>
            <h4 className="text-sm font-semibold text-blue-600 mb-1 flex items-center">
              <span className="mr-1">💡</span> Human-Like Summary
            </h4>
            <div className="text-sm bg-blue-50 p-3 rounded-md">
              {renderWithMath(humanSummary)}
            </div>
          </div>
        )}
        
        {mainPoints && (
          <div>
            <h4 className="text-sm font-semibold text-emerald-600 mb-1 flex items-center">
              <span className="mr-1">📌</span> Main Points
            </h4>
            <div className="text-sm bg-emerald-50 p-3 rounded-md">
              {renderWithMath(mainPoints)}
            </div>
          </div>
        )}
        
        {conclusion && (
          <div>
            <h4 className="text-sm font-semibold text-amber-600 mb-1 flex items-center">
              <span className="mr-1">🔍</span> Conclusion
            </h4>
            <div className="text-sm bg-amber-50 p-3 rounded-md">
              {renderWithMath(conclusion)}
            </div>
          </div>
        )}
      </div>
    );
  };

  const generateSummary = async () => {
    setSummarizing(true);
    try {
      // First get the PDF text content
      const response = await fetch(`http://localhost:8001/api/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: abstract, // Using the abstract prop we already have
          max_length: 350,
          min_length: 64
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const data = await response.json();
      setSummary(cleanSummary(data.summary));
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate AI summary. Please try again.",
      });
      console.error(error);
    } finally {
      setSummarizing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-screen-xl h-[85vh] mt-[5vh] flex flex-col md:flex-row gap-0"
        aria-describedby="pdf-viewer-description"
      >
        <div id="pdf-viewer-description" className="sr-only">
          PDF viewer with annotation capabilities
        </div>
        {/* For mobile, stack the PDF and summary vertically */}
        <div className="flex-1 min-h-[40vh] md:min-h-0 relative">
          <div className="flex justify-end mb-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => window.open(`https://arxiv.org/pdf/${paperId}.pdf`, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
              Open in New Tab
            </Button>
          </div>
          
          {pdfError ? (
            <div className="w-full h-[calc(100%-2.5rem)] border rounded-lg bg-white p-4 flex items-center justify-center">
              <div className="text-center">
                <p className="text-red-500 mb-2">Failed to load PDF</p>
                <p className="text-sm text-gray-500">{pdfError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setPdfError(null)}
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : (
            <PDFContent
              url={`https://arxiv.org/pdf/${paperId}.pdf`}
              isHighlighting={isHighlighting}
              selectedColor={selectedColor}
              onError={(error) => setPdfError(error.message)}
            />
          )}
        </div>
        
        {/* Only show resize handle on desktop */}
        <div 
          className="hidden md:flex w-2 cursor-col-resize items-center justify-center hover:bg-gray-200 active:bg-gray-300 h-full"
          onMouseDown={() => setIsResizing(true)}
          ref={resizeRef}
        >
          <GripVertical className="h-6 w-6 text-gray-400" />
        </div>
        
        {/* Summary panel with responsive width */}
        <div 
          className="h-full flex flex-col w-full md:w-auto"
          style={{ width: window.innerWidth < 768 ? '100%' : `${panelWidth}px` }}
        >
          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              className="w-full flex items-center justify-center gap-2"
              onClick={generateSummary}
              disabled={summarizing}
            >
              <Sparkles className="h-4 w-4" />
              {summarizing ? "Summarizing..." : "Generate AI Summary"}
            </Button>
          </div>
          {summary && (
            <div className="flex-1 overflow-y-auto p-3 border rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-base flex items-center">
                  <Sparkles className="h-4 w-4 mr-1 text-blue-500" />
                  AI-Generated Summary
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={copyToClipboard}
                  className="h-8 px-2 text-muted-foreground hover:text-foreground"
                >
                  {copied ? (
                    <Check className="h-4 w-4 mr-1" />
                  ) : (
                    <Copy className="h-4 w-4 mr-1" />
                  )}
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
              <div className="mt-2">
                {renderStructuredSummary(summary)}
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                <p>Note: [MATH] placeholders represent mathematical expressions in the original paper.</p>
                <p className="mt-1">To see the full paper with proper math formatting, use the "Open in New Tab" button.</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}; 
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Bookmark, Star, Trash, ExternalLink, FileText, Sparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { PdfViewer } from "./PdfViewer";

interface PaperCardProps {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  published?: string;
  journal?: string;
  year?: number;
  citations?: number;
  status?: "want-to-read" | "reading" | "read";
  onAddToList: (status: "want-to-read" | "reading" | "read") => void;
  onRemove?: () => void;
}

export const PaperCard = ({
  id,
  title,
  authors,
  abstract,
  journal,
  year,
  citations,
  status,
  onAddToList,
  onRemove,
}: PaperCardProps) => {
  const [pdfOpen, setPdfOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summary, setSummary] = useState<string>("");
  const [summarizing, setSummarizing] = useState(false);
  const { toast } = useToast();

  const statusColors = {
    "want-to-read": "bg-blue-100 text-blue-800",
    "reading": "bg-yellow-100 text-yellow-800",
    "read": "bg-green-100 text-green-800",
  };

  const arxivUrl = `https://arxiv.org/abs/${id}`;
  const pdfUrl = `https://arxiv.org/pdf/${id}.pdf`;

  const generateSummary = async () => {
    setSummarizing(true);
    try {
      const response = await fetch('http://localhost:8000/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: abstract,
          max_length: 1000,
          min_length: 40,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate summary');

      const data = await response.json();
      setSummary(data.summary);
      setSummaryOpen(true);
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

  return (
    <>
      <Card className="paper-card hover:shadow-md transition-shadow duration-200">
        <CardHeader className="space-y-2">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              {status && (
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
                  {status.replace(/-/g, " ")}
                </span>
              )}
              <h3 className="text-lg font-semibold leading-tight hover:text-primary transition-colors">{title}</h3>
            </div>
            <div className="flex gap-2">
              {onRemove && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 hover:text-destructive transition-colors"
                  onClick={onRemove}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="shrink-0 hover:text-primary transition-colors"
                  >
                    <Bookmark className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onAddToList("want-to-read")}>
                    Want to Read
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAddToList("reading")}>
                    Currently Reading
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAddToList("read")}>
                    Read
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {authors.join(", ")}
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-sm line-clamp-3">{abstract}</p>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center text-sm text-muted-foreground">
              {journal && <span>{journal}</span>}
              {year && (
                <>
                  <span className="mx-2">•</span>
                  <span>{year}</span>
                </>
              )}
              {citations !== undefined && (
                <>
                  <span className="mx-2">•</span>
                  <span>{citations} citations</span>
                </>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={generateSummary}
              disabled={summarizing}
            >
              <Sparkles className="h-4 w-4" />
              {summarizing ? "Summarizing..." : "AI Summary"}
            </Button>
          </div>
        </CardContent>
        <CardFooter className="gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => setPdfOpen(true)}
          >
            <FileText className="h-4 w-4 mr-2" />
            Read PDF
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            asChild
          >
            <a href={arxivUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              View on arXiv
            </a>
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI-Generated Summary</DialogTitle>
            <DialogDescription>
              Generated using BigBird-Pegasus model
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 text-sm">
            {summary}
          </div>
        </DialogContent>
      </Dialog>

      <PdfViewer
        open={pdfOpen}
        onOpenChange={setPdfOpen}
        paperId={id}
        abstract={abstract}
      />
    </>
  );
};

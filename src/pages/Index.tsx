
import { useState } from "react";
import { PaperCard } from "@/components/PaperCard";
import { SearchBar } from "@/components/SearchBar";
import { Button } from "@/components/ui/button";
import { Grid, List } from "lucide-react";

// Mock data for initial display
const mockPapers = [
  {
    title: "Deep Learning: A Comprehensive Survey",
    authors: ["John Smith", "Jane Doe"],
    abstract: "This comprehensive survey explores the fundamental concepts and recent advances in deep learning, covering various architectures, training methods, and applications across different domains.",
    journal: "Journal of Machine Learning Research",
    year: 2023,
    citations: 156,
    status: "reading" as const,
  },
  {
    title: "Quantum Computing: Present and Future",
    authors: ["Alice Johnson", "Bob Wilson"],
    abstract: "An in-depth analysis of the current state of quantum computing technology and its potential implications for future computational capabilities.",
    journal: "Nature Physics",
    year: 2023,
    citations: 89,
    status: "want-to-read" as const,
  },
  {
    title: "Climate Change: Global Impact Assessment",
    authors: ["Maria Garcia", "David Chen"],
    abstract: "A systematic review of climate change impacts across different regions, examining environmental, social, and economic consequences.",
    journal: "Environmental Science",
    year: 2022,
    citations: 234,
    status: "read" as const,
  },
  {
    title: "Neural Networks in Medicine",
    authors: ["Sarah Lee", "Michael Brown"],
    abstract: "A detailed exploration of neural network applications in medical diagnosis and treatment planning.",
    journal: "Medical AI Review",
    year: 2023,
    citations: 45,
    status: "reading" as const,
  },
];

const Index = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const readingPapers = mockPapers.filter(paper => paper.status === "reading");
  const readPapers = mockPapers.filter(paper => paper.status === "read");
  const wantToReadPapers = mockPapers.filter(paper => paper.status === "want-to-read");

  const PaperSection = ({ title, papers }: { title: string; papers: typeof mockPapers }) => (
    <section className="mb-12">
      <h2 className="text-2xl font-semibold mb-6 text-left">{title}</h2>
      <div
        className={`grid gap-6 ${
          viewMode === "grid"
            ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            : "grid-cols-1"
        }`}
      >
        {papers.map((paper, index) => (
          <PaperCard key={index} {...paper} />
        ))}
      </div>
    </section>
  );

  return (
    <div className="min-h-screen bg-background p-6 animate-fade-in">
      <header className="max-w-7xl mx-auto space-y-6 mb-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-semibold">Scientific Paper Library</h1>
          <p className="text-muted-foreground">
            Discover, organize, and track your academic reading
          </p>
        </div>
        <SearchBar />
        <div className="flex justify-end gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        {readingPapers.length > 0 && (
          <PaperSection title="Currently Reading" papers={readingPapers} />
        )}
        {wantToReadPapers.length > 0 && (
          <PaperSection title="Want to Read" papers={wantToReadPapers} />
        )}
        {readPapers.length > 0 && (
          <PaperSection title="Read" papers={readPapers} />
        )}
      </main>
    </div>
  );
};

export default Index;

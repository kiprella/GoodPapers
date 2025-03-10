import { useState, useEffect } from "react";
import { PaperCard } from "@/components/PaperCard";
import { SearchBar } from "@/components/SearchBar";
import { Button } from "@/components/ui/button";
import { Grid, List, ArrowLeft, X, Filter } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STORAGE_KEY = "scientific-paper-library";

interface ArxivPaper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  published: string;
  status?: "want-to-read" | "reading" | "read" ;
  dateAdded?: string;
}

const Index = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [papers, setPapers] = useState<ArxivPaper[]>([]);
  const [myPapers, setMyPapers] = useState<ArxivPaper[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(myPapers));
  }, [myPapers]);

  const searchArxiv = async (query: string) => {
    setLoading(true);
    
    try {
      const response = await fetch(
        `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=10`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch papers');
      }

      const data = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(data, 'text/xml');
      
      const entries = xmlDoc.getElementsByTagName('entry');
      const parsedPapers = Array.from(entries).map((entry) => ({
        id: entry.getElementsByTagName('id')[0]?.textContent?.split('/abs/')[1] || '',
        title: entry.getElementsByTagName('title')[0]?.textContent || '',
        authors: Array.from(entry.getElementsByTagName('author')).map(
          (author) => author.getElementsByTagName('name')[0]?.textContent || ''
        ),
        abstract: entry.getElementsByTagName('summary')[0]?.textContent || '',
        published: entry.getElementsByTagName('published')[0]?.textContent || '',
      }));

      setPapers(parsedPapers);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch papers. Please try again.",
      });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addToList = (paper: ArxivPaper, status: "want-to-read" | "reading" | "read") => {
    const existingPaper = myPapers.find(p => p.id === paper.id);
    const now = new Date().toISOString();
    
    if (existingPaper) {
      setMyPapers(myPapers.map(p => 
        p.id === paper.id ? { ...p, status, dateAdded: p.dateAdded || now } : p
      ));
      toast({
        title: "Updated",
        description: `Paper moved to ${status.replace(/-/g, " ")} list`,
      });
    } else {
      setMyPapers([...myPapers, { ...paper, status, dateAdded: now }]);
      toast({
        title: "Added",
        description: `Paper added to ${status.replace(/-/g, " ")} list`,
      });
    }
  };

  const removeFromList = (paperId: string) => {
    setMyPapers(myPapers.filter(p => p.id !== paperId));
    toast({
      title: "Removed",
      description: "Paper removed from your lists",
    });
  };

  const sortedPapers = (papers: ArxivPaper[]) => {
    return [...papers].sort((a, b) => {
      const dateA = a.dateAdded || '';
      const dateB = b.dateAdded || '';
      return dateB.localeCompare(dateA);
    });
  };

  const readingPapers = sortedPapers(myPapers.filter(paper => paper.status === "reading"));
  const readPapers = sortedPapers(myPapers.filter(paper => paper.status === "read"));
  const wantToReadPapers = sortedPapers(myPapers.filter(paper => paper.status === "want-to-read"));

  const applyFilters = (papers: ArxivPaper[]) => {
    return papers.filter(paper => 
      (filter === "all" || 
       paper.title.toLowerCase().includes(filter.toLowerCase()) ||
       paper.abstract.toLowerCase().includes(filter.toLowerCase()) ||
       paper.authors.some(author => author.toLowerCase().includes(filter.toLowerCase()))) &&
      (statusFilter === "all" || paper.status === statusFilter)
    );
  };

  const filteredPapers = applyFilters(myPapers);
  
  const filteredReadingPapers = filteredPapers.filter(paper => paper.status === "reading");
  const filteredWantToReadPapers = filteredPapers.filter(paper => paper.status === "want-to-read");
  const filteredReadPapers = filteredPapers.filter(paper => paper.status === "read");

  const PaperSection = ({ title, papers }: { title: string; papers: ArxivPaper[] }) => (
    <section className="mb-12">
      <h2 className="text-2xl font-semibold mb-6 text-left">{title}</h2>
      <div
        className={`grid gap-6 ${
          viewMode === "grid"
            ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            : "grid-cols-1"
        }`}
      >
        {papers.map((paper) => (
          <PaperCard 
            key={paper.id} 
            {...paper} 
            onAddToList={(status) => addToList(paper, status)}
            onRemove={paper.status ? () => removeFromList(paper.id) : undefined}
          />
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
        <SearchBar onSearch={searchArxiv} />
        <div className="flex justify-between items-center">
          {papers.length > 0 && (
            <Button
              variant="ghost"
              className="flex items-center gap-2"
              onClick={() => setPapers([])}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          )}
          <div className="flex gap-2">
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
        </div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Your Papers</h2>
          <div className="flex gap-3 items-center">
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="want-to-read">Want to Read</SelectItem>
                <SelectItem value="reading">Currently Reading</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
            
          
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        {loading && (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
        {papers.length > 0 && (
          <PaperSection title="Search Results" papers={papers} />
        )}
        {myPapers.length > 0 && filteredPapers.length === 0 && (
          <div className="text-center py-10">
            <p className="text-muted-foreground">No papers match your filters</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => {
                setFilter("all");
                setStatusFilter("all");
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}
        {filteredReadingPapers.length > 0 && (
          <PaperSection title="Currently Reading" papers={filteredReadingPapers} />
        )}
        {filteredWantToReadPapers.length > 0 && (
          <PaperSection title="Want to Read" papers={filteredWantToReadPapers} />
        )}
        {filteredReadPapers.length > 0 && (
          <PaperSection title="Read" papers={filteredReadPapers} />
        )}
      </main>
    </div>
  );
};

export default Index;

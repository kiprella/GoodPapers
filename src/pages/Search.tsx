import { useState } from "react";
import { SearchBar } from "@/components/SearchBar";
import { PaperCard } from "@/components/PaperCard";
import { useToast } from "@/components/ui/use-toast";

interface ArxivPaper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  published: string;
}

export const Search = () => {
  const [papers, setPapers] = useState<ArxivPaper[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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

  return (
    <div className="container mx-auto py-8 space-y-8">
      <SearchBar onSearch={searchArxiv} />
      
      {loading && (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
      
      <div className="grid gap-6 md:grid-cols-2">
        {papers.map((paper) => (
          <PaperCard
            key={paper.id}
            title={paper.title}
            authors={paper.authors}
            abstract={paper.abstract}
            journal="arXiv"
            year={new Date(paper.published).getFullYear()}
            citations={0}
          />
        ))}
      </div>
    </div>
  );
};

export default Search; 
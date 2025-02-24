
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Bookmark, Star } from "lucide-react";

interface PaperCardProps {
  title: string;
  authors: string[];
  abstract: string;
  journal: string;
  year: number;
  citations: number;
  status?: "want-to-read" | "reading" | "read";
}

export const PaperCard = ({
  title,
  authors,
  abstract,
  journal,
  year,
  citations,
  status,
}: PaperCardProps) => {
  const statusColors = {
    "want-to-read": "bg-blue-100 text-blue-800",
    "reading": "bg-yellow-100 text-yellow-800",
    "read": "bg-green-100 text-green-800",
  };

  return (
    <Card className="paper-card">
      <CardHeader className="space-y-2">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            {status && (
              <span className={`status-chip ${statusColors[status]}`}>
                {status.replace(/-/g, " ")}
              </span>
            )}
            <h3 className="text-lg font-semibold leading-tight">{title}</h3>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0">
            <Bookmark className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {authors.join(", ")}
        </p>
      </CardHeader>
      <CardContent>
        <p className="text-sm line-clamp-3">{abstract}</p>
        <div className="mt-4 flex items-center text-sm text-muted-foreground">
          <span>{journal}</span>
          <span className="mx-2">•</span>
          <span>{year}</span>
          <span className="mx-2">•</span>
          <span>{citations} citations</span>
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline" size="sm" className="flex-1">
          <BookOpen className="h-4 w-4 mr-2" />
          Read
        </Button>
        <Button variant="outline" size="sm" className="flex-1">
          <Star className="h-4 w-4 mr-2" />
          Rate
        </Button>
      </CardFooter>
    </Card>
  );
};

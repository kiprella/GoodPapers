export interface Annotation {
  id: string;
  paperId: string;
  pageNumber: number;
  content: string;
  color: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  note?: string;
  createdAt: string;
} 
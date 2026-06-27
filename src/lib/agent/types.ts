// Agent types for TripGuru LangGraph pipeline

export interface IActivity {
  time: string;
  name: string;
  description: string;
  location?: string;
  locationLink?: string;
  estimatedCost: number;
  currency: string;
  category: "hotel" | "flight" | "restaurant" | "attraction" | "transport" | "other";
  bookingUrl?: string;
  coordinates?: { lat: number; lng: number };
}

export interface IDay {
  day: number;
  date: string;
  title: string;
  activities: IActivity[];
  dailyCost: number;
}

export interface WorkerResult {
  category: "hotel" | "flight" | "restaurant" | "attraction";
  data: string;
  source: "tavily" | "groq";
  error?: string;
}

export interface GraphState {
  origin?: string;
  destination: string;
  budget: number;
  currency: string;
  startDate: string;
  endDate: string;
  preferences: string[];
  userId: string;
  workerResults: WorkerResult[];  // array — all 4 workers append here
  draft: IDay[] | null;
  totalEstimatedCost: number;
  logs: string[];
  humanFeedback: string;
  humanAction: "approve" | "reject" | "pending";
}

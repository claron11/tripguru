/**
 * TripGuru — LangGraph Multi-Agent Pipeline
 *
 * Architecture:
 *   __start__ → supervisor (deterministic, no LLM)
 *   supervisor → [hotelWorker, flightWorker, restaurantWorker, attractionWorker] (parallel via Send)
 *   all 4 workers → aggregator (fan-in join)
 *   aggregator → draftAgent (1x Gemini 2.5 Flash)
 *   draftAgent → [INTERRUPT before humanReview]
 *   humanReview → END
 */

import {
  Annotation,
  END,
  MemorySaver,
  Send,
  StateGraph,
} from "@langchain/langgraph";
import { ChatGroq } from "@langchain/groq";
import { IDay, WorkerResult } from "./types";

// ─── Tavily helper ────────────────────────────────────────────────────────────
async function tavilySearch(query: string): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("TAVILY_API_KEY not set");

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "basic",
      include_answer: true,
      max_results: 5,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Tavily ${response.status}: ${err.slice(0, 200)}`);
  }
  const data = await response.json();
  const snippets = (data.results || [])
    .map((r: { title: string; content: string; url: string }) =>
      `[${r.title}]\n${r.content}\nSource: ${r.url}`
    )
    .join("\n\n");
  return `${data.answer || ""}\n\n${snippets}`.trim();
}

// ─── Groq helper ──────────────────────────────────────────────────────────────
export function getLLM() {
  // Collect all possible keys (support comma-separated and multiple variables)
  const rawKeys = [
    ...(process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.split(",") : []),
    ...(process.env.GROQ_API_KEY_2 ? process.env.GROQ_API_KEY_2.split(",") : [])
  ].map(k => k.trim()).filter(Boolean);
  
  const uniqueKeys = Array.from(new Set(rawKeys));

  if (uniqueKeys.length === 0) {
    // Fallback if env is somehow empty, will naturally throw an auth error
    return new ChatGroq({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      maxTokens: 8000,
      maxRetries: 2,
    });
  }

  const llms = uniqueKeys.map((key) => new ChatGroq({
    model: "llama-3.3-70b-versatile",
    apiKey: key,
    temperature: 0.3,
    maxTokens: 8000,
    maxRetries: 1, // Fail fast to let the fallback mechanism try the next key
  }));

  if (llms.length === 1) {
    return llms[0];
  }

  // Create fallback chain if multiple keys exist
  return llms[0].withFallbacks({ fallbacks: llms.slice(1) });
}

// ─── State Annotation ─────────────────────────────────────────────────────────
const TripState = Annotation.Root({
  // Inputs
  origin:        Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  destination:   Annotation<string>({ reducer: (_, b) => b }),
  budget:        Annotation<number>({ reducer: (_, b) => b }),
  currency:      Annotation<string>({ reducer: (_, b) => b }),
  startDate:     Annotation<string>({ reducer: (_, b) => b }),
  endDate:       Annotation<string>({ reducer: (_, b) => b }),
  preferences:   Annotation<string[]>({ reducer: (_, b) => b }),
  numPeople:     Annotation<number>({ reducer: (_, b) => b, default: () => 1 }),
  vegetarian:    Annotation<boolean>({ reducer: (_, b) => b, default: () => false }),
  userId:        Annotation<string>({ reducer: (_, b) => b }),

  // Worker results — reducer merges partial objects so parallel writes don't overwrite each other
  workerResults: Annotation<WorkerResult[]>({
    reducer: (existing, incoming) => [...(existing || []), ...(incoming || [])],
    default: () => [],
  }),

  // Draft
  draft:               Annotation<IDay[] | null>({ reducer: (_, b) => b, default: () => null }),
  totalEstimatedCost:  Annotation<number>({ reducer: (_, b) => b, default: () => 0 }),

  // SSE logs — appended across all nodes
  logs: Annotation<string[]>({
    reducer: (existing, incoming) => [...(existing || []), ...(incoming || [])],
    default: () => [],
  }),

  // Human review
  humanFeedback: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  humanAction:   Annotation<"approve" | "reject" | "pending">({
    reducer: (_, b) => b,
    default: () => "pending",
  }),
});

type TripStateType = typeof TripState.State;

// ─── Worker Node Factory ──────────────────────────────────────────────────────
function makeWorker(
  category: "hotel" | "flight" | "restaurant" | "attraction",
  queryBuilder: (state: TripStateType) => string
) {
  return async (state: TripStateType): Promise<Partial<TripStateType>> => {
    const query = queryBuilder(state);
    const prefix = `[${category.toUpperCase()}]`;
    const logs: string[] = [`${prefix} 🔍 Searching: "${query.slice(0, 80)}..."`];

    let data = "";
    let source: "tavily" | "gemini" = "tavily";

    try {
      data = await tavilySearch(query);
      logs.push(`${prefix} ✅ Tavily returned ${data.length} chars`);
    } catch (tavilyErr) {
      logs.push(`${prefix} ⚠️ Tavily failed: ${(tavilyErr as Error).message}`);
      logs.push(`${prefix} 🤖 Falling back to Groq...`);
      source = "groq" as any;
      try {
        const llm = getLLM();
        const res = await llm.invoke(
          `Research ${category}s for a trip to ${state.destination}. Budget: ${state.currency} ${state.budget}. Dates: ${state.startDate} to ${state.endDate}. Preferences: ${state.preferences.join(", ")}. Return detailed options with names, descriptions, and prices in ${state.currency}.`
        );
        data = typeof res.content === "string" ? res.content : JSON.stringify(res.content);
        logs.push(`${prefix} ✅ Groq fallback succeeded`);
      } catch (llmErr) {
        logs.push(`${prefix} ❌ Both failed: ${(llmErr as Error).message}`);
        data = `No ${category} data available`;
      }
    }

    return {
      workerResults: [{ category, data, source }],
      logs,
    };
  };
}

// ─── Worker Nodes ─────────────────────────────────────────────────────────────
const hotelWorkerNode = makeWorker(
  "hotel",
  (s) => `Best hotels in ${s.destination} for budget ${s.currency} ${s.budget} check-in ${s.startDate} check-out ${s.endDate} preferences: ${s.preferences.join(", ")}`
);

const flightWorkerNode = makeWorker(
  "flight",
  (s) => `Cheap flights from ${s.origin || "any origin"} to ${s.destination} around ${s.startDate} returning ${s.endDate} budget ${s.currency} ${s.budget}`
);

const restaurantWorkerNode = makeWorker(
  "restaurant",
  (s) => `Best restaurants in ${s.destination} ${s.preferences.join(" ")} local food recommendations`
);

const attractionWorkerNode = makeWorker(
  "attraction",
  (s) => `Top tourist attractions things to do in ${s.destination} ${s.preferences.join(" ")} entrance fees`
);

// ─── Supervisor Node (deterministic — NO LLM) ────────────────────────────────
async function supervisorNode(state: TripStateType): Promise<Partial<TripStateType>> {
  return {
    logs: [
      `[SUPERVISOR] 🚀 Planning trip to ${state.destination}`,
      `[SUPERVISOR] 📅 ${state.startDate} → ${state.endDate} | Budget: ${state.currency} ${state.budget}`,
      `[SUPERVISOR] 🔀 Dispatching 4 parallel search workers...`,
    ],
  };
}

// Supervisor routing — fans out to all 4 workers simultaneously
function supervisorRoute(state: TripStateType): Send[] {
  return [
    new Send("hotelWorker",      state),
    new Send("flightWorker",     state),
    new Send("restaurantWorker", state),
    new Send("attractionWorker", state),
  ];
}

// ─── Aggregator Node (fan-in — waits for all 4 workers) ─────────────────────
async function aggregatorNode(state: TripStateType): Promise<Partial<TripStateType>> {
  const results = state.workerResults || [];
  return {
    logs: [
      `[AGGREGATOR] ✅ All ${results.length} workers completed`,
      `[AGGREGATOR] 📊 Sources: ${results.map(r => `${r.category}(${r.source})`).join(", ")}`,
      `[AGGREGATOR] 🔗 Passing data to Draft Agent...`,
    ],
  };
}

// ─── Draft Agent (1x Groq call) ───────────────────────────────────────────────
async function draftAgentNode(state: TripStateType): Promise<Partial<TripStateType>> {
  const logs = ["[DRAFT AGENT] 🧠 Synthesizing all research with Groq (Llama 3)..."];

  const startDate = new Date(state.startDate);
  const endDate   = new Date(state.endDate);
  const numDays   = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000));

  // Pull categorised data from workerResults
  const results = state.workerResults || [];
  const get = (cat: string) => results.find(r => r.category === cat)?.data || "No data";

  const feedbackSection = state.humanFeedback
    ? `\n\n⚠️ REVISION REQUEST: ${state.humanFeedback}\nPlease incorporate this feedback.`
    : "";

  const prompt = `You are TripGuru's expert AI travel planner. Using the research below, create a detailed ${numDays}-day itinerary for ${state.destination}.

TRIP DETAILS:
- Origin: ${state.origin || "Not specified"}
- Destination: ${state.destination}
- Number of Travelers: ${state.numPeople}
- Total Group Budget: ${state.currency} ${state.budget} (Make sure individual activity costs align with the total budget for ${state.numPeople} people)
- Dates: ${state.startDate} → ${state.endDate} (${numDays} days)
- Dietary: ${state.vegetarian ? "Strictly Vegetarian (Only recommend vegetarian or veg-friendly places)" : "No restrictions"}
- Preferences: ${state.preferences.join(", ") || "none"}
${feedbackSection}

IMPORTANT BOOKING RULES:
- BOOKING LINKS: For flights, set the \`bookingUrl\` to real platforms like IndiGo (https://www.goindigo.in), AirIndia (https://www.airindia.in), Google Flights, or MakeMyTrip. For Buses, use RedBus (https://www.redbus.in) or AbhiBus (https://www.abhibus.com). For Trains, use IRCTC (https://www.irctc.co.in). For hotels, use OYO, Agoda, Booking.com, or MakeMyTrip.
- PRICING: Estimate EXACT, realistic market prices for flights, buses, and hotels in the given currency (${state.currency}). Do not use generic numbers; provide real estimated market costs for the dates.
- TRANSPORTATION: If the origin and destination are close, prioritize Trains or Buses with connecting routes.
- COORDINATES: Provide highly accurate coordinates. If you are not 100% sure about the EXACT latitude/longitude of a specific local place (like a cafe), OMIT the "coordinates" field entirely for that activity so we do not show wrong distances.

RESEARCH DATA:
HOTELS: ${get("hotel").slice(0, 800)}

FLIGHTS: ${get("flight").slice(0, 800)}

RESTAURANTS: ${get("restaurant").slice(0, 800)}

ATTRACTIONS: ${get("attraction").slice(0, 800)}

RESPOND WITH ONLY VALID JSON — NO MARKDOWN, NO EXPLANATION:
{
  "totalEstimatedCost": <number>,
  "days": [
    {
      "day": 1,
      "date": "${state.startDate}",
      "title": "Arrival & First Impressions",
      "dailyCost": <number>,
      "activities": [
        {
          "time": "09:00",
          "name": "Activity name",
          "description": "2-3 sentence description",
          "location": "Specific place/address",
          "locationLink": "Google Maps search URL (e.g. https://www.google.com/maps/search/?api=1&query=LOCATION)",
          "coordinates": {
            "lat": <number>,
            "lng": <number>
          },
          "estimatedCost": <number>,
          "currency": "${state.currency}",
          "category": "hotel|flight|restaurant|attraction|transport|other",
          "bookingUrl": ""
        }
      ]
    }
  ]
}
Rules: Exactly ${numDays} day objects. 4-6 activities per day covering morning/afternoon/evening. Include hotel check-in on day 1, flight on day 1 and last day. Costs must sum close to ${state.budget}. Return ONLY the JSON object.`;

  try {
    const llm = getLLM();
    logs.push("[DRAFT AGENT] 📡 Calling Groq API...");

    const response = await llm.invoke(prompt);
    const rawText = typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

    // Strip markdown code fences if present
    const cleaned = rawText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    // Find the JSON object boundaries
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd   = cleaned.lastIndexOf("}");
    const jsonStr   = cleaned.slice(jsonStart, jsonEnd + 1);

    const parsed = JSON.parse(jsonStr);
    const days: IDay[] = parsed.days || [];
    
    // Dynamically calculate total cost rather than trusting LLM math
    let computedTotalCost = 0;
    days.forEach(day => {
      let dayTotal = 0;
      day.activities?.forEach(act => {
        if (typeof act.estimatedCost === "string") {
          const numStr = (act.estimatedCost as string).replace(/[^0-9.]/g, "");
          act.estimatedCost = numStr ? Math.round(parseFloat(numStr)) : 0;
        } else if (typeof act.estimatedCost !== "number") {
          act.estimatedCost = 0;
        }
        dayTotal += act.estimatedCost;
        computedTotalCost += act.estimatedCost;
      });
      day.dailyCost = dayTotal;
    });

    const totalEstimatedCost: number = computedTotalCost > 0 ? computedTotalCost : state.budget;

    logs.push(`[DRAFT AGENT] ✅ Generated ${days.length}-day itinerary`);
    logs.push(`[DRAFT AGENT] 💰 Total: ${state.currency} ${totalEstimatedCost}`);
    logs.push(`[DRAFT AGENT] ⏸️  Pausing for human review...`);

    return { draft: days, totalEstimatedCost, logs };
  } catch (err) {
    const msg = (err as Error).message;
    const is429 = msg.includes("429") || msg.includes("rate_limit") || msg.includes("Too Many Requests") || msg.includes("rate limit");
    const displayMsg = is429 ? "API ERROR - 429" : `API error occurred: ${msg}`;
    
    logs.push(`[DRAFT AGENT] ❌ Groq error: ${is429 ? "429 Rate Limit" : msg}`);
    logs.push("[DRAFT AGENT] 🔄 Generating structured fallback...");

    const fallback: IDay[] = Array.from({ length: numDays }, (_, i) => {
      const dayDate = new Date(startDate.getTime() + i * 86400000);
      return {
        day: i + 1,
        date: dayDate.toISOString().split("T")[0],
        title: i === 0 ? "Arrival Day" : i === numDays - 1 ? "Departure Day" : `Day ${i + 1} in ${state.destination}`,
        dailyCost: Math.round(state.budget / numDays),
        activities: [
          {
            time: "09:00",
            name: "Morning exploration",
            description: `Explore ${state.destination} — ${displayMsg}`,
            location: state.destination,
            locationLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(state.destination)}`,
            estimatedCost: Math.round(state.budget / numDays),
            currency: state.currency,
            category: "attraction" as const,
          },
        ],
      };
    });
    return { draft: fallback, totalEstimatedCost: state.budget, logs };
  }
}

// ─── Human Review Node ────────────────────────────────────────────────────────
// The graph is compiled with interruptBefore: ["humanReview"]
// So execution STOPS before this node runs — it only runs on resume()
async function humanReviewNode(state: TripStateType): Promise<Partial<TripStateType>> {
  // After resume, just pass through — the SSE route reads state via getState()
  return {
    humanAction: state.humanAction || "pending",
  };
}

// ─── Build & Export the Graph ─────────────────────────────────────────────────
function buildTripPlannerGraph() {
  const workflow = new StateGraph(TripState)
    .addNode("supervisor",        supervisorNode)
    .addNode("hotelWorker",       hotelWorkerNode)
    .addNode("flightWorker",      flightWorkerNode)
    .addNode("restaurantWorker",  restaurantWorkerNode)
    .addNode("attractionWorker",  attractionWorkerNode)
    .addNode("aggregator",        aggregatorNode)   // fan-in waits for all 4 workers
    .addNode("draftAgent",        draftAgentNode)
    .addNode("humanReview",       humanReviewNode)

    // Entry point
    .addEdge("__start__", "supervisor")

    // Supervisor fans out to all 4 workers in parallel via Send API
    .addConditionalEdges("supervisor", supervisorRoute, [
      "hotelWorker",
      "flightWorker",
      "restaurantWorker",
      "attractionWorker",
    ])

    // All 4 workers fan into the aggregator (LangGraph waits for all 4)
    .addEdge("hotelWorker",       "aggregator")
    .addEdge("flightWorker",      "aggregator")
    .addEdge("restaurantWorker",  "aggregator")
    .addEdge("attractionWorker",  "aggregator")

    // Aggregator → draftAgent (single call after all research is in)
    .addEdge("aggregator",  "draftAgent")
    .addEdge("draftAgent",  "humanReview")
    .addEdge("humanReview", END);

  const checkpointer = new MemorySaver();
  // interruptBefore humanReview = graph stops after draftAgent, before humanReview
  return workflow.compile({ checkpointer, interruptBefore: ["humanReview"] });
}

export const tripPlannerGraph = buildTripPlannerGraph();
export type { TripStateType };

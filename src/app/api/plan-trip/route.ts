import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { tripPlannerGraph } from "@/lib/agent/tripPlannerGraph";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.json();
  const { origin, destination, budget, currency, startDate, endDate, preferences, numPeople, vegetarian } = body;

  if (!destination || !budget || !startDate || !endDate) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const threadId = uuidv4();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // controller may be closed
        }
      };

      try {
        sendEvent({ type: "start", threadId, message: "🚀 TripGuru AI pipeline starting..." });
        sendEvent({ type: "node", node: "supervisor", message: "🧭 Supervisor routing to 4 parallel agents..." });

        const config = { configurable: { thread_id: threadId } };
        const inputState = {
          origin: origin || "",
          destination,
          budget: parseFloat(budget),
          currency: currency || "USD",
          startDate,
          endDate,
          preferences: preferences || [],
          numPeople: numPeople || 1,
          vegetarian: !!vegetarian,
          userId: session.user!.id,
          hotelData: null,
          flightData: null,
          restaurantData: null,
          attractionData: null,
          workerResults: [],
          draft: null,
          totalEstimatedCost: 0,
          logs: [],
          humanFeedback: "",
          humanAction: "pending" as const,
        };

        // Use stream with values mode to get state snapshots
        const graphStream = tripPlannerGraph.stream(inputState, {
          ...config,
          streamMode: "updates",
        });

        const seenLogs = new Set<string>();
        let lastNodeName = "";

        for await (const chunk of await graphStream) {
          // chunk is { nodeName: partialState }
          for (const [nodeName, nodeOutput] of Object.entries(chunk as Record<string, Record<string, unknown>>)) {

            // Send node transition event
            if (nodeName !== lastNodeName) {
              lastNodeName = nodeName;
              const nodeLabels: Record<string, string> = {
                supervisor:        "🧭 Supervisor dispatching parallel workers...",
                hotelWorker:       "🏨 Hotel agent searching via Tavily...",
                flightWorker:      "✈️  Flight agent searching via Tavily...",
                restaurantWorker:  "🍽️  Restaurant agent searching via Tavily...",
                attractionWorker:  "🗺️  Attraction agent searching via Tavily...",
                draftAgent:        "🧠 Draft agent synthesizing with Groq (Llama 3)...",
                humanReview:       "⏸️  Pausing for human review...",
              };
              if (nodeLabels[nodeName]) {
                sendEvent({ type: "node", node: nodeName, message: nodeLabels[nodeName] });
              }
            }

            // Stream new logs from state
            if (Array.isArray(nodeOutput?.logs)) {
              for (const log of nodeOutput.logs as string[]) {
                if (!seenLogs.has(log)) {
                  seenLogs.add(log);
                  sendEvent({ type: "log", message: log });
                }
              }
            }
          }
        }

        // After stream ends (graph interrupted at humanReview), get the saved state
        sendEvent({ type: "log", message: "⏸️  Pipeline paused — fetching draft from state..." });

        const savedState = await tripPlannerGraph.getState(config);
        const draft = savedState.values?.draft ?? null;
        const totalEstimatedCost = savedState.values?.totalEstimatedCost ?? 0;
        const stateLogs: string[] = savedState.values?.logs ?? [];

        // Send any remaining logs we haven't sent yet
        for (const log of stateLogs) {
          if (!seenLogs.has(log)) {
            seenLogs.add(log);
            sendEvent({ type: "log", message: log });
          }
        }

        if (!draft || draft.length === 0) {
          sendEvent({
            type: "error",
            message: "❌ Draft generation failed — Groq returned no itinerary. Check API key and try again.",
          });
        } else {
          sendEvent({
            type: "complete",
            threadId,
            draft,
            totalEstimatedCost,
            message: `✅ ${draft.length}-day itinerary ready for your review!`,
          });
        }
      } catch (err) {
        const msg = (err as Error).message || "Unknown error";
        console.error("[plan-trip] Pipeline error:", err);
        sendEvent({ type: "error", message: `❌ Pipeline error: ${msg}` });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

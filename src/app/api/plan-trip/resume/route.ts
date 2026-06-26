import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { tripPlannerGraph } from "@/lib/agent/tripPlannerGraph";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    threadId, action, feedback, draft,
    totalEstimatedCost, origin, destination, budget,
    currency, startDate, endDate, preferences,
  } = body;

  if (!threadId || !action) {
    return NextResponse.json({ error: "threadId and action are required" }, { status: 400 });
  }

  // ─── APPROVE ──────────────────────────────────────────────────────────────
  if (action === "approve") {
    try {
      const trip = await prisma.trip.create({
        data: {
          userId: session.user.id,
          origin: origin || null,
          destination,
          budget: parseFloat(budget),
          currency: currency || "USD",
          startDate,
          endDate,
          preferences: JSON.stringify(preferences || []),
          itinerary: JSON.stringify(draft || []),
          status: "FINALIZED",
          totalEstimatedCost: parseFloat(totalEstimatedCost) || parseFloat(budget),
        },
      });
      return NextResponse.json({ success: true, trip, message: "Trip saved!" });
    } catch (err) {
      return NextResponse.json({ error: `Failed to save: ${(err as Error).message}` }, { status: 500 });
    }
  }

  // ─── REJECT (re-run draftAgent with feedback) ─────────────────────────────
  if (action === "reject") {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: Record<string, unknown>) => {
          try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)); }
          catch { /* closed */ }
        };

        try {
          const config = { configurable: { thread_id: threadId } };

          sendEvent({ type: "log", message: `[REVISION] 🔄 Incorporating your feedback...` });
          sendEvent({ type: "node", node: "draftAgent", message: "🧠 Re-generating with Groq (Llama 3)..." });

          // Resume the interrupted graph with human input
          const graphStream = tripPlannerGraph.stream(
            { humanAction: "reject", humanFeedback: feedback || "" },
            { ...config, streamMode: "updates" }
          );

          const seenLogs = new Set<string>();

          for await (const chunk of await graphStream) {
            for (const [, nodeOutput] of Object.entries(chunk as Record<string, Record<string, unknown>>)) {
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

          // Get updated state after re-run
          const savedState = await tripPlannerGraph.getState(config);
          const newDraft = savedState.values?.draft ?? null;
          const newCost = savedState.values?.totalEstimatedCost ?? 0;

          if (!newDraft || newDraft.length === 0) {
            sendEvent({ type: "error", message: "❌ Revision failed — no itinerary generated." });
          } else {
            sendEvent({
              type: "complete",
              threadId,
              draft: newDraft,
              totalEstimatedCost: newCost,
              message: `✅ Revised ${newDraft.length}-day itinerary ready!`,
            });
          }
        } catch (err) {
          sendEvent({ type: "error", message: `❌ Revision error: ${(err as Error).message}` });
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

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

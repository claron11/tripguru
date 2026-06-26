import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const trips = await prisma.trip.findMany({
      where: {
        userId: session.user.id,
        status: "FINALIZED",
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        destination: true,
        budget: true,
        currency: true,
        startDate: true,
        endDate: true,
        preferences: true,
        itinerary: true,
        status: true,
        totalEstimatedCost: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ trips });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to fetch trips: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}

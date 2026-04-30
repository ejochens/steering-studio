import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

/**
 * Test-only endpoint to reset the database between e2e test runs.
 * Only available in development mode.
 */
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  await prisma.project.deleteMany();
  await prisma.providerConnection.deleteMany();

  return NextResponse.json({ ok: true });
}

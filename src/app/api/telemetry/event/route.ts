import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const ALLOWED_EVENTS = new Set(["upgrade_page_view", "upgrade_cta_click"]);

function normalizeProperties(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = body as { eventName?: unknown; properties?: unknown };
  const eventName = parsed?.eventName;
  if (typeof eventName !== "string" || !ALLOWED_EVENTS.has(eventName)) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  const properties = normalizeProperties(parsed?.properties);

  // Best-effort user attribution. This endpoint is intentionally non-blocking.
  const session = await auth().catch(() => null);

  console.info(
    "[telemetry]",
    JSON.stringify({
      eventName,
      userId: session?.user?.id ?? null,
      ts: new Date().toISOString(),
      properties,
    })
  );

  return NextResponse.json({ ok: true });
}

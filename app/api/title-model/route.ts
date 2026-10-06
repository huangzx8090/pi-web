import { NextResponse } from "next/server";
import { hasJsonContentType, isApiRequestAllowed } from "@/lib/request-security";
import { writeTitleModel, type TitleModelRef } from "@/lib/title-model";

export const dynamic = "force-dynamic";

function parseTitleModel(body: { provider?: unknown; modelId?: unknown }): TitleModelRef | null | undefined {
  const { provider, modelId } = body;
  if ((provider === null || provider === undefined) && (modelId === null || modelId === undefined)) {
    return null;
  }
  if (
    typeof provider === "string" && provider.trim().length > 0
    && typeof modelId === "string" && modelId.trim().length > 0
  ) {
    return { provider: provider.trim(), modelId: modelId.trim() };
  }
  return undefined;
}

/**
 * Write the model used to generate session titles. `null` clears it, which
 * means "name with the session's own model". Reads come from
 * `/api/default-model`, which returns both settings in one round trip.
 */
export async function PUT(req: Request) {
  if (!isApiRequestAllowed(req)) {
    return NextResponse.json({ error: "Untrusted API request" }, { status: 403 });
  }
  if (!hasJsonContentType(req)) {
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }

  try {
    const body = await req.json() as { provider?: unknown; modelId?: unknown };
    const model = parseTitleModel(body);
    if (model === undefined) {
      return NextResponse.json(
        { error: "provider and modelId must both be non-empty strings, or both null to clear" },
        { status: 400 },
      );
    }
    const titleModel = await writeTitleModel(model);
    return NextResponse.json({ titleModel });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

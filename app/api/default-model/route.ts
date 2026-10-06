import { NextResponse } from "next/server";
import { readDefaultModel, writeDefaultModel, type DefaultModelRef } from "@/lib/default-model";
import { invalidateModelsCache } from "@/lib/models-cache";
import { listGlobalModels } from "@/lib/model-options";
import { hasJsonContentType, isApiRequestAllowed } from "@/lib/request-security";
import { readTitleModel, type TitleModelRef } from "@/lib/title-model";

export const dynamic = "force-dynamic";

function parseModelRef(body: { provider?: unknown; modelId?: unknown }): DefaultModelRef | null | undefined {
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
 * Read both model settings in one round trip: the settings panel renders them
 * side by side, and they share the same option list. Writes stay split
 * (`/api/default-model` and `/api/title-model`) because they touch different
 * files owned by different processes.
 */
export async function GET() {
  let defaultModel: DefaultModelRef | null = null;
  try {
    defaultModel = readDefaultModel();
  } catch {
    // A malformed settings file leaves no readable default; PUT still refuses
    // to overwrite it.
  }
  let titleModel: TitleModelRef | null = null;
  try {
    titleModel = readTitleModel();
  } catch {
    // Same reasoning as above: a broken pi-web settings.json must not make the
    // rest of the settings panel unreadable.
  }
  try {
    return NextResponse.json({
      defaultModel,
      titleModel,
      modelList: await listGlobalModels(),
    });
  } catch {
    // A broken model configuration must not make the setting unreadable.
    return NextResponse.json({ defaultModel, titleModel, modelList: [] });
  }
}

export async function PUT(req: Request) {
  if (!isApiRequestAllowed(req)) {
    return NextResponse.json({ error: "Untrusted API request" }, { status: 403 });
  }
  if (!hasJsonContentType(req)) {
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }

  try {
    const body = await req.json() as { provider?: unknown; modelId?: unknown };
    const model = parseModelRef(body);
    if (model === undefined) {
      return NextResponse.json(
        { error: "provider and modelId must both be non-empty strings, or both null to clear" },
        { status: 400 },
      );
    }
    const defaultModel = await writeDefaultModel(model);
    invalidateModelsCache();
    return NextResponse.json({ defaultModel });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

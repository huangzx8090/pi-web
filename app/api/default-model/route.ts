import { NextResponse } from "next/server";
import { createAgentSessionServices, getAgentDir } from "@earendil-works/pi-coding-agent";
import { resolveVisibleModels } from "@/lib/model-scope";
import { readDefaultModel, writeDefaultModel, type DefaultModelRef } from "@/lib/default-model";
import { invalidateModelsCache } from "@/lib/models-cache";
import { hasJsonContentType, isApiRequestAllowed } from "@/lib/request-security";

export const dynamic = "force-dynamic";

const modelNameCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

interface DefaultModelOption {
  id: string;
  name: string;
  provider: string;
  input?: string[];
}

function compareModelOptions(a: DefaultModelOption, b: DefaultModelOption): number {
  return modelNameCollator.compare(a.name || a.id, b.name || b.id)
    || modelNameCollator.compare(a.provider, b.provider)
    || modelNameCollator.compare(a.id, b.id);
}

/**
 * List the models the global default can point at. The agent dir is used as
 * cwd so project-local extensions cannot change the global default's options;
 * `enabledModels` is still applied, matching what a new session can select.
 */
async function listGlobalModels(): Promise<DefaultModelOption[]> {
  const agentDir = getAgentDir();
  const services = await createAgentSessionServices({ cwd: agentDir, agentDir });
  const scope = await resolveVisibleModels(
    services.modelRuntime,
    services.settingsManager.getEnabledModels(),
  );
  return scope.visible
    .map((model) => ({
      id: model.id,
      name: model.name,
      provider: model.provider,
      ...(model.input ? { input: model.input } : {}),
    }))
    .sort(compareModelOptions);
}

function parseDefaultModel(body: { provider?: unknown; modelId?: unknown }): DefaultModelRef | null | undefined {
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

export async function GET() {
  let defaultModel: DefaultModelRef | null = null;
  try {
    defaultModel = readDefaultModel();
  } catch {
    // A malformed settings file leaves no readable default; PUT still refuses
    // to overwrite it.
  }
  try {
    return NextResponse.json({ defaultModel, modelList: await listGlobalModels() });
  } catch {
    // A broken model configuration must not make the setting unreadable.
    return NextResponse.json({ defaultModel, modelList: [] });
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
    const model = parseDefaultModel(body);
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

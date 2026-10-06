import { createAgentSessionServices, getAgentDir } from "@earendil-works/pi-coding-agent";
import { resolveVisibleModels } from "@/lib/model-scope";

const modelNameCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export interface GlobalModelOption {
  id: string;
  name: string;
  provider: string;
  input?: string[];
}

export function compareGlobalModelOptions(a: GlobalModelOption, b: GlobalModelOption): number {
  return modelNameCollator.compare(a.name || a.id, b.name || b.id)
    || modelNameCollator.compare(a.provider, b.provider)
    || modelNameCollator.compare(a.id, b.id);
}

/**
 * List the models a global setting can point at. The agent dir is used as cwd
 * so project-local extensions cannot change the options; `enabledModels` is
 * still applied, matching what a new session can select. Shared by the default
 * model and title model settings so both offer the same list.
 */
export async function listGlobalModels(): Promise<GlobalModelOption[]> {
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
    .sort(compareGlobalModelOptions);
}

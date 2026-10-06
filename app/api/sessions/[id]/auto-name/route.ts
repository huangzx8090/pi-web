import { NextResponse } from "next/server";
import type { AgentSession } from "@earendil-works/pi-coding-agent";
import type { Api, Model } from "@earendil-works/pi-ai";
import type { AgentSessionLike } from "@/lib/pi-types";
import { generateSessionTitle } from "@/lib/session-title";
import { readTitleModel } from "@/lib/title-model";
import { getRpcSession, startRpcSession } from "@/lib/rpc-manager";
import { invalidateSessionListCache, resolveSessionPath } from "@/lib/session-reader";

/**
 * Map the configured title model onto the session's own runtime, so the request
 * inherits the credentials and provider settings the session already has.
 * Anything unresolvable (a model that was renamed, a malformed settings file, a
 * ref the runtime has not loaded) falls back to the session model rather than
 * failing the request: a title is not worth an error.
 */
function resolveTitleModel(session: AgentSessionLike): Model<Api> | undefined {
  let ref: { provider: string; modelId: string } | null = null;
  try {
    ref = readTitleModel();
  } catch {
    return undefined;
  }
  if (!ref) return undefined;
  const model = session.modelRuntime.getModel(ref.provider, ref.modelId);
  return model ? (model as Model<Api>) : undefined;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const filePath = await resolveSessionPath(id);
    if (!filePath) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const existing = getRpcSession(id);
    const { session } = existing?.isAlive()
      ? { session: existing }
      : await startRpcSession(id, filePath, undefined);

    // globalThis keeps wrappers alive across dev hot reloads; older instances
    // may predate waitUntilReady(), but those have already completed startup.
    await session.waitUntilReady?.();
    const titleModel = resolveTitleModel(session.inner);
    const inner = session.inner as unknown as AgentSession;
    const result = await generateSessionTitle(inner, titleModel ? { model: titleModel } : {});

    if (!session.isAlive()) {
      return NextResponse.json(
        { error: "The session was closed while its title was being generated. Please try again." },
        { status: 409 },
      );
    }

    session.inner.setSessionName(result.title);
    invalidateSessionListCache();
    return NextResponse.json({ title: result.title, usage: result.usage ?? null });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

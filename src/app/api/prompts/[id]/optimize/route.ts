import { optimizePromptWithDeepSeek } from "@/lib/deepseek";
import {
  getLibrary,
  saveOptimization,
  updatePrompt,
} from "@/lib/prompt-repository";
import { jsonError, jsonOk, parseId } from "@/lib/api";
import type { PromptInput } from "@/lib/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const promptId = parseId(id);
    const body = (await request.json()) as PromptInput & { saveAsPrompt?: boolean };
    const result = await optimizePromptWithDeepSeek(body.body);

    await saveOptimization(
      promptId,
      body.body,
      result.optimizedBody,
      result.notes,
      result.model,
    );

    if (body.saveAsPrompt) {
      await updatePrompt(promptId, {
        ...body,
        body: result.optimizedBody,
        summary: body.summary || result.notes,
      });
    }

    return jsonOk({ library: await getLibrary(), result });
  } catch (error) {
    return jsonError(error, 400);
  }
}

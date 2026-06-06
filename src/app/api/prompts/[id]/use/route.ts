import { getLibrary, markPromptUsed } from "@/lib/prompt-repository";
import { jsonError, jsonOk, parseId } from "@/lib/api";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await markPromptUsed(parseId(id));
    return jsonOk(await getLibrary());
  } catch (error) {
    return jsonError(error, 400);
  }
}

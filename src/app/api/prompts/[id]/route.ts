import {
  deletePrompt,
  getLibrary,
  updatePrompt,
} from "@/lib/prompt-repository";
import { jsonError, jsonOk, parseId } from "@/lib/api";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await updatePrompt(parseId(id), await request.json());
    return jsonOk(await getLibrary());
  } catch (error) {
    return jsonError(error, 400);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await deletePrompt(parseId(id));
    return jsonOk(await getLibrary());
  } catch (error) {
    return jsonError(error, 400);
  }
}

import { createPrompt, getLibrary } from "@/lib/prompt-repository";
import { jsonError, jsonOk } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const input = await request.json();
    await createPrompt(input);
    return jsonOk(await getLibrary(), { status: 201 });
  } catch (error) {
    return jsonError(error, 400);
  }
}

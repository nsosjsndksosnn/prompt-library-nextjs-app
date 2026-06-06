import { getLibrary, importLibrary } from "@/lib/prompt-repository";
import { jsonError, jsonOk } from "@/lib/api";

export async function POST(request: Request) {
  try {
    await importLibrary(await request.json());
    return jsonOk(await getLibrary());
  } catch (error) {
    return jsonError(error, 400);
  }
}

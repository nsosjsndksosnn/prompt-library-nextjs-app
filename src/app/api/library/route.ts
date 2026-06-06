import { getLibrary } from "@/lib/prompt-repository";
import { jsonError, jsonOk } from "@/lib/api";

export async function GET() {
  try {
    return jsonOk(await getLibrary());
  } catch (error) {
    return jsonError(error);
  }
}

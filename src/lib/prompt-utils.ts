import type { Prompt } from "@/lib/types";

export type PromptFilter = {
  query: string;
  folderId: number | "all" | "favorites";
};

export function listToText(value: string[] | undefined) {
  return value?.join(", ") ?? "";
}

export function textToList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function filterPrompts(prompts: Prompt[], filter: PromptFilter) {
  const query = filter.query.trim().toLowerCase();

  return prompts.filter((prompt) => {
    const matchesFolder =
      filter.folderId === "all" ||
      (filter.folderId === "favorites" && prompt.favorite) ||
      prompt.folderId === filter.folderId;

    if (!matchesFolder) {
      return false;
    }

    if (!query) {
      return true;
    }

    return [
      prompt.title,
      prompt.body,
      prompt.summary,
      prompt.folderName,
      prompt.tags.join(","),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
}

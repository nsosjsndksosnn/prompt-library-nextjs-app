import { describe, expect, it } from "vitest";
import { filterPrompts, textToList } from "@/lib/prompt-utils";
import type { Prompt } from "@/lib/types";

const prompts: Prompt[] = [
  {
    id: 1,
    folderId: 10,
    folderName: "Developer Assistant",
    title: "Code Review Prompt",
    body: "Review code and rank findings by severity.",
    summary: "Review helper",
    tags: ["development", "quality"],
    variables: ["code"],
    favorite: true,
    lastUsedAt: null,
    createdAt: "2026-06-06T00:00:00.000Z",
    updatedAt: "2026-06-06T00:00:00.000Z",
  },
  {
    id: 2,
    folderId: 20,
    folderName: "General Prompts",
    title: "Summary Prompt",
    body: "Summarize content in Chinese.",
    summary: null,
    tags: ["writing"],
    variables: ["content"],
    favorite: false,
    lastUsedAt: null,
    createdAt: "2026-06-06T00:00:00.000Z",
    updatedAt: "2026-06-06T00:00:00.000Z",
  },
];

describe("prompt utilities", () => {
  it("parses comma-separated fields and removes empty entries", () => {
    expect(textToList(" code, review, ,quality ")).toEqual([
      "code",
      "review",
      "quality",
    ]);
  });

  it("filters prompts by full text query", () => {
    expect(filterPrompts(prompts, { query: "severity", folderId: "all" })).toHaveLength(1);
    expect(filterPrompts(prompts, { query: "writing", folderId: "all" })[0].id).toBe(2);
  });

  it("filters prompts by folder and favorites", () => {
    expect(filterPrompts(prompts, { query: "", folderId: 10 })[0].id).toBe(1);
    expect(filterPrompts(prompts, { query: "", folderId: "favorites" })[0].id).toBe(1);
  });
});

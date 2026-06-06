import "server-only";

export type DeepSeekResult = {
  optimizedBody: string;
  notes: string;
  model: string;
};

export async function optimizePromptWithDeepSeek(promptBody: string) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const model = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";

  if (!apiKey) {
    throw new Error("Missing required environment variable: DEEPSEEK_API_KEY");
  }

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "你是提示词工程专家。请优化用户给出的提示词，使它目标清晰、约束明确、输出格式稳定。只返回 JSON。",
        },
        {
          role: "user",
          content: `请优化这个提示词，并返回 JSON：{"optimizedBody":"优化后的完整提示词","notes":"改进说明"}\n\n${promptBody}`,
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `DeepSeek API request failed: ${response.status} ${errorText}`,
    );
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("DeepSeek API did not return message content");
  }

  try {
    const parsed = JSON.parse(content);
    return {
      optimizedBody: String(parsed.optimizedBody ?? promptBody),
      notes: String(parsed.notes ?? "已优化提示词结构。"),
      model,
    } satisfies DeepSeekResult;
  } catch {
    return {
      optimizedBody: String(content),
      notes: "模型返回了非 JSON 内容，已作为优化结果保存。",
      model,
    } satisfies DeepSeekResult;
  }
}

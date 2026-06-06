import "server-only";
import oracledb from "oracledb";
import { toDateString, withConnection } from "@/lib/oracle";
import type {
  Folder,
  FolderInput,
  LibraryPayload,
  Optimization,
  Prompt,
  PromptInput,
} from "@/lib/types";

type Row = Record<string, unknown>;

function splitList(value: unknown) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinList(value: string[] | undefined) {
  return value?.map((item) => item.trim()).filter(Boolean).join(",") ?? null;
}

function outNumberBind() {
  return { dir: oracledb.BIND_OUT, type: oracledb.NUMBER };
}

function mapFolder(row: Row): Folder {
  return {
    id: Number(row.ID),
    name: String(row.NAME),
    description: row.DESCRIPTION ? String(row.DESCRIPTION) : null,
    promptCount: Number(row.PROMPT_COUNT ?? 0),
    createdAt: toDateString(row.CREATED_AT) ?? "",
    updatedAt: toDateString(row.UPDATED_AT) ?? "",
  };
}

function mapPrompt(row: Row): Prompt {
  return {
    id: Number(row.ID),
    folderId: row.FOLDER_ID === null ? null : Number(row.FOLDER_ID),
    folderName: row.FOLDER_NAME ? String(row.FOLDER_NAME) : null,
    title: String(row.TITLE),
    body: String(row.BODY ?? ""),
    summary: row.SUMMARY ? String(row.SUMMARY) : null,
    tags: splitList(row.TAGS),
    variables: splitList(row.VARIABLES),
    favorite: Number(row.FAVORITE ?? 0) === 1,
    lastUsedAt: toDateString(row.LAST_USED_AT),
    createdAt: toDateString(row.CREATED_AT) ?? "",
    updatedAt: toDateString(row.UPDATED_AT) ?? "",
  };
}

function mapOptimization(row: Row): Optimization {
  return {
    id: Number(row.ID),
    promptId: Number(row.PROMPT_ID),
    originalBody: String(row.ORIGINAL_BODY ?? ""),
    optimizedBody: String(row.OPTIMIZED_BODY ?? ""),
    notes: row.NOTES ? String(row.NOTES) : null,
    provider: String(row.PROVIDER),
    modelName: row.MODEL_NAME ? String(row.MODEL_NAME) : null,
    createdAt: toDateString(row.CREATED_AT) ?? "",
  };
}

function validatePrompt(input: PromptInput) {
  if (!input.title?.trim()) {
    throw new Error("提示词标题不能为空");
  }

  if (!input.body?.trim()) {
    throw new Error("提示词内容不能为空");
  }
}

export async function getLibrary(): Promise<LibraryPayload> {
  return withConnection(async (connection) => {
    const [folderResult, promptResult, optimizationResult] = await Promise.all([
      connection.execute<Row>(
        `SELECT f.id,
                f.name,
                f.description,
                f.created_at,
                f.updated_at,
                COUNT(p.id) AS prompt_count
           FROM prompt_folders f
           LEFT JOIN prompts p ON p.folder_id = f.id
          GROUP BY f.id, f.name, f.description, f.created_at, f.updated_at
          ORDER BY LOWER(f.name)`,
      ),
      connection.execute<Row>(
        `SELECT p.id,
                p.folder_id,
                f.name AS folder_name,
                p.title,
                p.body,
                p.summary,
                p.tags,
                p.variables,
                p.favorite,
                p.last_used_at,
                p.created_at,
                p.updated_at
           FROM prompts p
           LEFT JOIN prompt_folders f ON f.id = p.folder_id
          ORDER BY p.favorite DESC, p.updated_at DESC`,
      ),
      connection.execute<Row>(
        `SELECT id,
                prompt_id,
                original_body,
                optimized_body,
                notes,
                provider,
                model_name,
                created_at
           FROM prompt_optimizations
          ORDER BY created_at DESC
          FETCH FIRST 30 ROWS ONLY`,
      ),
    ]);

    return {
      folders: (folderResult.rows ?? []).map(mapFolder),
      prompts: (promptResult.rows ?? []).map(mapPrompt),
      optimizations: (optimizationResult.rows ?? []).map(mapOptimization),
    };
  });
}

export async function createFolder(input: FolderInput) {
  if (!input.name?.trim()) {
    throw new Error("文件夹名称不能为空");
  }

  return withConnection(async (connection) => {
    const result = await connection.execute<Row>(
      `INSERT INTO prompt_folders (name, description)
       VALUES (:name, :description)
       RETURNING id INTO :id`,
      {
        name: input.name.trim(),
        description: input.description?.trim() || null,
        id: outNumberBind(),
      },
      { autoCommit: true },
    );

    return Number(result.outBinds?.id?.[0]);
  });
}

export async function createPrompt(input: PromptInput) {
  validatePrompt(input);

  return withConnection(async (connection) => {
    const result = await connection.execute<Row>(
      `INSERT INTO prompts (folder_id, title, body, summary, tags, variables, favorite)
       VALUES (:folderId, :title, :body, :summary, :tags, :variables, :favorite)
       RETURNING id INTO :id`,
      {
        folderId: input.folderId ?? null,
        title: input.title.trim(),
        body: input.body.trim(),
        summary: input.summary?.trim() || null,
        tags: joinList(input.tags),
        variables: joinList(input.variables),
        favorite: input.favorite ? 1 : 0,
        id: outNumberBind(),
      },
      { autoCommit: true },
    );

    return Number(result.outBinds?.id?.[0]);
  });
}

export async function updatePrompt(id: number, input: PromptInput) {
  validatePrompt(input);

  return withConnection(async (connection) => {
    await connection.execute(
      `UPDATE prompts
          SET folder_id = :folderId,
              title = :title,
              body = :body,
              summary = :summary,
              tags = :tags,
              variables = :variables,
              favorite = :favorite,
              updated_at = SYSTIMESTAMP
        WHERE id = :id`,
      {
        id,
        folderId: input.folderId ?? null,
        title: input.title.trim(),
        body: input.body.trim(),
        summary: input.summary?.trim() || null,
        tags: joinList(input.tags),
        variables: joinList(input.variables),
        favorite: input.favorite ? 1 : 0,
      },
      { autoCommit: true },
    );
  });
}

export async function deletePrompt(id: number) {
  return withConnection(async (connection) => {
    await connection.execute(
      `DELETE FROM prompts WHERE id = :id`,
      { id },
      { autoCommit: true },
    );
  });
}

export async function markPromptUsed(id: number) {
  return withConnection(async (connection) => {
    await connection.execute(
      `UPDATE prompts
          SET last_used_at = SYSTIMESTAMP,
              updated_at = SYSTIMESTAMP
        WHERE id = :id`,
      { id },
      { autoCommit: true },
    );
  });
}

export async function saveOptimization(
  promptId: number,
  originalBody: string,
  optimizedBody: string,
  notes: string,
  modelName: string,
) {
  return withConnection(async (connection) => {
    await connection.execute(
      `INSERT INTO prompt_optimizations
        (prompt_id, original_body, optimized_body, notes, provider, model_name)
       VALUES
        (:promptId, :originalBody, :optimizedBody, :notes, 'deepseek', :modelName)`,
      { promptId, originalBody, optimizedBody, notes, modelName },
      { autoCommit: true },
    );
  });
}

export async function importLibrary(
  payload: Pick<LibraryPayload, "folders" | "prompts">,
) {
  return withConnection(async (connection) => {
    const folderNameToId = new Map<string, number>();

    for (const folder of payload.folders ?? []) {
      if (!folder.name?.trim()) {
        continue;
      }

      const existing = await connection.execute<Row>(
        `SELECT id FROM prompt_folders WHERE LOWER(name) = LOWER(:name)`,
        { name: folder.name.trim() },
      );

      if (existing.rows?.[0]?.ID) {
        folderNameToId.set(folder.name, Number(existing.rows[0].ID));
        continue;
      }

      const created = await connection.execute<Row>(
        `INSERT INTO prompt_folders (name, description)
         VALUES (:name, :description)
         RETURNING id INTO :id`,
        {
          name: folder.name.trim(),
          description: folder.description ?? null,
          id: outNumberBind(),
        },
      );
      folderNameToId.set(folder.name, Number(created.outBinds?.id?.[0]));
    }

    for (const prompt of payload.prompts ?? []) {
      if (!prompt.title?.trim() || !prompt.body?.trim()) {
        continue;
      }

      const folderId =
        prompt.folderName && folderNameToId.has(prompt.folderName)
          ? folderNameToId.get(prompt.folderName)
          : prompt.folderId;

      await connection.execute(
        `INSERT INTO prompts (folder_id, title, body, summary, tags, variables, favorite)
         VALUES (:folderId, :title, :body, :summary, :tags, :variables, :favorite)`,
        {
          folderId: folderId ?? null,
          title: prompt.title.trim(),
          body: prompt.body.trim(),
          summary: prompt.summary ?? null,
          tags: joinList(prompt.tags),
          variables: joinList(prompt.variables),
          favorite: prompt.favorite ? 1 : 0,
        },
      );
    }

    await connection.commit();
  });
}

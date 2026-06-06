"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  filterPrompts,
  listToText,
  textToList,
  type PromptFilter,
} from "@/lib/prompt-utils";
import type { LibraryPayload, Prompt, PromptInput } from "@/lib/types";

type FormState = PromptInput & {
  id?: number;
};

const emptyForm: FormState = {
  title: "",
  body: "",
  summary: "",
  tags: [],
  variables: [],
  folderId: null,
  favorite: false,
};

function formatTime(value: string | null) {
  if (!value) {
    return "未使用";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "请求失败");
  }

  return data;
}

export function PromptWorkbench() {
  const [library, setLibrary] = useState<LibraryPayload>({
    folders: [],
    prompts: [],
    optimizations: [],
  });
  const [form, setForm] = useState<FormState>(emptyForm);
  const [view, setView] = useState<PromptFilter>({ query: "", folderId: "all" });
  const [status, setStatus] = useState("正在连接 Oracle...");
  const [error, setError] = useState("");
  const [optimizing, setOptimizing] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      setError("");
      const data = await api<LibraryPayload>("/api/library");
      setLibrary(data);
      setStatus("已连接 Oracle");
      if (!form.id && data.prompts[0]) {
        selectPrompt(data.prompts[0]);
      }
    } catch (err) {
      setStatus("需要完成本地配置");
      setError(err instanceof Error ? err.message : "连接失败");
    }
  }, [form.id]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      refresh();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [refresh]);

  function selectPrompt(prompt: Prompt) {
    setForm({
      id: prompt.id,
      title: prompt.title,
      body: prompt.body,
      summary: prompt.summary ?? "",
      tags: prompt.tags,
      variables: prompt.variables,
      folderId: prompt.folderId,
      favorite: prompt.favorite,
    });
  }

  function setFormField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const filteredPrompts = useMemo(() => {
    return filterPrompts(library.prompts, view);
  }, [library.prompts, view]);

  async function savePrompt() {
    const payload: PromptInput = {
      ...form,
      title: form.title.trim(),
      body: form.body.trim(),
      summary: form.summary?.trim() || null,
      folderId: form.folderId ? Number(form.folderId) : null,
    };

    const data = form.id
      ? await api<LibraryPayload>(`/api/prompts/${form.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        })
      : await api<LibraryPayload>("/api/prompts", {
          method: "POST",
          body: JSON.stringify(payload),
        });

    setLibrary(data);
    const saved = data.prompts.find((prompt) => prompt.title === payload.title);
    if (saved) {
      selectPrompt(saved);
    }
    setStatus("已保存");
  }

  async function deleteCurrentPrompt() {
    if (!form.id || !window.confirm("确认删除这个提示词？")) {
      return;
    }

    const data = await api<LibraryPayload>(`/api/prompts/${form.id}`, {
      method: "DELETE",
    });
    setLibrary(data);
    setForm(emptyForm);
    setStatus("已删除");
  }

  async function copyPrompt(prompt = form) {
    if (!prompt.body) {
      return;
    }

    await navigator.clipboard.writeText(prompt.body);
    if (prompt.id) {
      setLibrary(
        await api<LibraryPayload>(`/api/prompts/${prompt.id}/use`, {
          method: "POST",
        }),
      );
    }
    setStatus("已复制到剪贴板");
  }

  async function createFolder() {
    const name = window.prompt("新文件夹名称");
    if (!name?.trim()) {
      return;
    }

    setLibrary(
      await api<LibraryPayload>("/api/folders", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    );
  }

  async function optimizePrompt() {
    if (!form.id || !form.body.trim()) {
      setError("请先保存提示词，再进行优化");
      return;
    }

    setOptimizing(true);
    setError("");
    try {
      const data = await api<{
        library: LibraryPayload;
        result: { optimizedBody: string; notes: string };
      }>(`/api/prompts/${form.id}/optimize`, {
        method: "POST",
        body: JSON.stringify({ ...form, saveAsPrompt: false }),
      });
      setLibrary(data.library);
      setFormField("body", data.result.optimizedBody);
      setFormField("summary", data.result.notes);
      setStatus("AI 优化已生成，保存后会覆盖当前提示词正文");
    } catch (err) {
      setError(err instanceof Error ? err.message : "优化失败");
    } finally {
      setOptimizing(false);
    }
  }

  function exportLibrary() {
    const blob = new Blob([JSON.stringify(library, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "prompt-library.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importLibrary(file: File | undefined) {
    if (!file) {
      return;
    }

    const text = await file.text();
    const payload = JSON.parse(text);
    setLibrary(
      await api<LibraryPayload>("/api/import", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
    setStatus("导入完成");
  }

  return (
    <main className="min-h-screen bg-[#101214] text-[#eef1f3]">
      <div className="mx-auto flex min-h-screen max-w-[1500px] flex-col">
        <header className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-[#8ea0ad]">Prompt Library</p>
            <h1 className="text-2xl font-semibold">提示词工作台</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#b9c5cd]">
              {status}
            </span>
            <button className="toolbar-button" onClick={createFolder}>
              新建文件夹
            </button>
            <button className="toolbar-button" onClick={() => setForm(emptyForm)}>
              新建提示词
            </button>
            <button className="toolbar-button" onClick={exportLibrary}>
              导出
            </button>
            <button
              className="toolbar-button"
              onClick={() => importRef.current?.click()}
            >
              导入
            </button>
            <input
              ref={importRef}
              className="hidden"
              type="file"
              accept="application/json"
              onChange={(event) => importLibrary(event.target.files?.[0])}
            />
          </div>
        </header>

        {error ? (
          <section className="mx-5 mt-4 rounded border border-[#d66b58]/40 bg-[#2d1715] px-4 py-3 text-sm text-[#ffd8d0]">
            <strong>需要处理：</strong> {error}
            <p className="mt-1 text-[#e8aaa0]">
              请确认 `.env.local`、Oracle 用户、`db/schema.sql` 和 `oracledb`
              依赖已经就绪。
            </p>
          </section>
        ) : null}

        <div className="grid flex-1 grid-cols-1 lg:grid-cols-[260px_minmax(340px,440px)_1fr]">
          <aside className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">
            <label className="text-sm text-[#9cafbb]" htmlFor="search">
              搜索
            </label>
            <input
              id="search"
              className="mt-2 w-full rounded border border-white/10 bg-[#171b1f] px-3 py-2 text-sm outline-none focus:border-[#49a078]"
              value={view.query}
              onChange={(event) =>
                setView((current) => ({ ...current, query: event.target.value }))
              }
              placeholder="标题、正文、标签"
            />

            <nav className="mt-6 space-y-1">
              <FolderButton
                active={view.folderId === "all"}
                label="全部提示词"
                count={library.prompts.length}
                onClick={() => setView((current) => ({ ...current, folderId: "all" }))}
              />
              <FolderButton
                active={view.folderId === "favorites"}
                label="收藏"
                count={library.prompts.filter((prompt) => prompt.favorite).length}
                onClick={() =>
                  setView((current) => ({ ...current, folderId: "favorites" }))
                }
              />
              {library.folders.map((folder) => (
                <FolderButton
                  key={folder.id}
                  active={view.folderId === folder.id}
                  label={folder.name}
                  count={folder.promptCount}
                  onClick={() =>
                    setView((current) => ({ ...current, folderId: folder.id }))
                  }
                />
              ))}
            </nav>
          </aside>

          <section className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-medium">提示词列表</h2>
              <span className="text-sm text-[#8ea0ad]">{filteredPrompts.length} 条</span>
            </div>
            <div className="space-y-3">
              {filteredPrompts.map((prompt) => (
                <button
                  key={prompt.id}
                  className={`w-full rounded border p-4 text-left transition ${
                    form.id === prompt.id
                      ? "border-[#49a078] bg-[#183027]"
                      : "border-white/10 bg-[#171b1f] hover:border-white/25"
                  }`}
                  onClick={() => selectPrompt(prompt)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-medium">{prompt.title}</h3>
                    <span className="text-sm text-[#f1c453]">
                      {prompt.favorite ? "收藏" : ""}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-[#9cafbb]">
                    {prompt.summary || prompt.body}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#8ea0ad]">
                    <span>{prompt.folderName || "未归档"}</span>
                    <span>最后使用：{formatTime(prompt.lastUsedAt)}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="p-5">
            <div className="grid gap-4 xl:grid-cols-[1fr_220px]">
              <div className="space-y-4">
                <input
                  className="w-full rounded border border-white/10 bg-[#171b1f] px-3 py-3 text-xl font-semibold outline-none focus:border-[#49a078]"
                  value={form.title}
                  onChange={(event) => setFormField("title", event.target.value)}
                  placeholder="提示词标题"
                />
                <textarea
                  className="min-h-[360px] w-full resize-y rounded border border-white/10 bg-[#171b1f] px-3 py-3 font-mono text-sm leading-6 outline-none focus:border-[#49a078]"
                  value={form.body}
                  onChange={(event) => setFormField("body", event.target.value)}
                  placeholder="在这里写提示词正文，可以使用 {{变量}}"
                />
                <textarea
                  className="min-h-20 w-full rounded border border-white/10 bg-[#171b1f] px-3 py-3 text-sm outline-none focus:border-[#49a078]"
                  value={form.summary ?? ""}
                  onChange={(event) => setFormField("summary", event.target.value)}
                  placeholder="备注、使用说明或优化说明"
                />
              </div>

              <div className="space-y-4">
                <Field label="文件夹">
                  <select
                    className="field-control"
                    value={form.folderId ?? ""}
                    onChange={(event) =>
                      setFormField(
                        "folderId",
                        event.target.value ? Number(event.target.value) : null,
                      )
                    }
                  >
                    <option value="">未归档</option>
                    {library.folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="标签">
                  <input
                    className="field-control"
                    value={listToText(form.tags)}
                    onChange={(event) =>
                      setFormField("tags", textToList(event.target.value))
                    }
                    placeholder="开发, 总结"
                  />
                </Field>

                <Field label="变量">
                  <input
                    className="field-control"
                    value={listToText(form.variables)}
                    onChange={(event) =>
                      setFormField("variables", textToList(event.target.value))
                    }
                    placeholder="topic, code"
                  />
                </Field>

                <label className="flex items-center gap-2 rounded border border-white/10 bg-[#171b1f] px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.favorite}
                    onChange={(event) =>
                      setFormField("favorite", event.target.checked)
                    }
                  />
                  收藏
                </label>

                <div className="grid gap-2">
                  <button className="primary-button" onClick={savePrompt}>
                    保存
                  </button>
                  <button className="toolbar-button" onClick={() => copyPrompt()}>
                    复制正文
                  </button>
                  <button
                    className="toolbar-button"
                    disabled={optimizing}
                    onClick={optimizePrompt}
                  >
                    {optimizing ? "优化中..." : "AI 优化"}
                  </button>
                  <button className="danger-button" onClick={deleteCurrentPrompt}>
                    删除
                  </button>
                </div>

                <div className="rounded border border-white/10 bg-[#171b1f] p-3">
                  <h3 className="text-sm font-medium">最近优化</h3>
                  <div className="mt-3 space-y-3 text-xs text-[#9cafbb]">
                    {library.optimizations.slice(0, 4).map((item) => (
                      <p key={item.id}>
                        #{item.promptId} - {item.modelName || item.provider} -{" "}
                        {formatTime(item.createdAt)}
                      </p>
                    ))}
                    {!library.optimizations.length ? <p>暂无优化记录</p> : null}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function FolderButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex w-full items-center justify-between rounded px-3 py-2 text-sm ${
        active
          ? "bg-[#49a078] text-[#06120d]"
          : "text-[#b9c5cd] hover:bg-white/10"
      }`}
      onClick={onClick}
    >
      <span>{label}</span>
      <span>{count}</span>
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm text-[#9cafbb]">
      <span>{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return Response.json(data, init);
}

export function jsonError(error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : "未知错误";
  return Response.json({ error: message }, { status });
}

export function parseId(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("无效的 ID");
  }
  return id;
}

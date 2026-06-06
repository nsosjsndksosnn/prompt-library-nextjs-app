export type Folder = {
  id: number;
  name: string;
  description: string | null;
  promptCount: number;
  createdAt: string;
  updatedAt: string;
};

export type Prompt = {
  id: number;
  folderId: number | null;
  folderName: string | null;
  title: string;
  body: string;
  summary: string | null;
  tags: string[];
  variables: string[];
  favorite: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Optimization = {
  id: number;
  promptId: number;
  originalBody: string;
  optimizedBody: string;
  notes: string | null;
  provider: string;
  modelName: string | null;
  createdAt: string;
};

export type LibraryPayload = {
  folders: Folder[];
  prompts: Prompt[];
  optimizations: Optimization[];
};

export type PromptInput = {
  title: string;
  body: string;
  summary?: string | null;
  tags?: string[];
  variables?: string[];
  folderId?: number | null;
  favorite?: boolean;
};

export type FolderInput = {
  name: string;
  description?: string | null;
};

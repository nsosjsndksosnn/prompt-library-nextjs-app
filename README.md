# Prompt Library Next.js App

一个用于保存、分类、搜索、复制和优化提示词的 Next.js 工作台。当前实现使用本地 Oracle 数据库作为持久化层，并通过 DeepSeek API 提供提示词优化能力。

## 功能

- 提示词创建、编辑、删除、复制
- 文件夹分类、收藏、搜索和筛选
- 标签与变量字段
- JSON 导入导出
- DeepSeek 提示词优化记录
- Oracle schema 和种子数据

## 本地环境

复制 `.env.example` 为 `.env.local`，然后填写：

```env
ORACLE_USER=prompt_app
ORACLE_PASSWORD=your-password
ORACLE_CONNECT_STRING=localhost:1521/FREEPDB1
DEEPSEEK_API_KEY=your-deepseek-key
DEEPSEEK_MODEL=deepseek-v4-flash
```

注意：应用不要使用 `SYS` 账号连接 Oracle。请使用 `prompt_app` 这类普通应用账号。

## 初始化 Oracle

在 `prompt_app` schema 下执行：

```powershell
sqlplus prompt_app/your-password@localhost:1521/FREEPDB1 @db/schema.sql
```

如果你已经手动创建过表，再次执行会提示表已存在。首版 schema 不是迁移工具，后续需要再补 idempotent migration。

## 开发

```powershell
npm install
npm run dev
```

打开：

```text
http://localhost:3000
```

也可以一键启动：

```powershell
npm run app
```

这个命令会读取 `.env.local`、检查依赖、检查 Oracle schema，然后启动应用。

## 验证

```powershell
npm run lint
npm run build
```

当前已验证：

- `npm run lint` 通过
- `npm run build` 通过
- Oracle `/api/library` 读取通过
- Prompt 创建/删除 API 通过
- DeepSeek `deepseek-v4-flash` 优化 API 通过

# repost-adapter-offset-char

「偏移国际组织角色档案」(Offset Character) 的转发适配器，基于 [`@snowball-bot/repost-adapter`](https://www.npmjs.com/package/@snowball-bot/repost-adapter) 契约实现。

接管 `oc.wsm.ink` 域名下的链接，将偏移角色档案 / 用户 / 全站摘要标准化成 Snowball 的转发数据。

## 支持的链接形态

适配器从 URL 路径解析出 handle，按形状分派到不同的平台接口：

| 链接形态 | 示例 | method | 行为 |
|---|---|---|---|
| 单角色档案 | `oc.wsm.ink/rominwolf/romin` | `post` | 拉取该用户名下指定角色的完整档案 |
| 短链接分享 | `oc.wsm.ink/s/<shareCode>` | `post` | 先解析分享码得到 `username/code`，再拉取档案 |
| 用户档案 | `oc.wsm.ink/rominwolf` | `profile` | 拉取该用户信息及其全部公开角色摘要，聚合成一条 |
| 全站摘要 | `oc.wsm.ink/` | `post` | 拉取全站全部公开角色摘要，聚合成一条 |

> 直播链接 (`live`) 暂不支持，会抛出 `UnsupportedMethodException`。

底层接口约定见 [`documents/API.MD`](./documents/API.MD)。所有接口使用 `[error?, data?]` 元组响应体，HTTP 状态码恒为 `200`，业务失败通过元组第 0 位的错误码表达。

## 配置

适配器从核心通过 `ctx.config(key)` 读取配置：

| key | 必填 | 说明 |
|---|---|---|
| `apiKey` | 否 | 若提供，则以 `Authorization: Bearer <apiKey>` 访问；缺省时回退到公开 API |

API 基础地址、超时、重试等常量定义在 `src/index.ts` 的 `CONST` 中（默认 `https://insider-backend.wsm.ink`，超时 5s，重试 1 次）。

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Build in watch mode |
| `pnpm build` | Build for production |
| `pnpm test` | Run tests once（完全离线，mock `fetch`） |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm lint` | Lint source files |
| `pnpm typecheck` | Type-check without emitting |

## 本地调试

无需启动核心项目即可调试：

```bash
# 填入适配器所需凭据
cp .env.example .env
# 编辑 .env

# 运行 playground（在 dev/playground.ts 中设置测试 URL）
pnpm dev:play
```

`dev/harness.ts` 中的 mock host 模拟核心行为：构造 `AdapterContext`、调用 `initState`、触发 `onRepostRequest`，便于在接入真实核心前快速迭代。

## 项目结构

```
src/index.ts                — 适配器入口与 handle 函数（按 payload 形状分派构建）
src/manager.ts              — URL 解析、method 分派、API 抓取注册表
src/offset-char/            — 平台接口、类型定义
  offset-char.api.ts        — fetchCharacterArchive / fetchCharacters / fetchUser / fetchShare
  api.type.ts               — 接口出入参类型
  character.type.ts         — 角色档案领域模型
src/utils/                  — HttpManager、结构化异常
tests/                      — vitest 单测（mock fetch，覆盖全部链接形态）
documents/API.MD            — 平台公开接口文档
dev/                        — 本地调试 harness 与 playground
```

## 发布

1. 在仓库 secrets 配置 `NPM_TOKEN`（Settings → Secrets → Actions）
2. 更新 `package.json` 的 `version`
3. 打 tag 并推送：

```bash
git tag v1.0.1
git push origin v1.0.1
```

release workflow 会自动发布到 npm。

## 契约参考

完整 API 参考见 [`@snowball-bot/repost-adapter`](https://www.npmjs.com/package/@snowball-bot/repost-adapter)。

## License

MIT

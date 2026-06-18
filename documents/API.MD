# Offset-Char Open API

面向前端接入的公开接口文档。包含以下两个接口：

| # | 接口 | 方法 | 路径 | 说明 |
|---|------|------|------|------|
| 1 | 全站公开角色摘要 | `GET` | `/offset/chars/characters` | 获取全站全部公开角色摘要（不分页） |
| 2 | 用户信息及其角色 | `GET` | `/offset/chars/users/{username}` | 获取用户信息及其全部公开角色摘要 |

> 控制器：
> - `src/modules/offset-char/controllers/open/characters.cont.ts` → `DoFetchCharacters`
> - `src/modules/offset-char/controllers/open/users.cont.ts` → `DoFetchUser`

---

## 1. 通用约定（重要）

### 1.1 统一响应体：元组 `[error?, data?]`

这两个接口 **不使用** Cool 默认的 `{ code, message, data }` 包装，而是直接返回一个二元组数组：

```ts
// 通用 Offset 服务响应体
type OffsetCharResponse<V> = [OffsetCharErrors?, V?];
```

- **成功**：`[null, <data>]` —— 第 0 位为 `null`，第 1 位为业务数据。
- **失败**：`[<errorCode>]` —— 第 0 位为错误码字符串，第 1 位缺省（`undefined`）。

> ⚠️ 即使业务失败，**HTTP 状态码仍为 `200`**。业务异常被服务层捕获并以错误码形式返回，因此前端必须判断元组第 0 位，而不能依赖 HTTP 状态码。

前端读取建议：

```ts
const [err, data] = await response.json();
if (err) {
  // 处理 err（OffsetCharErrors）
} else {
  // 使用 data
}
```

### 1.2 Base URL

服务无全局路由前缀（`globalPrefix` 未配置），上述路径即为完整路径。本地默认端口 `51382`。
实际部署域名以网关/反向代理为准，例如：

```
https://oc.wsm.ink
```

### 1.3 错误码 `OffsetCharErrors`

```ts
type OffsetCharErrors =
  | "OFFSET:CHAR:SYSTEM_ERROR"
  | "OFFSET:CHAR:INVALID_CHAR"
  | "OFFSET:CHAR:INVALID_USER"
  | "OFFSET:CHAR:FETCH_CHAR_INFO_FAILED"
  | "OFFSET:CHAR:FETCH_USER_FAILED"
  | "OFFSET:CHAR:FETCH_CHARACTERS_FAILED"
  | "OFFSET:CHAR:SIGNED_URL:ERROR"
  | "OFFSET:CHAR:FETCH_CHAR_CUSTOM_INFO_FAILED"
  | "OFFSET:CHAR:ARCHIVE:NO_PERM_UPDATE"
  | "OFFSET:CHAR:SHARE:CODE_NOT_FOUND"
  | "OFFSET:CHAR:SHARE:FAILED";
```

与本文档两个接口相关的错误码：

| 错误码 | 触发接口 | 含义 |
|--------|----------|------|
| `OFFSET:CHAR:INVALID_USER` | 接口 2 | 用户名不存在或用户未启用（`status !== 1`） |
| `OFFSET:CHAR:FETCH_USER_FAILED` | 接口 2 | 获取用户信息过程中发生未知异常 |
| `OFFSET:CHAR:FETCH_CHARACTERS_FAILED` | 接口 1 | 获取全站角色过程中发生未知异常 |

---

## 2. 接口详情

### 2.1 `GET /offset/chars/characters` —— 全站公开角色摘要

获取全站全部启用（`enabled = true`）角色的轻量摘要，**不分页**，按 `lastEditAt`（最后编辑时间）倒序排列。

每个角色可能存在多语言条目，服务会按 `locale` 优选；若该角色未收录优选语言，则回退到**最先收录**（`createTime` 最早）的语言。

#### 请求

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| `locale` | query | `"zh" \| "en"` | 否 | 优选语言。未收录则回退到最先收录的语言 |

#### 示例

```bash
curl "https://oc.wsm.ink/offset/chars/characters?locale=zh"
```

#### 成功响应 `200`

```jsonc
[
  null,
  {
    "characters": [
      {
        "username": "rominwolf",
        "code": "romin",
        "locale": "zh",
        "shareCode": "romin",
        "enabled": true,
        "lastEditAt": 1718500000,
        "nickname": "罗敏",
        "fullname": "Romin Wolf",
        "department": "science",
        "position": "研究员",
        "color": "#3F51B5",
        "welcome": "你好，我是罗敏。",
        "headshot": 1024,
        "headshotURL": "https://bucket.wsm.ink/xxx/headshot.png",
        "cover": 1025,
        "coverURL": "https://bucket.wsm.ink/xxx/cover.png"
      }
    ]
  }
]
```

#### 失败响应 `200`

```json
["OFFSET:CHAR:FETCH_CHARACTERS_FAILED"]
```

#### 返回数据类型

```ts
type DoFetchCharactersResult = OffsetCharResponse<OffsetCharacters>;

type OffsetCharacters = {
  characters: OffsetCharSummary[];
};
```

---

### 2.2 `GET /offset/chars/users/{username}` —— 用户信息及其角色摘要

根据用户名获取用户信息，及该用户全部启用角色的轻量摘要（结构同接口 1，但仅限该用户）。

> 同一控制器还存在 `GET /offset/chars/users/{username}/archives/{code}`（`DoFetchCharFromUser`，单角色完整档案），不在本文档范围内。

#### 请求

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| `username` | path | `string` | 是 | 用户名，例如 `rominwolf` |
| `locale` | query | `"zh" \| "en"` | 否 | 优选语言。未收录则回退到最先收录的语言 |

#### 示例

```bash
curl "https://oc.wsm.ink/offset/chars/users/rominwolf?locale=en"
```

#### 成功响应 `200`

```jsonc
[
  null,
  {
    "characters": [
      {
        "username": "rominwolf",
        "code": "romin",
        "locale": "en",
        "shareCode": "romin",
        "enabled": true,
        "lastEditAt": 1718500000,
        "nickname": "Romin",
        "fullname": "Romin Wolf",
        "department": "science",
        "position": "Researcher",
        "color": "#3F51B5",
        "welcome": "Hi, I'm Romin.",
        "headshot": 1024,
        "headshotURL": "https://bucket.wsm.ink/xxx/headshot.png",
        "cover": 1025,
        "coverURL": "https://bucket.wsm.ink/xxx/cover.png"
      }
    ],
    "user": { "code": "rominwolf" }
  }
]
```

> 注意：`user.code` 当前直接回填请求传入的 `username`。

#### 失败响应 `200`

用户不存在或未启用：

```json
["OFFSET:CHAR:INVALID_USER"]
```

其他未知异常：

```json
["OFFSET:CHAR:FETCH_USER_FAILED"]
```

#### 返回数据类型

```ts
type DoFetchUserResult = OffsetCharResponse<OffsetUserArchives>;

type OffsetUserArchives = {
  characters: OffsetCharSummary[];
  user: { code: string };
};
```

---

## 3. 共享类型声明（TypeScript）

可直接复制到前端项目使用。

```ts
/** 语言编码 */
export type OffsetCharLocale = "zh" | "en";

/** 角色所在部门 */
export type OffsetDepartment =
  | "science" | "engineering"
  | "exploration" | "security"
  | "industry" | "logistics"
  | "ethics" | "analysis" | "relations" | "observation"
  | "art";

export type URL = string;

/** 通用 Offset 服务响应体：[错误码?, 数据?] */
export type OffsetCharResponse<V> = [OffsetCharErrors?, V?];

/** 列表用轻量角色摘要（不做重文本解析/跨角色查询） */
export interface OffsetCharSummary {
  /** 角色归属用户名, eg. rominwolf */
  username: string;
  /** 角色 ID, 细分到 username, eg. romin */
  code: string;
  /** 该摘要所采用的语言 */
  locale: OffsetCharLocale;
  /** 角色唯一分享码（可能不存在） */
  shareCode?: string;
  /** 是否启用（公开接口恒为 true） */
  enabled: boolean;
  /** 最后编辑时间戳（秒级 Unix） */
  lastEditAt: number;

  /** 昵称 */
  nickname: string;
  /** 全名 */
  fullname: string;
  /** 所在部门 */
  department: OffsetDepartment;
  /** 职业职位 */
  position?: string;
  /** 角色颜色（HEX 或色板名） */
  color: string;
  /** 登场式文案 */
  welcome: string;

  /** 头像资源 ID */
  headshot: number;
  /** 头像 URL */
  headshotURL?: URL;
  /** 封面资源 ID */
  cover?: number;
  /** 封面 URL */
  coverURL?: URL;
}

/** 接口 1 返回数据 */
export type OffsetCharacters = {
  characters: OffsetCharSummary[];
};

/** 接口 2 返回数据 */
export type OffsetUserArchives = {
  characters: OffsetCharSummary[];
  user: { code: string };
};
```

---

## 4. OpenAPI 3.1 规范

```yaml
openapi: 3.1.0
info:
  title: Offset-Char Open API
  version: "2.0.0"
  description: >
    Offset-Char 模块公开接口。响应体为元组 [error?, data?]：成功为 [null, data]，
    失败为 [errorCode]。所有响应 HTTP 状态码均为 200，业务成功与否由元组第 0 位判断。
servers:
  - url: https://oc.wsm.ink
    description: 生产环境（实际域名以网关为准）
  - url: http://localhost:51382
    description: 本地开发

paths:
  /offset/chars/characters:
    get:
      operationId: DoFetchCharacters
      summary: 获取全站全部公开角色摘要（不分页）
      tags: [offset-char]
      parameters:
        - name: locale
          in: query
          required: false
          description: 优选语言，未收录则回退到最先收录的语言
          schema:
            $ref: "#/components/schemas/OffsetCharLocale"
      responses:
        "200":
          description: 元组 [error?, data?]
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/DoFetchCharactersResult"

  /offset/chars/users/{username}:
    get:
      operationId: DoFetchUser
      summary: 获取用户信息及其全部公开角色摘要
      tags: [offset-char]
      parameters:
        - name: username
          in: path
          required: true
          description: 用户名，例如 rominwolf
          schema:
            type: string
        - name: locale
          in: query
          required: false
          description: 优选语言，未收录则回退到最先收录的语言
          schema:
            $ref: "#/components/schemas/OffsetCharLocale"
      responses:
        "200":
          description: 元组 [error?, data?]
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/DoFetchUserResult"

components:
  schemas:
    OffsetCharLocale:
      type: string
      enum: [zh, en]

    OffsetDepartment:
      type: string
      enum:
        [science, engineering, exploration, security, industry, logistics,
         ethics, analysis, relations, observation, art]

    OffsetCharErrors:
      type: string
      enum:
        - "OFFSET:CHAR:SYSTEM_ERROR"
        - "OFFSET:CHAR:INVALID_CHAR"
        - "OFFSET:CHAR:INVALID_USER"
        - "OFFSET:CHAR:FETCH_CHAR_INFO_FAILED"
        - "OFFSET:CHAR:FETCH_USER_FAILED"
        - "OFFSET:CHAR:FETCH_CHARACTERS_FAILED"
        - "OFFSET:CHAR:SIGNED_URL:ERROR"
        - "OFFSET:CHAR:FETCH_CHAR_CUSTOM_INFO_FAILED"
        - "OFFSET:CHAR:ARCHIVE:NO_PERM_UPDATE"
        - "OFFSET:CHAR:SHARE:CODE_NOT_FOUND"
        - "OFFSET:CHAR:SHARE:FAILED"

    OffsetCharSummary:
      type: object
      required: [username, code, locale, enabled, lastEditAt, nickname, fullname, department, color, welcome, headshot]
      properties:
        username: { type: string, description: 角色归属用户名 }
        code: { type: string, description: 角色 ID（细分到 username） }
        locale: { $ref: "#/components/schemas/OffsetCharLocale" }
        shareCode: { type: string, description: 角色唯一分享码 }
        enabled: { type: boolean, description: 是否启用（公开接口恒为 true） }
        lastEditAt: { type: integer, description: 最后编辑时间戳（秒级 Unix） }
        nickname: { type: string }
        fullname: { type: string }
        department: { $ref: "#/components/schemas/OffsetDepartment" }
        position: { type: string }
        color: { type: string, description: HEX 或色板名 }
        welcome: { type: string, description: 登场式文案 }
        headshot: { type: integer, description: 头像资源 ID }
        headshotURL: { type: string, format: uri }
        cover: { type: integer, description: 封面资源 ID }
        coverURL: { type: string, format: uri }

    OffsetCharacters:
      type: object
      required: [characters]
      properties:
        characters:
          type: array
          items: { $ref: "#/components/schemas/OffsetCharSummary" }

    OffsetUserArchives:
      type: object
      required: [characters, user]
      properties:
        characters:
          type: array
          items: { $ref: "#/components/schemas/OffsetCharSummary" }
        user:
          type: object
          required: [code]
          properties:
            code: { type: string }

    # 元组响应：成功 [null, data]，失败 [errorCode]
    DoFetchCharactersResult:
      type: array
      minItems: 1
      maxItems: 2
      prefixItems:
        - oneOf:
            - type: "null"
            - $ref: "#/components/schemas/OffsetCharErrors"
        - $ref: "#/components/schemas/OffsetCharacters"
      items: false

    DoFetchUserResult:
      type: array
      minItems: 1
      maxItems: 2
      prefixItems:
        - oneOf:
            - type: "null"
            - $ref: "#/components/schemas/OffsetCharErrors"
        - $ref: "#/components/schemas/OffsetUserArchives"
      items: false
```

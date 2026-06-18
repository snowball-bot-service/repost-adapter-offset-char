import {
  Adapter,
  AdapterContext,
  ParseLinkFailedException,
  AdapterRepostRequestParams,
  AdapterRepostResponsePayload,
  SocialProvider,
  AdapterProcessRequestParams,
  AdapterProcessResponsePayload,
} from '@snowball-bot/repost-adapter';
import { HttpManager } from './utils/http';
import {
  DEPARTMENTS,
  extractHandleId,
  extractURL,
  fetchHandleDataFromAPI,
  parseShareCodeToBasicUsernameCode,
} from './manager';
import {
  UnsupportedLanguageException,
  UnsupportedMethodException,
  UnsupportedProcessException,
} from './utils/error';
import {
  CharUC,
  FetchCharacterArchivePayload,
  OffsetCharSummary,
  OffsetCharacters,
  OffsetUserArchives,
} from './offset-char/api.type';
import dayjs from 'dayjs';
import { OffsetDepartment } from './offset-char/character.type';

export { HttpManager, HttpError } from './utils/http';
export type {
  HttpManagerOptions,
  HttpRequestOptions,
  HttpMethod,
  QueryParams,
} from './utils/http';

// ============================================================================
// TODO: 1. 修改下方 manifest 信息
// ============================================================================
//
// - manifest.name: 必须以 `repost-adapter-` 开头
// - manifest.provider: 你的平台标识符，比如 'twitter' / 'bilibili'
// - manifest.whitelistHosts: 你的 adapter 接管的域名列表（不带 www）
// - manifest.version: 适配器自己的版本号，每次有重大变化时递增
// - manifest.author: 你的昵称
// - manifest.billing: 各类费用雪花定价
// - manifest.providerInfo: 该适配器的基本信息
//
// ============================================================================

interface AdapterOptions {
  apiKey?: string;
}

/**
 * 常量仓库
 * @param apiBaseURL API 基础地址
 * @param provider 提供商
 * @param apiTimeout API 超时时间（毫秒）
 * @param apiRetries API 重试次数
 */
const CONST: {
  apiBaseURL: string;
  provider: SocialProvider;
  apiTimeout: number;
  apiRetries: number;
} = {
  provider: 'offset-char',
  apiBaseURL:
    'https://insider-backend.wsm.ink',
  apiTimeout: 5000,
  apiRetries: 1,
};

/**
 * 实例仓库
 * @param instance.http 模块级 HTTP 客户端, 在 initState 中创建, dispose 中销毁
 * */
const INSTANCE: {
  http: HttpManager | null;
} = {
  http: null,
}

const adapter: Adapter = {
  manifest: {
    name: `repost-adapter-${CONST.provider}`,
    provider: CONST.provider,
    whitelistHosts: ['oc.wsm.ink'],
    version: 1,
    author: 'Rominwolf',
    billing: {
      text: 100,
      token: 100,
      media: 1000,
      green: 1,
    },
    providerInfo: {
      name: '偏移国际组织角色档案',
      icon: '📑',
      color: '#FFFFFF',
      bgColor: '#000000',
    }
  },

  /**
   * 适配器初始化时触发，在此处注册各类资源
   * @param ctx
   */
  async initState(ctx: AdapterContext) {
    // 读取配置（可选）。配置由核心通过 `ctx.config(key)` 提供。
    // 比如 API key、限流参数等，建议把所有可调项都从 config 取。
    const apiKey = ctx.config<string>('apiKey');
    if (!apiKey) {
      ctx.logger.warn(
        `[${CONST.provider}] no apiKey configured, falling back to public API`
      );
    }

    // 创建 HTTP 客户端 (基于 fetch), 统一处理 baseUrl / 鉴权 / 超时 / 重试
    INSTANCE.http = new HttpManager({
      baseUrl: CONST.apiBaseURL,
      timeoutMs: CONST.apiTimeout,
      retries: CONST.apiRetries,
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
      logger: ctx.logger,
    });

    // 注册转发请求处理器
    ctx.on('onRepostRequest', (req) => handleRepostRequest(req, ctx, {}));
    ctx.on("onProcessRequest", (req) => handleProcessingRequest(req, ctx, {}));

    ctx.logger.info(`[${CONST.provider}] Adapter initialized.`);
  },

  /**
   * 适配器销毁时触发，在此处清理各类资源
   *
   * eg. 关闭 HTTP 客户端, 清空定时器, 断开长连接...
   */
  async dispose() {
    // 中断在途请求并释放 HTTP 客户端
    INSTANCE.http?.dispose();
    INSTANCE.http = null;
  },
};

// ============================================================================
// TODO: 2. 实现下方的 handle 函数
// ============================================================================
//
// 这是 adapter 的核心：接收一个 URL，返回标准化的转发数据。
//
// ============================================================================

async function handleRepostRequest(
  req: AdapterRepostRequestParams,
  ctx: AdapterContext,
  _options: AdapterOptions
): Promise<AdapterRepostResponsePayload | null> {
  const { helper, logger } = ctx;

  logger.debug(`[${CONST.provider}] fetching ${req.source}`);

  // 从 req.source 解析出 Handle Info
  const [handleMethod, _username, _code] = extractHandleId(req.source);

  // 不支持的解析类型，直接返回 null
  if (!handleMethod) return null;

  // 不支持的转发模式
  if (handleMethod === 'live')
    throw new UnsupportedMethodException(handleMethod, req.source);

  const charUC: CharUC = { username: _username, code: _code ?? "" };

  // 如果 username = s, 则表示为短链接 (仅 post 单角色形态)
  if (handleMethod === 'post' && _username === "s") {
    const shareCode = _code!; // 如果 username = s 则 _code 表示为 ShareCode
    const { username, code } = await parseShareCodeToBasicUsernameCode(INSTANCE.http!, shareCode);
    charUC.username = username;
    charUC.code = code;
  }

  // 调用平台 API 拿到原始数据
  // post: username & code 都存在 -> 单角色档案; 都为空 -> 站点级全站角色摘要
  // profile: 仅 username -> 用户信息及其角色摘要
  const handleData = await fetchHandleDataFromAPI(
    INSTANCE.http!,
    handleMethod,
    charUC.username,
    charUC.code || undefined,
  );

  logger.debug('Payload', handleData);

  // 渠道不支持 / 无数据
  if (!handleData) return null;

  type BuiltPost = Omit<
    AdapterRepostResponsePayload,
    'postId' | 'method' | 'code' | 'originalUrl' | 'provider' | 'requester'
  >;

  // 函数：构建 单角色档案 Post
  const fnBuildArchivePost = (
    payload: FetchCharacterArchivePayload,
    postId: string,
  ): BuiltPost => {
    const { items, code } = payload;
    const zh = items["zh"];

    // 不支持的语言
    if (!zh) throw new UnsupportedLanguageException(code, "zh");

    const {
      lastEditAt,
      breed, species, fullname,
      department, position, introduction, welcome,
      headshotURL, coverURL,
      referenceURL,
      layoutMain,
    } = zh;

    const showsCover = layoutMain.includes("banner");
    const departmentName = helper.pick<OffsetDepartment, string>(DEPARTMENTS, department, "/");

    return {
      publishAt: dayjs.unix(lastEditAt).toDate(),

      author: {
        headshotUrl: headshotURL,
        nickname: fullname,
        userId: postId,
      },

      cover: showsCover ? coverURL : undefined,

      content: `「${welcome}」\n\n${introduction.value}`,

      badges: [
        [{ emoji: '🧰', name: `${departmentName} · ${position}` }],
        [
          { emoji: '🔷', name: `${species.name ?? '种族'} · ${species.value}` },
          { emoji: '🔹', name: `${breed.name ?? '物种'} · ${breed.value}` },
        ],
      ],

      images: referenceURL,
    };
  };

  // 摘要列表 Post 的公共字段 (发布时间 / 封面 / 徽章)，纯文本展示, 不附带角色图片
  const summaryCommons = (
    summaries: OffsetCharSummary[],
    author: AdapterRepostResponsePayload["author"],
    content: string,
  ): BuiltPost => ({
    // 取最新编辑时间作为发布时间
    publishAt: (() => {
      const latest = summaries.reduce((max, s) => Math.max(max, s.lastEditAt), 0);
      return latest ? dayjs.unix(latest).toDate() : undefined;
    })(),

    author,

    // cover: summaries.find((s) => s.coverURL)?.coverURL,

    content,

    badges: [[{ emoji: '👥', name: `${summaries.length} 位角色` }]],
  });

  // 函数：用户级 - 平铺
  const fnBuildProfilePost = (
    summaries: OffsetCharSummary[],
    author: AdapterRepostResponsePayload["author"],
  ): BuiltPost => {
    const lines = summaries.map((s) => {
      const link = s.shareCode ? `/s/${s.shareCode}` : `/${s.username}/${s.code}`;
      const departmentName = helper.pick<OffsetDepartment, string>(DEPARTMENTS, s.department, "/");
      const role = `${departmentName}${s.position ? ` · ${s.position}` : ''}`;
      const parts = [
        "// ", s.fullname, " · ", role, " · ", link, "\n",
        "「", s.welcome, "」",
      ];
      return parts.filter(Boolean).join('');
    });

    return summaryCommons(
      summaries,
      author,
      lines.join('\n\n'),
    );
  };

  // 函数：站点级 - 按部门分组
  const fnBuildSitePost = (
    summaries: OffsetCharSummary[],
    author: AdapterRepostResponsePayload["author"],
  ): BuiltPost => {
    // 分组
    const grouped = new Map<OffsetDepartment, OffsetCharSummary[]>();
    for (const s of summaries) {
      if (!grouped.has(s.department)) grouped.set(s.department, []);
      grouped.get(s.department)!.push(s);
    }

    // 按 DEPARTMENTS 既定顺序输出, 未知部门置于末尾
    const order = Object.keys(DEPARTMENTS) as OffsetDepartment[];
    const sortedDepts = [...grouped.keys()].sort(
      (a, b) => (order.indexOf(a) + 1 || Infinity) - (order.indexOf(b) + 1 || Infinity),
    );

    const blocks = sortedDepts.map((dept) => {
      const departmentName = helper.pick<OffsetDepartment, string>(DEPARTMENTS, dept, "/");
      const lines = grouped.get(dept)!.map((s) => {
        const link = s.shareCode ? `/s/${s.shareCode}` : `/${s.username}/${s.code}`;
        const role = s.position || '';
        const parts = [
          "// ", s.fullname, " · ", role, " · ", link,
        ];
        return parts.filter(Boolean).join('');
      });
      return `【${departmentName}】\n${lines.join('\n')}`;
    });

    return summaryCommons(
      summaries,
      author,
      blocks.join('\n\n'),
    );
  };

  // 按 handleData 形状分派构建逻辑
  let postId: string;
  let built: BuiltPost;

  if ('items' in handleData) {
    // 单角色档案
    postId = `${charUC.username}/${charUC.code}`;
    built = fnBuildArchivePost(handleData, postId);
  } else if ('user' in handleData) {
    // 用户信息及其角色摘要 (平铺)
    const data = handleData as OffsetUserArchives;
    postId = data.user.code;
    built = fnBuildProfilePost(data.characters, {
      nickname: data.user.nickname || data.user.code,
      userId: data.user.code,
      headshotUrl: data.user.headshotURL,
    });
  } else {
    // 站点级全站角色摘要 (按部门分组)
    const data = handleData as OffsetCharacters;
    postId = "/";
    built = fnBuildSitePost(data.characters, {
      nickname: adapter.manifest.providerInfo?.name ?? CONST.provider,
      userId: "offset-chars",
    });
  }

  // 转换成标准 response 格式
  return {
    method: handleMethod,
    provider: CONST.provider,
    code: req.code,
    originalUrl: req.source,
    requester: req.requester,

    postId,

    ...built,
  };
}

async function handleProcessingRequest(
  req: AdapterProcessRequestParams,
  ctx: AdapterContext,
  _options: AdapterOptions
): Promise<AdapterProcessResponsePayload | null> {
  const { logger } = ctx;
  const { method, source } = req;

  logger.debug(`[${CONST.provider}] fetching ${method}: ${source}`);

  // 抛出不支持的进程
  throw new UnsupportedProcessException(method, source);
}

export default adapter;

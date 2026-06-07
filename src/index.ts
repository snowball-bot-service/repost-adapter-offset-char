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
import { CharUC, FetchCharacterArchivePayload } from './offset-char/api.type';
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

  // 不支持的转发模式
  if (handleMethod === 'live' || handleMethod === "profile")
    throw new UnsupportedMethodException(handleMethod, req.source);

  const charUC: CharUC = { username: _username, code: _code! };

  // 如果 username = s, 则表示为短链接
  if (_username === "s") {
    const shareCode = _code!; // 如果 username = s 则 _code 表示为 ShareCode
    const { username, code } = await parseShareCodeToBasicUsernameCode(INSTANCE.http!, shareCode);
    charUC.username = username;
    charUC.code = code;
  }

  const handleId = `${charUC.username}/${charUC.code}`;

  // 调用平台 API 拿到原始数据
  const handleData = await fetchHandleDataFromAPI(
    INSTANCE.http!,
    handleMethod,
    charUC.username,
    charUC.code,
  );

  // 函数：构建 Post
  const fnBuildPost = (): Omit<
    AdapterRepostResponsePayload,
    'postId' | 'method' | 'code' | 'originalUrl' | 'provider' | 'requester'
  > => {
    const payload = handleData as FetchCharacterArchivePayload;
    const { items, code } = payload;
    logger.debug('Payload', payload);
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
        userId: handleId,
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

  // 转换成标准 response 格式
  return {
    method: handleMethod,
    provider: CONST.provider,
    code: req.code,
    originalUrl: req.source,
    requester: req.requester,

    postId: handleId,

    ...fnBuildPost(),
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

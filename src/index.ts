import {
  Adapter,
  AdapterContext, ParseLinkFailedException,
  RepostAdapterRequestParams,
  RepostAdapterResponsePayload, SocialProvider,
} from '@snowball-bot/repost-adapter';
import { HttpManager } from './utils/http';
import {extractHandleId, extractURL, fetchHandleDataFromAPI} from "./manager";

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
  apiBaseURL: string,
  provider: SocialProvider,
  apiTimeout: number,
  apiRetries: number,
} = {
  provider: "REPLACE_ME",
  apiBaseURL: "https://example.com",
  apiTimeout: 5000,
  apiRetries: 1,
}

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
    whitelistHosts: ['example.com'],
    version: 1,
    author: 'REPLACE_ME',
    billing: {
      text: 100,
      token: 100,
      media: 1000,
      green: 1,
    },
    providerInfo: {
      name: 'REPLACE_ME',
      icon: '✨',
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
    ctx.on('onRepostRequest', (req) => handle(req, ctx, { apiKey }));

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

async function handle(
  req: RepostAdapterRequestParams,
  ctx: AdapterContext,
  options: AdapterOptions
): Promise<RepostAdapterResponsePayload | null> {
  ctx.logger.debug(`[${CONST.provider}] fetching ${req.source}`);

  // TODO: 1) 从 req.source 解析出 Handle Id
  const [handleMethod, handleId] = extractHandleId(req.source, 1);

  // TODO: 2) 调用平台 API 拿到原始数据
  const handleData = await fetchHandleDataFromAPI(INSTANCE.http!, handleMethod, handleId);

  const postId = "";
  const publishAt = new Date();

  const requesterUserId = "";
  const requesterNickname = "";

  const authorNickname = "";

  // TODO: 3) 转换成标准 response 格式
  return {
    code: req.code,
    provider: CONST.provider,
    originalUrl: req.source,
    method: "post",

    postId: postId,
    publishAt: publishAt,

    requester: {
      userId: requesterUserId,
      nickname: requesterNickname,
    },
    author: {
      nickname: authorNickname,
    },

    title: "",
    content: `TODO: real content from ${req.source}`,
    cover: "",
    images: [],
    overlayCoverBuffer: undefined,
    child: undefined,
    badges: [],
    strawberry: undefined,
    watermelon: undefined,

    useProxy: false,
    useTranslator: false,

    canvasWidth: undefined,
    extra: undefined,
  };
}

export default adapter;

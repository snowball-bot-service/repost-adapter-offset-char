import { RepostMethod } from '@snowball-bot/repost-adapter';
import { CharUC, FetchCharacterArchivePayload } from './offset-char/api.type';
import { fetchCharacterArchive, fetchShare } from './offset-char/offset-char.api';
import { HttpManager } from './utils/http';
import { NotCharShareException } from './utils/error';
import { OffsetDepartment } from './offset-char/character.type';

export type Username = string;
export type Code = string;
export type ShareCode = string;
export type S = 's';

type RepostMethodPayloadMap = {
  post: FetchCharacterArchivePayload;
  profile: null;
  live: null;
};

/**
 * method -> API 抓取函数 的注册表。
 *
 * 每一项要么是对应的抓取函数, 要么是 `null` (表示该渠道不支持此 method)。
 * `satisfies` 在此处校验每个 handler 的返回类型与 {@link RepostMethodPayloadMap}
 * 对应项一致；任何不匹配都会在此对象上直接报错，而非在调用处。
 */
const PAYLOAD_FETCHERS = {
  post: fetchCharacterArchive,
  profile: null,
  live: null,
} satisfies {
  [M in RepostMethod]:
    | ((
        http: HttpManager,
        username: string,
        code: string,
      ) => Promise<RepostMethodPayloadMap[M]>)
    | null;
};

export const DEPARTMENTS: Record<OffsetDepartment, string> = {
  engineering: '工程部',
  science: '科学部',
  exploration: '探险部',
  security: '安防部',
  industry: '实业部',
  logistics: '后勤部',
  analysis: '分析组',
  ethics: '伦理委员会',
  relations: '对外事务部',
  observation: '观测组',
  art: '艺术部',
};

/**
 * 将 URL 转换成 URL payload
 * @param source
 */
export function extractURL(source: string) {
  return new URL(source);
}

/**
 * 提取 Source URL 中的 Handle ID (PostId, UserId, ...)
 * @param source 原始 URL
 * @example Path: /rominwolf/romin => [post, rominwolf, romin]
 * @example Path: /s/romin => [post, s, romin]
 * @example Path: /rominwolf => [post, rominwolf]
 */
export function extractHandleId(source: string): [RepostMethod, string, string?] {
  const { pathname } = extractURL(source);
  const paths = pathname.split('/') as [Username | S, string?];

  // 如果分割的 Paths 首个为空，则删除
  if (paths.length > 1 && paths[0].length === 0) {
    paths.shift();
  }

  const [username, code] = paths;

  if (code) return ["post", username, code];

  return ["profile", username];
}

/**
 * 进行对应的 API 请求，拿到 Handle Data
 * @param http
 * @param method
 * @param username
 * @param code
 */
export async function fetchHandleDataFromAPI<M extends RepostMethod>(
  http: HttpManager,
  method: M,
  username: Username,
  code?: Code,
): Promise<RepostMethodPayloadMap[M]> {
  const fetcher = PAYLOAD_FETCHERS[method] as
    | ((
        http: HttpManager,
        username: Username,
        code?: Code
      ) => Promise<RepostMethodPayloadMap[M]>)
    | null;

  // null 项: 该渠道不支持此 method (eg. live), 返回 null 回调
  if (!fetcher) {
    return null as RepostMethodPayloadMap[M];
  }

  return fetcher(http, username, code);
}

/**
 * 将分享码形态的短链接转换成标准 Username / Code 形态
 * @param http
 * @param shareCode
 */
export async function parseShareCodeToBasicUsernameCode(
  http: HttpManager,
  shareCode: string
): Promise<CharUC> {
  const { char } = await fetchShare(http, shareCode);

  if (!char) throw new NotCharShareException(shareCode);

  return {
    username: char.username,
    code: char.code,
  };
}

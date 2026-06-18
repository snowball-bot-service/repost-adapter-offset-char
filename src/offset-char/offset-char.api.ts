import {
  FetchCharacterArchivePayload,
  FetchCharactersPayload,
  FetchUserPayload,
  OffsetCharResponse,
} from './api.type';
import { OffsetCharLocale } from './character.type';
import { GetSharePayload } from './share.type';
import { HttpManager } from '../utils/http';
import {
  UnavailableArchiveException,
  UnavailableCharactersException,
  UnavailableShareException,
  UnavailableUserException,
} from '../utils/error';

/**
 * 拿到角色档案
 *
 * GET /offset/chars/users/:username/archives/:code
 * @param http
 * @param username
 * @param code
 */
export async function fetchCharacterArchive(
  http: HttpManager,
  username: string,
  code: string
): Promise<FetchCharacterArchivePayload> {
  const path = `/offset/chars/users/${encodeURIComponent(username)}/archives/${encodeURIComponent(code)}`;

  const response =
    await http.getJson<OffsetCharResponse<FetchCharacterArchivePayload>>(path);

  const [err, payload] = response;

  if (err) throw new UnavailableArchiveException(username, code, err);

  return payload!;
}

/**
 * 拿到全站公开角色摘要
 *
 * GET /offset/chars/characters
 * @param http
 * @param locale 优选语言, 未收录则回退到最先收录的语言
 */
export async function fetchCharacters(
  http: HttpManager,
  locale?: OffsetCharLocale
): Promise<FetchCharactersPayload> {
  const path = '/offset/chars/characters';

  const response = await http.getJson<OffsetCharResponse<FetchCharactersPayload>>(
    path,
    locale ? { query: { locale } } : undefined
  );

  const [err, payload] = response;

  if (err) throw new UnavailableCharactersException(err);

  return payload!;
}

/**
 * 拿到用户信息及其全部公开角色摘要
 *
 * GET /offset/chars/users/:username
 * @param http
 * @param username 用户名
 * @param locale 优选语言, 未收录则回退到最先收录的语言
 */
export async function fetchUser(
  http: HttpManager,
  username: string,
  locale?: OffsetCharLocale
): Promise<FetchUserPayload> {
  const path = `/offset/chars/users/${encodeURIComponent(username)}`;

  const response = await http.getJson<OffsetCharResponse<FetchUserPayload>>(
    path,
    locale ? { query: { locale } } : undefined
  );

  const [err, payload] = response;

  if (err) throw new UnavailableUserException(username, err);

  return payload!;
}

/**
 * 解析短链接分享码
 *
 * GET /offset/chars/shares/:shareCode
 * @param http
 * @param shareCode 短链接分享码
 */
export async function fetchShare(
  http: HttpManager,
  shareCode: string
): Promise<GetSharePayload> {
  const path = `/offset/chars/shares/${encodeURIComponent(shareCode)}`;

  const response =
    await http.getJson<OffsetCharResponse<GetSharePayload>>(path);

  const [err, payload] = response;

  if (err) throw new UnavailableShareException(shareCode, err);

  return payload!;
}

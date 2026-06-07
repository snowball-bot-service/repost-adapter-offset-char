import { FetchCharacterArchivePayload, OffsetCharResponse } from './api.type';
import { GetSharePayload } from './share.type';
import { HttpManager } from '../utils/http';
import {
  UnavailableArchiveException,
  UnavailableShareException,
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

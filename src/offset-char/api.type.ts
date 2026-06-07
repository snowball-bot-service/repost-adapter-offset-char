import { HttpManager } from '../utils/http';
import { OffsetCharArchive } from './character.type';

// 通用 Offset 服务响应体
export type OffsetCharResponse<V> = [string?, V?]

/**
 * 角色 Username / Code
 */
export interface CharUC {
  username: string;
  code: string;
}
export type FetchCharacterArchivePayload = OffsetCharArchive;

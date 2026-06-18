import { HttpManager } from '../utils/http';
import {
  OffsetCharArchive,
  OffsetCharLocale,
  OffsetDepartment,
  URL,
} from './character.type';

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

/**
 * 列表用轻量角色摘要（不做重文本解析/跨角色查询）
 */
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

/** 接口 1 (GET /offset/chars/characters) 返回数据 */
export type OffsetCharacters = {
  characters: OffsetCharSummary[];
};

/** 接口 2 (GET /offset/chars/users/:username) 返回数据 */
export type OffsetUserArchives = {
  characters: OffsetCharSummary[];
  user: { code: string; headshotURL?: string; nickname?: string; };
};

export type FetchCharactersPayload = OffsetCharacters;
export type FetchUserPayload = OffsetUserArchives;

/**
 * 一条 Name & Value
 */
export interface NV<V = string> {
  name?: string;
  to?: CharKey;
  value: V;
  char?: TargetCharInfo;
}

/**
 * 如果存在 to, 则添加对应角色的信息
 */
export type TargetCharInfo = Partial<OffsetCharInfo>;

/**
 * 一组 Name & Value
 */
export interface NVS<V = string> {
  name?: string;
  value: Array<NV<V>>;
}

export type URL = string;
export type Username = string;
export type Code = string;
export type CharKey = `${Username}/${Code}`;

// 通用 Offset 服务响应体
export type OffsetCharResponse<V> = [string?, V?];

export type OffsetCharLocale = 'zh' | 'en';
export type OffsetCharColor =
  | 'red'
  | 'pink'
  | 'purple'
  | 'deep-purple'
  | 'indigo'
  | 'blue'
  | 'light-blue'
  | 'cyan'
  | 'teal'
  | 'green'
  | 'light-green'
  | 'lime'
  | 'yellow'
  | 'amber'
  | 'orange'
  | 'deep-orange'
  | 'brown'
  | 'grey'
  | 'blue-grey';
export type OffsetCharLayout =
  | 'banner'
  | 'profile'
  | 'color'
  | 'introduction'
  | 'relationship'
  | 'reference'
  | 'comment'
  | 'note'
  | 'special'
  | 'dialogue'
  | 'footer'
  | 'department';

export type OffsetDepartmentForWolai =
  | '科学部 Science'
  | '工程部 Engineering'
  | '探险部 Exploration'
  | '防卫部 Security'
  | '工业部 Industry'
  | '后勤部 Logistics'
  | '分析部 Analysis'
  | '观测组 Observation'
  | '伦理部 Ethics'
  | '事务部 Relations'
  | '艺术部 Art';
export type OffsetDepartment =
  | 'science'
  | 'engineering'
  | 'exploration'
  | 'security'
  | 'industry'
  | 'logistics'
  | 'ethics'
  | 'analysis'
  | 'relations'
  | 'observation'
  | 'art';

/**
 * 单一角色 的 单一语言 细分信息
 */
export interface OffsetCharInfo {
  // 角色唯一 ID
  id: number;
  // 角色归属用户名, eg. rominwolf
  username: string;
  // 角色 ID, 细分到 username, eg. romin
  code: string;
  // 角色唯一分享码, 细分到全局, eg. romin
  shareCode: string;

  // 最后编辑时间戳
  lastEditAt: number;

  // 是否启用
  enabled: boolean;
  // 语言编码, eg. zh
  locale: OffsetCharLocale;

  // 角色颜色（HEX）
  color: string;

  // 角色所在部门
  department: OffsetDepartment;
  // 角色职业职位
  position: string;

  // 角色签名
  sign: number;
  signURL?: string;

  // 头像
  headshot: number;
  headshotURL?: URL;

  // 参考图
  reference: number[];
  referenceURL?: URL[];

  // 封面图
  cover?: number;
  coverURL?: URL;

  // 登场式文案
  welcome: string;
  // 昵称
  nickname: string;
  // 全名
  fullname: string;

  // 种族
  species: NV;
  // 物种
  breed: NV;
  // 介绍
  introduction: NV;
  // 评论
  comment: NV<undefined>;

  // 更多
  more: NVS;
  // 色彩方案
  colorScheme: NVS;
  // 笔记
  note: NVS;
  // 异格
  special: NVS;
  // 与其他角色的关系
  relationship: NVS;
  externalRelationship?: NVS;
  // 角色对话
  dialogueChar: NVS;
  dialogueThread: NVS;
  // 角色时间线
  timeline: NVS;

  // 布局系列
  layoutMain: Array<OffsetCharLayout>;
  layoutLeft: Array<OffsetCharLayout>;
  layoutRight: Array<OffsetCharLayout>;
}

/**
 * 单一角色档案
 */
export type OffsetCharArchive = {
  code: string;
  locales: OffsetCharLocale[];
  items: Partial<Record<OffsetCharLocale, OffsetCharInfo>>;
};

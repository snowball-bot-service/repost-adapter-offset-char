import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type {
  AdapterContext,
  RepostHandler,
} from '@snowball-bot/repost-adapter';
import adapter from '../src';

// ============================================================================
// Mock 上下文
// ============================================================================

function createMockContext(
  configValues: Record<string, unknown> = {}
): { ctx: AdapterContext; getHandler: () => RepostHandler } {
  let handler: RepostHandler | null = null;

  const ctx: AdapterContext = {
    on: vi.fn((event, h) => {
      if (event === 'onRepostRequest') handler = h;
    }),
    config: vi.fn((key: string) => configValues[key]) as AdapterContext['config'],
    helper: {
      pick: (record, key, fallback) => record[key] ?? fallback!,
    },
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  };

  return {
    ctx,
    getHandler: () => {
      if (!handler) throw new Error('Handler not registered');
      return handler;
    },
  };
}

// ============================================================================
// Mock fetch: 按路径路由, 返回 Offset 的 [err?, data?] 元组 (HTTP 恒 200)
// ============================================================================

/** 构造一条 Offset 风格的 JSON 响应 (业务成功 / 业务失败都用 200) */
function tupleResponse(tuple: [string?, unknown?]): Response {
  return new Response(JSON.stringify(tuple), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

/** 一条角色摘要 (列表接口用) */
function summary(overrides: Record<string, unknown> = {}) {
  return {
    username: 'rominwolf',
    code: 'romin',
    locale: 'zh',
    enabled: true,
    lastEditAt: 1_700_000_000,
    nickname: '罗敏',
    fullname: '罗敏·沃尔夫',
    department: 'science',
    position: '研究员',
    color: '#FFCC00',
    welcome: '你好',
    headshot: 1,
    headshotURL: 'https://cdn.wsm.ink/head/romin.png',
    cover: 2,
    coverURL: 'https://cdn.wsm.ink/cover/romin.png',
    ...overrides,
  };
}

/** 单角色档案的 zh item (详情接口用) */
function archiveZhItem() {
  return {
    id: 1,
    username: 'rominwolf',
    code: 'romin',
    shareCode: 'romincode',
    lastEditAt: 1_700_000_000,
    enabled: true,
    locale: 'zh',
    color: '#FFCC00',
    department: 'science',
    position: '研究员',
    sign: 0,
    headshot: 1,
    headshotURL: 'https://cdn.wsm.ink/head/romin.png',
    reference: [3, 4],
    referenceURL: [
      'https://cdn.wsm.ink/ref/1.png',
      'https://cdn.wsm.ink/ref/2.png',
    ],
    cover: 2,
    coverURL: 'https://cdn.wsm.ink/cover/romin.png',
    welcome: '你好',
    nickname: '罗敏',
    fullname: '罗敏·沃尔夫',
    species: { name: '种族', value: '人类' },
    breed: { name: '物种', value: '智人' },
    introduction: { value: '一段角色介绍。' },
    comment: { value: undefined },
    more: { value: [] },
    colorScheme: { value: [] },
    note: { value: [] },
    special: { value: [] },
    relationship: { value: [] },
    dialogueChar: { value: [] },
    dialogueThread: { value: [] },
    timeline: { value: [] },
    layoutMain: ['banner', 'introduction'],
    layoutLeft: [],
    layoutRight: [],
  };
}

/**
 * 安装 fetch mock。返回的函数可断言被请求过的路径。
 * routes: pathname -> 元组 (函数形式可按 url 动态返回)
 */
function installFetchMock() {
  const calls: string[] = [];

  const handler = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(typeof input === 'string' ? input : input.toString());
    const { pathname } = url;
    calls.push(pathname);

    // 单角色档案: /offset/chars/users/:username/archives/:code
    if (/^\/offset\/chars\/users\/[^/]+\/archives\/[^/]+$/.test(pathname)) {
      return tupleResponse([
        undefined,
        {
          code: 'romin',
          locales: ['zh'],
          items: { zh: archiveZhItem() },
        },
      ]);
    }

    // 用户信息及其角色摘要: /offset/chars/users/:username
    if (/^\/offset\/chars\/users\/[^/]+$/.test(pathname)) {
      return tupleResponse([
        undefined,
        {
          user: { code: 'rominwolf' },
          characters: [summary(), summary({ code: 'lupa', fullname: '露帕', nickname: '露帕' })],
        },
      ]);
    }

    // 全站角色摘要: /offset/chars/characters
    if (pathname === '/offset/chars/characters') {
      return tupleResponse([
        undefined,
        {
          characters: [
            summary(),
            summary({ username: 'other', code: 'x', fullname: 'X', department: 'engineering' }),
          ],
        },
      ]);
    }

    // 短链接分享码: /offset/chars/shares/:shareCode
    if (/^\/offset\/chars\/shares\/[^/]+$/.test(pathname)) {
      return tupleResponse([
        undefined,
        {
          code: 'romincode',
          method: 'char',
          char: { username: 'rominwolf', code: 'romin' },
        },
      ]);
    }

    throw new Error(`Unexpected fetch to ${pathname}`);
  });

  vi.stubGlobal('fetch', handler);
  return { calls };
}

// ============================================================================
// Tests
// ============================================================================

describe('adapter', () => {
  let mock: { calls: string[] };

  beforeEach(() => {
    mock = installFetchMock();
  });

  afterEach(async () => {
    await adapter.dispose?.();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('exposes correct manifest', () => {
    expect(adapter.manifest.name).toBe('repost-adapter-offset-char');
    expect(adapter.manifest.provider).toBe('offset-char');
    expect(adapter.manifest.whitelistHosts).toContain('oc.wsm.ink');
  });

  it('registers handler on init', async () => {
    const { ctx } = createMockContext();
    await adapter.initState(ctx);
    expect(ctx.on).toHaveBeenCalledWith(
      'onRepostRequest',
      expect.any(Function)
    );
  });

  it('handles a single character archive (post)', async () => {
    const { ctx, getHandler } = createMockContext({ apiKey: 'test-key' });
    await adapter.initState(ctx);

    const result = await getHandler()({
      source: 'https://oc.wsm.ink/rominwolf/romin',
      code: 'test',
      requester: { userId: 'R_UID', nickname: 'R_NAME' },
    });

    expect(result).not.toBeNull();
    expect(result!.method).toBe('post');
    expect(result!.postId).toBe('rominwolf/romin');
    expect(result!.author.nickname).toBe('罗敏·沃尔夫');
    expect(result!.images).toEqual([
      'https://cdn.wsm.ink/ref/1.png',
      'https://cdn.wsm.ink/ref/2.png',
    ]);
    expect(mock.calls).toContain('/offset/chars/users/rominwolf/archives/romin');
  });

  it('resolves a short-link share code (post /s/:code)', async () => {
    const { ctx, getHandler } = createMockContext();
    await adapter.initState(ctx);

    const result = await getHandler()({
      source: 'https://oc.wsm.ink/s/romincode',
      code: 'test',
      requester: { userId: 'R_UID', nickname: 'R_NAME' },
    });

    expect(result).not.toBeNull();
    expect(result!.postId).toBe('rominwolf/romin');
    // 先解析 share, 再拉档案
    expect(mock.calls).toContain('/offset/chars/shares/romincode');
    expect(mock.calls).toContain('/offset/chars/users/rominwolf/archives/romin');
  });

  it('handles a user profile with character summaries (profile)', async () => {
    const { ctx, getHandler } = createMockContext();
    await adapter.initState(ctx);

    const result = await getHandler()({
      source: 'https://oc.wsm.ink/rominwolf',
      code: 'test',
      requester: { userId: 'R_UID', nickname: 'R_NAME' },
    });

    expect(result).not.toBeNull();
    expect(result!.method).toBe('profile');
    expect(result!.postId).toBe('rominwolf');
    expect(result!.content).toContain('共 2 位角色');
    // 平铺: 每行包含 名称（昵称）· 部门 · 职位 · Code
    expect(result!.content).toContain('罗敏·沃尔夫（罗敏） · 科学部 · 研究员 · romin');
    // 不再附带角色图片
    expect(result!.images).toBeUndefined();
    expect(mock.calls).toContain('/offset/chars/users/rominwolf');
  });

  it('handles the site-level character summary (post, empty path)', async () => {
    const { ctx, getHandler } = createMockContext();
    await adapter.initState(ctx);

    const result = await getHandler()({
      source: 'https://oc.wsm.ink/',
      code: 'test',
      requester: { userId: 'R_UID', nickname: 'R_NAME' },
    });

    expect(result).not.toBeNull();
    expect(result!.method).toBe('post');
    expect(result!.postId).toBe('characters');
    expect(result!.content).toContain('共 2 位角色');
    // 按部门分组: 组标题 + 组内 Code · 名称（昵称） · 职位
    expect(result!.content).toContain('【科学部】');
    expect(result!.content).toContain('【工程部】');
    expect(result!.content).toContain('romin · 罗敏·沃尔夫（罗敏） · 研究员');
    expect(result!.images).toBeUndefined();
    expect(mock.calls).toContain('/offset/chars/characters');
  });
});

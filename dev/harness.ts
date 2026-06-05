import type {
  Adapter,
  AdapterContext,
  RepostAdapterRequestParams,
  RepostAdapterResponsePayload,
  RepostHandler,
} from '@snowball-bot/repost-adapter';
import * as url from "node:url";

/**
 * 模拟核心的最小宿主环境，用于在 starter 项目本地调试 adapter，
 * 无需启动真正的 core。
 *
 * 行为差异：
 * - 不实现路由（所有 emitRepost 都直接交给已注册的 adapter）
 * - 不实现 provider/host 冲突检测
 * - config 由 harness 构造时传入，模拟 core 注入
 */
export class MockAdapterHost {
  private handler: RepostHandler | null = null;
  private adapter: Adapter | null = null;

  constructor(
    private readonly config: Record<string, unknown> = {}
  ) {}

  /**
   * 注册 adapter，触发其 initState
   */
  async register(adapter: Adapter): Promise<void> {
    if (this.adapter) {
      throw new Error('MockAdapterHost only supports one adapter at a time');
    }
    this.adapter = adapter;

    const ctx = this.buildContext();
    await adapter.initState(ctx);

    if (!this.handler) {
      throw new Error(
        `Adapter ${adapter.manifest.name} did not register an onRepostRequest handler`
      );
    }

    console.log(`✓ Registered ${adapter.manifest.name} (${adapter.manifest.provider})`);
    console.log(`  whitelistHosts: ${adapter.manifest.whitelistHosts.join(', ')}`);
  }

  /**
   * 模拟核心收到消息后的转发触发
   */
  async emitRepost(url: string): Promise<RepostAdapterResponsePayload | null> {
    if (!this.handler || !this.adapter) {
      throw new Error('No adapter registered');
    }

    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

    // 验证 host 命中 whitelistHosts（mimic core 路由）
    if (!this.adapter.manifest.whitelistHosts.includes(host)) {
      console.warn(
        `⚠ URL host "${host}" not in adapter's whitelistHosts. ` +
        `Real core would not route this to your adapter.`
      );
    }

    const req: RepostAdapterRequestParams = {
      source: url,
      code: `dev-${Date.now()}`,
      requester: {
        userId: '-1',
        nickname: 'DEVELOPER'
      },
    };

    console.log(`\n→ emitRepost: ${url}`);
    const result = await this.handler(req);
    console.log(`← response:`, result);
    return result;
  }

  /**
   * 释放
   */
  async dispose(): Promise<void> {
    await this.adapter?.dispose?.();
  }

  private buildContext(): AdapterContext {
    return {
      on: (event, handler) => {
        if (event !== 'onRepostRequest') {
          throw new Error(`Unknown event: ${event}`);
        }
        if (this.handler) {
          throw new Error('Handler already registered');
        }
        this.handler = handler;
      },
      config: <T = unknown>(key: string) => this.config[key] as T | undefined,
      helper: {
        pick: (record, key, fallback) => record[key] ?? fallback!,
      },
      logger: {
        info: (msg, ...args) => console.log(`[info]`, msg, ...args),
        warn: (msg, ...args) => console.warn(`[warn]`, msg, ...args),
        error: (msg, ...args) => console.error(`[error]`, msg, ...args),
        debug: (msg, ...args) => console.log(`[debug]`, msg, ...args),
      },
    };
  }
}

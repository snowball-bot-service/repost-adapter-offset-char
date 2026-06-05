import 'dotenv/config';   // 自动加载 .env 文件
import adapter from '../src';
import { MockAdapterHost } from './harness';

async function main() {
  // 从环境变量构造 config，模拟 core 注入密钥
  const host = new MockAdapterHost({
    apiKey: process.env.MY_API_KEY,
    // 你 adapter 需要的其他配置都在这里塞
  });

  await host.register(adapter);

  // 测试 URL 列表：随便改、随便加
  const testUrls = [
    'https://example.com/posts/12345',
    'https://example.com/posts/67890',
    // 'https://twitter.com/x/status/123',  // 测错误情况：非 whitelistHosts
  ];

  for (const url of testUrls) {
    try {
      await host.emitRepost(url);
    } catch (err) {
      console.error(`✗ Failed:`, err);
    }
  }

  await host.dispose();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

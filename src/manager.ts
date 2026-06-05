import {HttpManager} from "./utils/http";
import {FetchPostFailedException, RepostMethod} from "@snowball-bot/repost-adapter";
import {FetchHandleDataFailedException} from "./utils/error";

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
 * @param numberOfPath 提取 Path 路径中的第几个，从 0 开始
 * @example Path: /post/114514 => numberOfPath: 1 => 114514
 */
export function extractHandleId(
  source: string, numberOfPath: number
): [RepostMethod, string] {
  const { pathname } = extractURL(source);
  const paths = pathname.split("/");

  // 如果分割的 Paths 首个为空，则删除
  if (paths.length > 1 && paths[0].length === 0) {
    paths.shift();
  }

  return [ "post", paths[numberOfPath] ];
}

/**
 * 进行对应的 API 请求，拿到 Handle Data
 * @param http
 * @param method
 * @param handleId
 */
export async function fetchHandleDataFromAPI<R extends object>(
  http: HttpManager, method: RepostMethod, handleId: string,
): Promise<R> {
  switch (method) {
    case "post":
      break;
    case "profile":
      break;
    case "live":
      break;
  }

  throw new FetchHandleDataFailedException(method, handleId, "No valid method matches.");
}

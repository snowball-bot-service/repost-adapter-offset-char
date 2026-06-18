import { ProcessMethod, RepostMethod } from '@snowball-bot/repost-adapter';

export abstract class SnowballException extends Error {
  protected constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * 获取 Handle Data 失败错误
 */
export class FetchHandleDataFailedException extends SnowballException {
  constructor(
    public readonly method: RepostMethod,
    public readonly handleId: string,
    public readonly msg: string
  ) {
    super(
      `Fetch Handle Data Failed Exception | Method: ${method} | Handle Id: ${handleId} | Message: ${msg}`
    );
  }
}

/**
 * 不支持的类型错误
 */
export class UnsupportedMethodException extends SnowballException {
  constructor(
    public readonly method: RepostMethod,
    public readonly handleId: string
  ) {
    super(
      `Unsupported Method Exception | Method: ${method} | Handle Id: ${handleId}`
    );
  }
}

/**
 * 不支持的进程错误
 */
export class UnsupportedProcessException extends SnowballException {
  constructor(
    public readonly process: ProcessMethod,
    public readonly source: string
  ) {
    super(
      `Unsupported Method Exception | Process: ${process} | Source: ${source}`
    );
  }
}

/**
 * 不支持的语言错误
 */
export class UnsupportedLanguageException extends SnowballException {
  constructor(
    public readonly code: string,
    public readonly locale: string,
  ) {
    super(
      `Unsupported Language Exception | Code: ${code} | Locale: ${locale}`
    );
  }
}

/**
 * 不支持的档案错误
 */
export class UnavailableArchiveException extends SnowballException {
  constructor(
    public readonly username: string,
    public readonly code: string,
    public readonly reason?: unknown,
  ) {
    super(`Unavailable Archive Exception | Handle: ${username}/${code} | Reason: ${reason}`);
  }
}

/**
 * 用户不可用错误
 *
 * 对应 OFFSET:CHAR:INVALID_USER / OFFSET:CHAR:FETCH_USER_FAILED
 */
export class UnavailableUserException extends SnowballException {
  constructor(
    public readonly username: string,
    public readonly reason?: unknown,
  ) {
    super(`Unavailable User Exception | Username: ${username} | Reason: ${reason}`);
  }
}

/**
 * 全站角色摘要不可用错误
 *
 * 对应 OFFSET:CHAR:FETCH_CHARACTERS_FAILED
 */
export class UnavailableCharactersException extends SnowballException {
  constructor(
    public readonly reason?: unknown,
  ) {
    super(`Unavailable Characters Exception | Reason: ${reason}`);
  }
}

/**
 * 分享码不可用错误
 */
export class UnavailableShareException extends SnowballException {
  constructor(
    public readonly shareCode: string,
    public readonly reason?: unknown,
  ) {
    super(`Unavailable Share Exception | ShareCode: ${shareCode} | Reason: ${reason}`);
  }
}

/**
 * 分享码不是角色对象错误
 */
export class NotCharShareException extends SnowballException {
  constructor(
    public readonly shareCode: string,
    public readonly reason?: unknown,
  ) {
    super(`Unavailable Share Exception | ShareCode: ${shareCode} | Reason: ${reason}`);
  }
}

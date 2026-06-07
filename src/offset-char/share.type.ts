export type Method = "url" | "char"

export interface GetSharePayload {
  code: string
  method: Method
  url?: ShareUrlPayload
  char?: ShareCharPayload
}

export interface ShareUrlPayload {
  to: string
}

export interface ShareCharPayload {
  code: string
  username: string
}

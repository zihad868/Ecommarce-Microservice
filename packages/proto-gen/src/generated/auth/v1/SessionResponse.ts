// Original file: contracts/proto/auth/v1/auth.proto

import type { User as _auth_v1_User, User__Output as _auth_v1_User__Output } from '../../auth/v1/User';
import type { TokensResponse as _auth_v1_TokensResponse, TokensResponse__Output as _auth_v1_TokensResponse__Output } from '../../auth/v1/TokensResponse';

export interface SessionResponse {
  'user'?: (_auth_v1_User | null);
  'tokens'?: (_auth_v1_TokensResponse | null);
}

export interface SessionResponse__Output {
  'user': (_auth_v1_User__Output | null);
  'tokens': (_auth_v1_TokensResponse__Output | null);
}

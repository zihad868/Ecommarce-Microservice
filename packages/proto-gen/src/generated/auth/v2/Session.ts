// Original file: contracts/proto/auth/v2/auth_v2.proto

import type { User as _auth_v2_User, User__Output as _auth_v2_User__Output } from '../../auth/v2/User';
import type { Tokens as _auth_v2_Tokens, Tokens__Output as _auth_v2_Tokens__Output } from '../../auth/v2/Tokens';

export interface Session {
  'user'?: (_auth_v2_User | null);
  'tokens'?: (_auth_v2_Tokens | null);
}

export interface Session__Output {
  'user': (_auth_v2_User__Output | null);
  'tokens': (_auth_v2_Tokens__Output | null);
}

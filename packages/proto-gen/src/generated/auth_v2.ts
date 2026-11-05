import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { AuthServiceClient as _auth_v2_AuthServiceClient, AuthServiceDefinition as _auth_v2_AuthServiceDefinition } from './auth/v2/AuthService';
import type { CredentialsRequest as _auth_v2_CredentialsRequest, CredentialsRequest__Output as _auth_v2_CredentialsRequest__Output } from './auth/v2/CredentialsRequest';
import type { LogoutResponse as _auth_v2_LogoutResponse, LogoutResponse__Output as _auth_v2_LogoutResponse__Output } from './auth/v2/LogoutResponse';
import type { RefreshRequest as _auth_v2_RefreshRequest, RefreshRequest__Output as _auth_v2_RefreshRequest__Output } from './auth/v2/RefreshRequest';
import type { Session as _auth_v2_Session, Session__Output as _auth_v2_Session__Output } from './auth/v2/Session';
import type { TokenIdentity as _auth_v2_TokenIdentity, TokenIdentity__Output as _auth_v2_TokenIdentity__Output } from './auth/v2/TokenIdentity';
import type { TokenRequest as _auth_v2_TokenRequest, TokenRequest__Output as _auth_v2_TokenRequest__Output } from './auth/v2/TokenRequest';
import type { Tokens as _auth_v2_Tokens, Tokens__Output as _auth_v2_Tokens__Output } from './auth/v2/Tokens';
import type { User as _auth_v2_User, User__Output as _auth_v2_User__Output } from './auth/v2/User';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  auth: {
    v2: {
      AuthService: SubtypeConstructor<typeof grpc.Client, _auth_v2_AuthServiceClient> & { service: _auth_v2_AuthServiceDefinition }
      CredentialsRequest: MessageTypeDefinition<_auth_v2_CredentialsRequest, _auth_v2_CredentialsRequest__Output>
      LogoutResponse: MessageTypeDefinition<_auth_v2_LogoutResponse, _auth_v2_LogoutResponse__Output>
      RefreshRequest: MessageTypeDefinition<_auth_v2_RefreshRequest, _auth_v2_RefreshRequest__Output>
      Session: MessageTypeDefinition<_auth_v2_Session, _auth_v2_Session__Output>
      TokenIdentity: MessageTypeDefinition<_auth_v2_TokenIdentity, _auth_v2_TokenIdentity__Output>
      TokenRequest: MessageTypeDefinition<_auth_v2_TokenRequest, _auth_v2_TokenRequest__Output>
      Tokens: MessageTypeDefinition<_auth_v2_Tokens, _auth_v2_Tokens__Output>
      User: MessageTypeDefinition<_auth_v2_User, _auth_v2_User__Output>
    }
  }
}


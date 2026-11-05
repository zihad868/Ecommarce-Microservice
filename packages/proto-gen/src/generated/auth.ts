import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { AuthServiceClient as _auth_v1_AuthServiceClient, AuthServiceDefinition as _auth_v1_AuthServiceDefinition } from './auth/v1/AuthService';
import type { CredentialsRequest as _auth_v1_CredentialsRequest, CredentialsRequest__Output as _auth_v1_CredentialsRequest__Output } from './auth/v1/CredentialsRequest';
import type { RefreshRequest as _auth_v1_RefreshRequest, RefreshRequest__Output as _auth_v1_RefreshRequest__Output } from './auth/v1/RefreshRequest';
import type { SessionResponse as _auth_v1_SessionResponse, SessionResponse__Output as _auth_v1_SessionResponse__Output } from './auth/v1/SessionResponse';
import type { TokenRequest as _auth_v1_TokenRequest, TokenRequest__Output as _auth_v1_TokenRequest__Output } from './auth/v1/TokenRequest';
import type { TokenResponse as _auth_v1_TokenResponse, TokenResponse__Output as _auth_v1_TokenResponse__Output } from './auth/v1/TokenResponse';
import type { TokensResponse as _auth_v1_TokensResponse, TokensResponse__Output as _auth_v1_TokensResponse__Output } from './auth/v1/TokensResponse';
import type { User as _auth_v1_User, User__Output as _auth_v1_User__Output } from './auth/v1/User';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  auth: {
    v1: {
      AuthService: SubtypeConstructor<typeof grpc.Client, _auth_v1_AuthServiceClient> & { service: _auth_v1_AuthServiceDefinition }
      CredentialsRequest: MessageTypeDefinition<_auth_v1_CredentialsRequest, _auth_v1_CredentialsRequest__Output>
      RefreshRequest: MessageTypeDefinition<_auth_v1_RefreshRequest, _auth_v1_RefreshRequest__Output>
      SessionResponse: MessageTypeDefinition<_auth_v1_SessionResponse, _auth_v1_SessionResponse__Output>
      TokenRequest: MessageTypeDefinition<_auth_v1_TokenRequest, _auth_v1_TokenRequest__Output>
      TokenResponse: MessageTypeDefinition<_auth_v1_TokenResponse, _auth_v1_TokenResponse__Output>
      TokensResponse: MessageTypeDefinition<_auth_v1_TokensResponse, _auth_v1_TokensResponse__Output>
      User: MessageTypeDefinition<_auth_v1_User, _auth_v1_User__Output>
    }
  }
}


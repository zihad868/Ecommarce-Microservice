// Original file: contracts/proto/auth/v1/auth.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { CredentialsRequest as _auth_v1_CredentialsRequest, CredentialsRequest__Output as _auth_v1_CredentialsRequest__Output } from '../../auth/v1/CredentialsRequest';
import type { RefreshRequest as _auth_v1_RefreshRequest, RefreshRequest__Output as _auth_v1_RefreshRequest__Output } from '../../auth/v1/RefreshRequest';
import type { SessionResponse as _auth_v1_SessionResponse, SessionResponse__Output as _auth_v1_SessionResponse__Output } from '../../auth/v1/SessionResponse';
import type { TokenRequest as _auth_v1_TokenRequest, TokenRequest__Output as _auth_v1_TokenRequest__Output } from '../../auth/v1/TokenRequest';
import type { TokenResponse as _auth_v1_TokenResponse, TokenResponse__Output as _auth_v1_TokenResponse__Output } from '../../auth/v1/TokenResponse';
import type { TokensResponse as _auth_v1_TokensResponse, TokensResponse__Output as _auth_v1_TokensResponse__Output } from '../../auth/v1/TokensResponse';

export interface AuthServiceClient extends grpc.Client {
  Login(argument: _auth_v1_CredentialsRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v1_SessionResponse__Output>): grpc.ClientUnaryCall;
  Login(argument: _auth_v1_CredentialsRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_auth_v1_SessionResponse__Output>): grpc.ClientUnaryCall;
  Login(argument: _auth_v1_CredentialsRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v1_SessionResponse__Output>): grpc.ClientUnaryCall;
  Login(argument: _auth_v1_CredentialsRequest, callback: grpc.requestCallback<_auth_v1_SessionResponse__Output>): grpc.ClientUnaryCall;
  login(argument: _auth_v1_CredentialsRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v1_SessionResponse__Output>): grpc.ClientUnaryCall;
  login(argument: _auth_v1_CredentialsRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_auth_v1_SessionResponse__Output>): grpc.ClientUnaryCall;
  login(argument: _auth_v1_CredentialsRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v1_SessionResponse__Output>): grpc.ClientUnaryCall;
  login(argument: _auth_v1_CredentialsRequest, callback: grpc.requestCallback<_auth_v1_SessionResponse__Output>): grpc.ClientUnaryCall;
  
  Refresh(argument: _auth_v1_RefreshRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v1_TokensResponse__Output>): grpc.ClientUnaryCall;
  Refresh(argument: _auth_v1_RefreshRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_auth_v1_TokensResponse__Output>): grpc.ClientUnaryCall;
  Refresh(argument: _auth_v1_RefreshRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v1_TokensResponse__Output>): grpc.ClientUnaryCall;
  Refresh(argument: _auth_v1_RefreshRequest, callback: grpc.requestCallback<_auth_v1_TokensResponse__Output>): grpc.ClientUnaryCall;
  refresh(argument: _auth_v1_RefreshRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v1_TokensResponse__Output>): grpc.ClientUnaryCall;
  refresh(argument: _auth_v1_RefreshRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_auth_v1_TokensResponse__Output>): grpc.ClientUnaryCall;
  refresh(argument: _auth_v1_RefreshRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v1_TokensResponse__Output>): grpc.ClientUnaryCall;
  refresh(argument: _auth_v1_RefreshRequest, callback: grpc.requestCallback<_auth_v1_TokensResponse__Output>): grpc.ClientUnaryCall;
  
  Register(argument: _auth_v1_CredentialsRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v1_SessionResponse__Output>): grpc.ClientUnaryCall;
  Register(argument: _auth_v1_CredentialsRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_auth_v1_SessionResponse__Output>): grpc.ClientUnaryCall;
  Register(argument: _auth_v1_CredentialsRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v1_SessionResponse__Output>): grpc.ClientUnaryCall;
  Register(argument: _auth_v1_CredentialsRequest, callback: grpc.requestCallback<_auth_v1_SessionResponse__Output>): grpc.ClientUnaryCall;
  register(argument: _auth_v1_CredentialsRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v1_SessionResponse__Output>): grpc.ClientUnaryCall;
  register(argument: _auth_v1_CredentialsRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_auth_v1_SessionResponse__Output>): grpc.ClientUnaryCall;
  register(argument: _auth_v1_CredentialsRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v1_SessionResponse__Output>): grpc.ClientUnaryCall;
  register(argument: _auth_v1_CredentialsRequest, callback: grpc.requestCallback<_auth_v1_SessionResponse__Output>): grpc.ClientUnaryCall;
  
  ValidateToken(argument: _auth_v1_TokenRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v1_TokenResponse__Output>): grpc.ClientUnaryCall;
  ValidateToken(argument: _auth_v1_TokenRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_auth_v1_TokenResponse__Output>): grpc.ClientUnaryCall;
  ValidateToken(argument: _auth_v1_TokenRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v1_TokenResponse__Output>): grpc.ClientUnaryCall;
  ValidateToken(argument: _auth_v1_TokenRequest, callback: grpc.requestCallback<_auth_v1_TokenResponse__Output>): grpc.ClientUnaryCall;
  validateToken(argument: _auth_v1_TokenRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v1_TokenResponse__Output>): grpc.ClientUnaryCall;
  validateToken(argument: _auth_v1_TokenRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_auth_v1_TokenResponse__Output>): grpc.ClientUnaryCall;
  validateToken(argument: _auth_v1_TokenRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v1_TokenResponse__Output>): grpc.ClientUnaryCall;
  validateToken(argument: _auth_v1_TokenRequest, callback: grpc.requestCallback<_auth_v1_TokenResponse__Output>): grpc.ClientUnaryCall;
  
}

export interface AuthServiceHandlers extends grpc.UntypedServiceImplementation {
  Login: grpc.handleUnaryCall<_auth_v1_CredentialsRequest__Output, _auth_v1_SessionResponse>;
  
  Refresh: grpc.handleUnaryCall<_auth_v1_RefreshRequest__Output, _auth_v1_TokensResponse>;
  
  Register: grpc.handleUnaryCall<_auth_v1_CredentialsRequest__Output, _auth_v1_SessionResponse>;
  
  ValidateToken: grpc.handleUnaryCall<_auth_v1_TokenRequest__Output, _auth_v1_TokenResponse>;
  
}

export interface AuthServiceDefinition extends grpc.ServiceDefinition {
  Login: MethodDefinition<_auth_v1_CredentialsRequest, _auth_v1_SessionResponse, _auth_v1_CredentialsRequest__Output, _auth_v1_SessionResponse__Output>
  Refresh: MethodDefinition<_auth_v1_RefreshRequest, _auth_v1_TokensResponse, _auth_v1_RefreshRequest__Output, _auth_v1_TokensResponse__Output>
  Register: MethodDefinition<_auth_v1_CredentialsRequest, _auth_v1_SessionResponse, _auth_v1_CredentialsRequest__Output, _auth_v1_SessionResponse__Output>
  ValidateToken: MethodDefinition<_auth_v1_TokenRequest, _auth_v1_TokenResponse, _auth_v1_TokenRequest__Output, _auth_v1_TokenResponse__Output>
}

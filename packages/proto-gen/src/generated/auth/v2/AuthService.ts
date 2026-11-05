// Original file: contracts/proto/auth/v2/auth_v2.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { CredentialsRequest as _auth_v2_CredentialsRequest, CredentialsRequest__Output as _auth_v2_CredentialsRequest__Output } from '../../auth/v2/CredentialsRequest';
import type { LogoutResponse as _auth_v2_LogoutResponse, LogoutResponse__Output as _auth_v2_LogoutResponse__Output } from '../../auth/v2/LogoutResponse';
import type { RefreshRequest as _auth_v2_RefreshRequest, RefreshRequest__Output as _auth_v2_RefreshRequest__Output } from '../../auth/v2/RefreshRequest';
import type { Session as _auth_v2_Session, Session__Output as _auth_v2_Session__Output } from '../../auth/v2/Session';
import type { TokenIdentity as _auth_v2_TokenIdentity, TokenIdentity__Output as _auth_v2_TokenIdentity__Output } from '../../auth/v2/TokenIdentity';
import type { TokenRequest as _auth_v2_TokenRequest, TokenRequest__Output as _auth_v2_TokenRequest__Output } from '../../auth/v2/TokenRequest';
import type { Tokens as _auth_v2_Tokens, Tokens__Output as _auth_v2_Tokens__Output } from '../../auth/v2/Tokens';
import type { User as _auth_v2_User, User__Output as _auth_v2_User__Output } from '../../auth/v2/User';

export interface AuthServiceClient extends grpc.Client {
  GetUser(argument: _auth_v2_TokenRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v2_User__Output>): grpc.ClientUnaryCall;
  GetUser(argument: _auth_v2_TokenRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_auth_v2_User__Output>): grpc.ClientUnaryCall;
  GetUser(argument: _auth_v2_TokenRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v2_User__Output>): grpc.ClientUnaryCall;
  GetUser(argument: _auth_v2_TokenRequest, callback: grpc.requestCallback<_auth_v2_User__Output>): grpc.ClientUnaryCall;
  getUser(argument: _auth_v2_TokenRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v2_User__Output>): grpc.ClientUnaryCall;
  getUser(argument: _auth_v2_TokenRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_auth_v2_User__Output>): grpc.ClientUnaryCall;
  getUser(argument: _auth_v2_TokenRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v2_User__Output>): grpc.ClientUnaryCall;
  getUser(argument: _auth_v2_TokenRequest, callback: grpc.requestCallback<_auth_v2_User__Output>): grpc.ClientUnaryCall;
  
  Login(argument: _auth_v2_CredentialsRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v2_Session__Output>): grpc.ClientUnaryCall;
  Login(argument: _auth_v2_CredentialsRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_auth_v2_Session__Output>): grpc.ClientUnaryCall;
  Login(argument: _auth_v2_CredentialsRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v2_Session__Output>): grpc.ClientUnaryCall;
  Login(argument: _auth_v2_CredentialsRequest, callback: grpc.requestCallback<_auth_v2_Session__Output>): grpc.ClientUnaryCall;
  login(argument: _auth_v2_CredentialsRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v2_Session__Output>): grpc.ClientUnaryCall;
  login(argument: _auth_v2_CredentialsRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_auth_v2_Session__Output>): grpc.ClientUnaryCall;
  login(argument: _auth_v2_CredentialsRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v2_Session__Output>): grpc.ClientUnaryCall;
  login(argument: _auth_v2_CredentialsRequest, callback: grpc.requestCallback<_auth_v2_Session__Output>): grpc.ClientUnaryCall;
  
  Logout(argument: _auth_v2_RefreshRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v2_LogoutResponse__Output>): grpc.ClientUnaryCall;
  Logout(argument: _auth_v2_RefreshRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_auth_v2_LogoutResponse__Output>): grpc.ClientUnaryCall;
  Logout(argument: _auth_v2_RefreshRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v2_LogoutResponse__Output>): grpc.ClientUnaryCall;
  Logout(argument: _auth_v2_RefreshRequest, callback: grpc.requestCallback<_auth_v2_LogoutResponse__Output>): grpc.ClientUnaryCall;
  logout(argument: _auth_v2_RefreshRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v2_LogoutResponse__Output>): grpc.ClientUnaryCall;
  logout(argument: _auth_v2_RefreshRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_auth_v2_LogoutResponse__Output>): grpc.ClientUnaryCall;
  logout(argument: _auth_v2_RefreshRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v2_LogoutResponse__Output>): grpc.ClientUnaryCall;
  logout(argument: _auth_v2_RefreshRequest, callback: grpc.requestCallback<_auth_v2_LogoutResponse__Output>): grpc.ClientUnaryCall;
  
  Refresh(argument: _auth_v2_RefreshRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v2_Tokens__Output>): grpc.ClientUnaryCall;
  Refresh(argument: _auth_v2_RefreshRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_auth_v2_Tokens__Output>): grpc.ClientUnaryCall;
  Refresh(argument: _auth_v2_RefreshRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v2_Tokens__Output>): grpc.ClientUnaryCall;
  Refresh(argument: _auth_v2_RefreshRequest, callback: grpc.requestCallback<_auth_v2_Tokens__Output>): grpc.ClientUnaryCall;
  refresh(argument: _auth_v2_RefreshRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v2_Tokens__Output>): grpc.ClientUnaryCall;
  refresh(argument: _auth_v2_RefreshRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_auth_v2_Tokens__Output>): grpc.ClientUnaryCall;
  refresh(argument: _auth_v2_RefreshRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v2_Tokens__Output>): grpc.ClientUnaryCall;
  refresh(argument: _auth_v2_RefreshRequest, callback: grpc.requestCallback<_auth_v2_Tokens__Output>): grpc.ClientUnaryCall;
  
  Register(argument: _auth_v2_CredentialsRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v2_Session__Output>): grpc.ClientUnaryCall;
  Register(argument: _auth_v2_CredentialsRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_auth_v2_Session__Output>): grpc.ClientUnaryCall;
  Register(argument: _auth_v2_CredentialsRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v2_Session__Output>): grpc.ClientUnaryCall;
  Register(argument: _auth_v2_CredentialsRequest, callback: grpc.requestCallback<_auth_v2_Session__Output>): grpc.ClientUnaryCall;
  register(argument: _auth_v2_CredentialsRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v2_Session__Output>): grpc.ClientUnaryCall;
  register(argument: _auth_v2_CredentialsRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_auth_v2_Session__Output>): grpc.ClientUnaryCall;
  register(argument: _auth_v2_CredentialsRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v2_Session__Output>): grpc.ClientUnaryCall;
  register(argument: _auth_v2_CredentialsRequest, callback: grpc.requestCallback<_auth_v2_Session__Output>): grpc.ClientUnaryCall;
  
  ValidateToken(argument: _auth_v2_TokenRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v2_TokenIdentity__Output>): grpc.ClientUnaryCall;
  ValidateToken(argument: _auth_v2_TokenRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_auth_v2_TokenIdentity__Output>): grpc.ClientUnaryCall;
  ValidateToken(argument: _auth_v2_TokenRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v2_TokenIdentity__Output>): grpc.ClientUnaryCall;
  ValidateToken(argument: _auth_v2_TokenRequest, callback: grpc.requestCallback<_auth_v2_TokenIdentity__Output>): grpc.ClientUnaryCall;
  validateToken(argument: _auth_v2_TokenRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v2_TokenIdentity__Output>): grpc.ClientUnaryCall;
  validateToken(argument: _auth_v2_TokenRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_auth_v2_TokenIdentity__Output>): grpc.ClientUnaryCall;
  validateToken(argument: _auth_v2_TokenRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_auth_v2_TokenIdentity__Output>): grpc.ClientUnaryCall;
  validateToken(argument: _auth_v2_TokenRequest, callback: grpc.requestCallback<_auth_v2_TokenIdentity__Output>): grpc.ClientUnaryCall;
  
}

export interface AuthServiceHandlers extends grpc.UntypedServiceImplementation {
  GetUser: grpc.handleUnaryCall<_auth_v2_TokenRequest__Output, _auth_v2_User>;
  
  Login: grpc.handleUnaryCall<_auth_v2_CredentialsRequest__Output, _auth_v2_Session>;
  
  Logout: grpc.handleUnaryCall<_auth_v2_RefreshRequest__Output, _auth_v2_LogoutResponse>;
  
  Refresh: grpc.handleUnaryCall<_auth_v2_RefreshRequest__Output, _auth_v2_Tokens>;
  
  Register: grpc.handleUnaryCall<_auth_v2_CredentialsRequest__Output, _auth_v2_Session>;
  
  ValidateToken: grpc.handleUnaryCall<_auth_v2_TokenRequest__Output, _auth_v2_TokenIdentity>;
  
}

export interface AuthServiceDefinition extends grpc.ServiceDefinition {
  GetUser: MethodDefinition<_auth_v2_TokenRequest, _auth_v2_User, _auth_v2_TokenRequest__Output, _auth_v2_User__Output>
  Login: MethodDefinition<_auth_v2_CredentialsRequest, _auth_v2_Session, _auth_v2_CredentialsRequest__Output, _auth_v2_Session__Output>
  Logout: MethodDefinition<_auth_v2_RefreshRequest, _auth_v2_LogoutResponse, _auth_v2_RefreshRequest__Output, _auth_v2_LogoutResponse__Output>
  Refresh: MethodDefinition<_auth_v2_RefreshRequest, _auth_v2_Tokens, _auth_v2_RefreshRequest__Output, _auth_v2_Tokens__Output>
  Register: MethodDefinition<_auth_v2_CredentialsRequest, _auth_v2_Session, _auth_v2_CredentialsRequest__Output, _auth_v2_Session__Output>
  ValidateToken: MethodDefinition<_auth_v2_TokenRequest, _auth_v2_TokenIdentity, _auth_v2_TokenRequest__Output, _auth_v2_TokenIdentity__Output>
}

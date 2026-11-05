// Original file: contracts/proto/auth/v1/auth.proto


export interface TokenResponse {
  'valid'?: (boolean);
  'userId'?: (string);
  'error'?: (string);
  'role'?: (string);
}

export interface TokenResponse__Output {
  'valid': (boolean);
  'userId': (string);
  'error': (string);
  'role': (string);
}

// Original file: contracts/proto/payment/v1/payment.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { CreatePaymentRequest as _payment_v1_CreatePaymentRequest, CreatePaymentRequest__Output as _payment_v1_CreatePaymentRequest__Output } from '../../payment/v1/CreatePaymentRequest';
import type { CreatePaymentResponse as _payment_v1_CreatePaymentResponse, CreatePaymentResponse__Output as _payment_v1_CreatePaymentResponse__Output } from '../../payment/v1/CreatePaymentResponse';

export interface PaymentServiceClient extends grpc.Client {
  CreatePayment(argument: _payment_v1_CreatePaymentRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_payment_v1_CreatePaymentResponse__Output>): grpc.ClientUnaryCall;
  CreatePayment(argument: _payment_v1_CreatePaymentRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_payment_v1_CreatePaymentResponse__Output>): grpc.ClientUnaryCall;
  CreatePayment(argument: _payment_v1_CreatePaymentRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_payment_v1_CreatePaymentResponse__Output>): grpc.ClientUnaryCall;
  CreatePayment(argument: _payment_v1_CreatePaymentRequest, callback: grpc.requestCallback<_payment_v1_CreatePaymentResponse__Output>): grpc.ClientUnaryCall;
  createPayment(argument: _payment_v1_CreatePaymentRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_payment_v1_CreatePaymentResponse__Output>): grpc.ClientUnaryCall;
  createPayment(argument: _payment_v1_CreatePaymentRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_payment_v1_CreatePaymentResponse__Output>): grpc.ClientUnaryCall;
  createPayment(argument: _payment_v1_CreatePaymentRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_payment_v1_CreatePaymentResponse__Output>): grpc.ClientUnaryCall;
  createPayment(argument: _payment_v1_CreatePaymentRequest, callback: grpc.requestCallback<_payment_v1_CreatePaymentResponse__Output>): grpc.ClientUnaryCall;
  
}

export interface PaymentServiceHandlers extends grpc.UntypedServiceImplementation {
  CreatePayment: grpc.handleUnaryCall<_payment_v1_CreatePaymentRequest__Output, _payment_v1_CreatePaymentResponse>;
  
}

export interface PaymentServiceDefinition extends grpc.ServiceDefinition {
  CreatePayment: MethodDefinition<_payment_v1_CreatePaymentRequest, _payment_v1_CreatePaymentResponse, _payment_v1_CreatePaymentRequest__Output, _payment_v1_CreatePaymentResponse__Output>
}

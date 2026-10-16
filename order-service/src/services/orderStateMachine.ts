import httpStatus from 'http-status';
import { ApiError } from '@ecommerce/common';
import { OrderStatus } from '../utils/prismaClient';

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.COMPLETED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

export const canTransition = (current: OrderStatus, target: OrderStatus): boolean => {
  return VALID_TRANSITIONS[current].includes(target);
};

export const validateTransition = (current: OrderStatus, target: OrderStatus): void => {
  if (!canTransition(current, target)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot transition order from status '${current}' to '${target}'. Allowed transitions: ${
        VALID_TRANSITIONS[current].join(', ') || 'none'
      }`,
    );
  }
};

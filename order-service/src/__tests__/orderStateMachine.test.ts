import { describe, it, expect } from 'vitest';
import { canTransition, validateTransition } from '../services/orderStateMachine';
import { OrderStatus } from '../utils/prismaClient';

describe('Order State Machine', () => {
  it('allows valid progression: PENDING -> CONFIRMED -> PAID -> SHIPPED -> COMPLETED', () => {
    expect(canTransition(OrderStatus.PENDING, OrderStatus.CONFIRMED)).toBe(true);
    expect(canTransition(OrderStatus.CONFIRMED, OrderStatus.PAID)).toBe(true);
    expect(canTransition(OrderStatus.PAID, OrderStatus.SHIPPED)).toBe(true);
    expect(canTransition(OrderStatus.SHIPPED, OrderStatus.COMPLETED)).toBe(true);
  });

  it('allows cancellation from PENDING, CONFIRMED, or PAID', () => {
    expect(canTransition(OrderStatus.PENDING, OrderStatus.CANCELLED)).toBe(true);
    expect(canTransition(OrderStatus.CONFIRMED, OrderStatus.CANCELLED)).toBe(true);
    expect(canTransition(OrderStatus.PAID, OrderStatus.CANCELLED)).toBe(true);
  });

  it('disallows invalid transitions', () => {
    expect(canTransition(OrderStatus.CANCELLED, OrderStatus.CONFIRMED)).toBe(false);
    expect(canTransition(OrderStatus.COMPLETED, OrderStatus.CANCELLED)).toBe(false);
    expect(canTransition(OrderStatus.PENDING, OrderStatus.COMPLETED)).toBe(false);
    expect(canTransition(OrderStatus.CONFIRMED, OrderStatus.SHIPPED)).toBe(false);
  });

  it('throws ApiError with status 400 on illegal transition', () => {
    expect(() => {
      validateTransition(OrderStatus.CANCELLED, OrderStatus.PAID);
    }).toThrow(/Cannot transition order from status 'CANCELLED' to 'PAID'/);
  });
});

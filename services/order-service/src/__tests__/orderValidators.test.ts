import { describe, it, expect } from 'vitest';
import { createOrderSchema, listOrdersQuerySchema } from '../validators/orderValidators';

describe('Order Validators', () => {
  describe('createOrderSchema', () => {
    it('merges duplicate items with identical product IDs', () => {
      const payload = {
        items: [
          { productId: 'prod-1', quantity: 2 },
          { productId: 'prod-2', quantity: 1 },
          { productId: 'prod-1', quantity: 3 },
        ],
      };

      const result = createOrderSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.items).toHaveLength(2);
        const prod1 = result.data.items.find((i) => i.productId === 'prod-1');
        expect(prod1?.quantity).toBe(5);
      }
    });

    it('rejects order with zero or negative quantity', () => {
      const payload = {
        items: [{ productId: 'prod-1', quantity: 0 }],
      };
      expect(createOrderSchema.safeParse(payload).success).toBe(false);

      const payloadNeg = {
        items: [{ productId: 'prod-1', quantity: -2 }],
      };
      expect(createOrderSchema.safeParse(payloadNeg).success).toBe(false);
    });

    it('rejects quantity exceeding maximum limit 1000', () => {
      const payload = {
        items: [{ productId: 'prod-1', quantity: 1001 }],
      };
      expect(createOrderSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects empty items array', () => {
      expect(createOrderSchema.safeParse({ items: [] }).success).toBe(false);
    });
  });

  describe('listOrdersQuerySchema', () => {
    it('caps limit at 100', () => {
      const result = listOrdersQuerySchema.safeParse({ limit: '200' });
      expect(result.success).toBe(false);
    });
  });
});

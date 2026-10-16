import { describe, it, expect } from 'vitest';
import { createProductSchema, listProductsQuerySchema } from '../validators/productValidators';

describe('Product Validators', () => {
  describe('createProductSchema', () => {
    it('accepts valid product payload', () => {
      const payload = {
        name: 'Ergonomic Keyboard',
        price: 99.99,
        stock: 50,
        category: 'Electronics',
      };
      const result = createProductSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.attributes).toEqual({});
      }
    });

    it('rejects negative prices and stocks', () => {
      expect(
        createProductSchema.safeParse({
          name: 'Keyboard',
          price: -10,
          stock: 10,
          category: 'Tech',
        }).success,
      ).toBe(false);

      expect(
        createProductSchema.safeParse({
          name: 'Keyboard',
          price: 10,
          stock: -1,
          category: 'Tech',
        }).success,
      ).toBe(false);
    });

    it('rejects non-integer stock values', () => {
      const result = createProductSchema.safeParse({
        name: 'Keyboard',
        price: 10,
        stock: 5.5,
        category: 'Tech',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('listProductsQuerySchema', () => {
    it('caps limit at 100 to prevent DoS', () => {
      const result = listProductsQuerySchema.safeParse({
        page: '1',
        limit: '500',
      });
      expect(result.success).toBe(false);
    });

    it('applies defaults for page, limit, and sorting', () => {
      const result = listProductsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
        expect(result.data.sortBy).toBe('createdAt');
        expect(result.data.sortOrder).toBe('desc');
      }
    });
  });
});

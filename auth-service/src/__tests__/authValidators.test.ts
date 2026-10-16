import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema, refreshTokenSchema } from '../validators/authValidators';

describe('Auth Validators', () => {
  describe('registerSchema', () => {
    it('validates and normalizes valid user registration', () => {
      const input = {
        email: '  User@Example.COM  ',
        password: 'Password123!',
      };

      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('user@example.com');
        expect(result.data.role).toBe('USER');
      }
    });

    it('rejects invalid email addresses', () => {
      const input = {
        email: 'invalid-email',
        password: 'Password123!',
      };

      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects weak passwords missing required character classes', () => {
      const weakPasswords = [
        'short1!', // < 8 chars
        'alllowercase1!', // no uppercase
        'ALLUPPERCASE1!', // no lowercase
        'NoSpecial1234', // no special char
        'NoNumbersHere!', // no number
      ];

      for (const password of weakPasswords) {
        const result = registerSchema.safeParse({
          email: 'test@example.com',
          password,
        });
        expect(result.success).toBe(false);
      }
    });
  });

  describe('loginSchema', () => {
    it('normalizes email during login', () => {
      const result = loginSchema.safeParse({
        email: 'Test@EXAMPLE.com',
        password: 'anyPassword',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
      }
    });

    it('rejects missing password', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('refreshTokenSchema', () => {
    it('validates presence of refreshToken', () => {
      expect(refreshTokenSchema.safeParse({ refreshToken: 'valid-token' }).success).toBe(true);
      expect(refreshTokenSchema.safeParse({ refreshToken: '' }).success).toBe(false);
    });
  });
});

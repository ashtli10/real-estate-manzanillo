import { describe, it, expect } from 'vitest';
import {
  isValidUsername,
  formatUsernameError,
  USERNAME_REGEX,
} from './user';

describe('User Types - Validation Helpers', () => {
  describe('USERNAME_REGEX', () => {
    it('matches valid usernames', () => {
      const validUsernames = [
        'john',
        'john123',
        'john_doe',
        'john-doe',
        'user_name-123',
        'abc',
        'a1b2c3',
        '123abc',
        'a-b-c',
        'a_b_c',
        'abcdefghijklmnopqrstuvwxyz1234', // 30 chars
      ];

      validUsernames.forEach((username) => {
        expect(USERNAME_REGEX.test(username)).toBe(true);
      });
    });

    it('rejects usernames with uppercase letters', () => {
      const invalidUsernames = ['John', 'JOHN', 'JohnDoe', 'john_DOE'];

      invalidUsernames.forEach((username) => {
        expect(USERNAME_REGEX.test(username)).toBe(false);
      });
    });

    it('rejects usernames with special characters', () => {
      const invalidUsernames = [
        'john.doe',
        'john@doe',
        'john doe',
        'john!',
        'john#123',
        'john$',
        'john%',
        'john&',
        'john*',
      ];

      invalidUsernames.forEach((username) => {
        expect(USERNAME_REGEX.test(username)).toBe(false);
      });
    });

    it('rejects usernames that are too short', () => {
      const invalidUsernames = ['a', 'ab', '1', '12'];

      invalidUsernames.forEach((username) => {
        expect(USERNAME_REGEX.test(username)).toBe(false);
      });
    });

    it('rejects usernames that are too long', () => {
      const tooLong = 'a'.repeat(31); // 31 characters
      expect(USERNAME_REGEX.test(tooLong)).toBe(false);
    });

    it('rejects empty string', () => {
      expect(USERNAME_REGEX.test('')).toBe(false);
    });
  });

  describe('isValidUsername', () => {
    it('returns true for valid usernames', () => {
      expect(isValidUsername('barbara')).toBe(true);
      expect(isValidUsername('agent_123')).toBe(true);
      expect(isValidUsername('real-estate-pro')).toBe(true);
      expect(isValidUsername('abc')).toBe(true);
    });

    it('returns false for invalid usernames', () => {
      expect(isValidUsername('')).toBe(false);
      expect(isValidUsername('ab')).toBe(false);
      expect(isValidUsername('John')).toBe(false);
      expect(isValidUsername('john@doe')).toBe(false);
      expect(isValidUsername('a'.repeat(31))).toBe(false);
    });
  });

  describe('formatUsernameError', () => {
    it('returns null for valid usernames', () => {
      expect(formatUsernameError('barbara')).toBeNull();
      expect(formatUsernameError('agent_123')).toBeNull();
      expect(formatUsernameError('real-estate-pro')).toBeNull();
    });

    it('returns error for empty username', () => {
      expect(formatUsernameError('')).toBe('El nombre de usuario es requerido');
    });

    it('returns error for short usernames', () => {
      expect(formatUsernameError('ab')).toBe('Mínimo 3 caracteres');
      expect(formatUsernameError('a')).toBe('Mínimo 3 caracteres');
    });

    it('returns error for long usernames', () => {
      const tooLong = 'a'.repeat(31);
      expect(formatUsernameError(tooLong)).toBe('Máximo 30 caracteres');
    });

    it('returns error for invalid characters', () => {
      expect(formatUsernameError('John')).toBe(
        'Solo letras minúsculas, números, guiones y guiones bajos'
      );
      expect(formatUsernameError('john@doe')).toBe(
        'Solo letras minúsculas, números, guiones y guiones bajos'
      );
      expect(formatUsernameError('john doe')).toBe(
        'Solo letras minúsculas, números, guiones y guiones bajos'
      );
    });

    it('prioritizes length errors over character errors', () => {
      // Short with invalid chars - shows length error first
      expect(formatUsernameError('AB')).toBe('Mínimo 3 caracteres');
    });
  });
});

import { vi } from 'vitest';

export const mockStandardUser = {
  uid: 'user_std_123',
  email: 'mindreflect.user@example.com',
  name: 'Standard User',
  admin: false,
  role: 'user',
};

export const mockAdminUser = {
  uid: 'admin_sys_999',
  email: 'admin@mindreflect.ai',
  name: 'System Admin',
  admin: true,
  role: 'admin',
};

export const mockAnotherUser = {
  uid: 'user_other_456',
  email: 'other.user@example.com',
  name: 'Other User',
  admin: false,
  role: 'user',
};

export function setupFirebaseMocks() {
  const verifyIdTokenMock = vi.fn().mockImplementation(async (token: string) => {
    if (token === 'admin-token') {
      return {
        uid: mockAdminUser.uid,
        email: mockAdminUser.email,
        admin: true,
        role: 'admin',
      };
    }
    if (token === 'valid-user-token') {
      return {
        uid: mockStandardUser.uid,
        email: mockStandardUser.email,
        admin: false,
        role: 'user',
      };
    }
    if (token === 'other-user-token') {
      return {
        uid: mockAnotherUser.uid,
        email: mockAnotherUser.email,
        admin: false,
        role: 'user',
      };
    }
    throw new Error('Decoding Firebase ID token failed');
  });

  const setCustomUserClaimsMock = vi.fn().mockResolvedValue(undefined);

  return {
    verifyIdTokenMock,
    setCustomUserClaimsMock,
  };
}

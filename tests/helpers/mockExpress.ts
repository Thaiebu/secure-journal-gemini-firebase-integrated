import { Request, Response } from 'express';
import { vi } from 'vitest';

export interface MockResponse extends Response {
  statusCode: number;
  _jsonData: any;
  _sentData: any;
}

export function createMockReq(overrides: Partial<Request> = {}): Request {
  const req: Partial<Request> = {
    headers: {},
    body: {},
    query: {},
    params: {},
    ip: '127.0.0.1',
    user: undefined,
    ...overrides,
  };
  return req as Request;
}

export function createMockRes(): MockResponse {
  const res: Partial<MockResponse> = {
    statusCode: 200,
    _jsonData: null,
    _sentData: null,
  };

  res.status = vi.fn().mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });

  res.json = vi.fn().mockImplementation((data: any) => {
    res._jsonData = data;
    return res;
  });

  res.send = vi.fn().mockImplementation((data: any) => {
    res._sentData = data;
    return res;
  });

  res.setHeader = vi.fn().mockReturnThis();

  return res as MockResponse;
}

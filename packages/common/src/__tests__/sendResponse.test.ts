import { describe, expect, it, vi } from 'vitest';
import sendResponse from '../shared/sendResponse';
import type { Response } from 'express';

describe('sendResponse', () => {
  it('should format response with success, message, meta, and data', () => {
    const jsonMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    const res = { status: statusMock } as unknown as Response;

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Fetched successfully',
      data: { id: '123' },
    });

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith({
      success: true,
      message: 'Fetched successfully',
      meta: null,
      data: { id: '123' },
    });
  });
});

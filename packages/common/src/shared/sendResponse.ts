import type { Response } from 'express';

export interface IApiResponse<T> {
  statusCode: number;
  success: boolean;
  message: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    nextCursor?: string | null;
    prevCursor?: string | null;
  } | null;
  data: T | null | undefined;
}

/**
 * Sends a standardized JSON response envelope:
 * { success, message, meta, data }
 */
const sendResponse = <T>(res: Response, jsonData: IApiResponse<T>): void => {
  res.status(jsonData.statusCode).json({
    success: jsonData.success,
    message: jsonData.message,
    meta: jsonData.meta ?? null,
    data: jsonData.data ?? null,
  });
};

export default sendResponse;

import { Prisma } from '@prisma/client';
import { IGenericErrorMessage } from '../interfaces/error';

/**
 * Handles Prisma known request errors (e.g. record not found, FK violation).
 * Maps Prisma error codes to human-readable messages.
 */
const handleClientError = (error: Prisma.PrismaClientKnownRequestError) => {
  let errors: IGenericErrorMessage[] = [];
  let message = '';
  const statusCode = 400;

  if (error.code === 'P2025') {
    message = (error.meta?.cause as string) || 'Record not found!';
    errors = [{ path: '', message }];
  } else if (error.code === 'P2003') {
    if (error.message.includes('delete()` invocation:')) {
      message = 'Delete failed due to a related record dependency.';
      errors = [{ path: '', message }];
    } else {
      message = `Foreign key constraint failed on the field: ${error.meta?.field_name}`;
      errors = [
        {
          path: (error.meta?.field_name as string) || '',
          message,
        },
      ];
    }
  }

  return { statusCode, message, errorMessages: errors };
};

export default handleClientError;

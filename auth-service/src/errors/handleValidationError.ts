import { Prisma } from '@prisma/client';
import { IGenericErrorResponse } from '../interfaces/common';

/**
 * Handles Prisma validation errors (missing required fields, wrong types, etc.)
 * These occur when the query arguments themselves are structurally invalid.
 */
const handleValidationError = (
  error: Prisma.PrismaClientValidationError
): IGenericErrorResponse => {
  const errors = [
    {
      path: '',
      message: error.message,
    },
  ];

  return {
    statusCode: 400,
    message: 'Validation Error',
    errorMessages: errors,
  };
};

export default handleValidationError;

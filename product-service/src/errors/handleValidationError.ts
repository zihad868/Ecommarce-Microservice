import { Prisma } from '@prisma/client';
import { IGenericErrorResponse } from '../interfaces/common';

const handleValidationError = (
  error: Prisma.PrismaClientValidationError
): IGenericErrorResponse => {
  return {
    statusCode: 400,
    message: 'Validation Error',
    errorMessages: [{ path: '', message: error.message }],
  };
};

export default handleValidationError;

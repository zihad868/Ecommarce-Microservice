export interface IGenericErrorMessage {
  path: string | number;
  message: string;
}

export interface IGenericErrorResponse {
  statusCode: number;
  message: string;
  errorMessages: IGenericErrorMessage[];
}

export interface PrismaKnownError {
  code: string;
  meta?: Record<string, unknown>;
  message: string;
}

export interface PrismaValidationError {
  message: string;
}

const formatMeta = (val: unknown, fallback = ''): string => {
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.map((item) => String(item)).join(', ');
  if (val !== undefined && val !== null) {
    try {
      return JSON.stringify(val);
    } catch {
      return fallback;
    }
  }
  return fallback;
};

export const handlePrismaClientError = (error: PrismaKnownError): IGenericErrorResponse => {
  let statusCode = 400;
  let message = 'Database request error';
  const errorMessages: IGenericErrorMessage[] = [];

  switch (error.code) {
    case 'P2002': {
      const target = formatMeta(error.meta?.target, 'unique constraint');
      statusCode = 409;
      message = `Duplicate entry on field(s): ${target}`;
      errorMessages.push({ path: target, message });
      break;
    }
    case 'P2025': {
      const cause = formatMeta(error.meta?.cause, 'No matching record.');
      statusCode = 404;
      message = `Record not found: ${cause}`;
      errorMessages.push({ path: '', message });
      break;
    }
    case 'P2011': {
      const constraint = formatMeta(error.meta?.constraint, 'constraint');
      statusCode = 400;
      message = `Null constraint violation on: ${constraint}`;
      errorMessages.push({ path: constraint, message });
      break;
    }
    case 'P2003': {
      const field = formatMeta(error.meta?.field_name, 'field');
      statusCode = 400;
      message = `Foreign key constraint failed on: ${field}`;
      errorMessages.push({ path: field, message });
      break;
    }
    default:
      errorMessages.push({ path: '', message: error.message });
  }

  return { statusCode, message, errorMessages };
};

export const handlePrismaValidationError = (
  error: PrismaValidationError,
): IGenericErrorResponse => {
  const statusCode = 400;
  const message = 'Validation error';
  const errorMessages: IGenericErrorMessage[] = [{ path: '', message: error.message }];
  return { statusCode, message, errorMessages };
};

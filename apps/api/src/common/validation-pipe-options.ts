import {
  BadRequestException,
  type ValidationError,
  type ValidationPipeOptions,
} from '@nestjs/common';

function firstConstraint(error: ValidationError): {
  field: string;
  message: string;
} {
  if (error.constraints !== undefined) {
    const messages = Object.values(error.constraints);
    const message = messages[0];
    if (message !== undefined) {
      return { field: error.property, message };
    }
  }
  if (error.children !== undefined && error.children.length > 0) {
    for (const child of error.children) {
      const nested = firstConstraint(child);
      if (nested.field.length > 0) {
        return {
          field:
            nested.field.length > 0
              ? `${error.property}.${nested.field}`
              : error.property,
          message: nested.message,
        };
      }
    }
  }
  return { field: error.property, message: 'Validation failed' };
}

export const validationPipeOptions: ValidationPipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: false },
  exceptionFactory: (errors) => {
    const first = errors[0];
    const detail =
      first !== undefined
        ? firstConstraint(first)
        : { field: '', message: 'Validation failed' };

    return new BadRequestException({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: detail.message,
      ...(detail.field.length > 0 ? { field: detail.field } : {}),
    });
  },
};

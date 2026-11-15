import { ValidationPipe } from '@nestjs/common';
import { validationPipeOptions } from '../../src/common/validation-pipe-options';

export function createTestValidationPipe(): ValidationPipe {
  return new ValidationPipe(validationPipeOptions);
}

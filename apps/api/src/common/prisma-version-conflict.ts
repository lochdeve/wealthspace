import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export function rethrowVersionConflictFromPrisma(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    throw new ConflictException({
      statusCode: 409,
      code: 'VERSION_CONFLICT',
      message: 'Resource was modified by another request',
    });
  }
  throw error;
}

export async function runWithVersionConflictMapping<T>(
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    rethrowVersionConflictFromPrisma(error);
  }
}

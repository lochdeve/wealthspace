import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Category, CategoryType } from '@prisma/client';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { CategoryListItemDto } from './dto/category-response.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForSpace(
    spaceId: string,
    type?: CategoryType,
  ): Promise<CategoryListItemDto[]> {
    const categories = await this.prisma.category.findMany({
      where: {
        spaceId,
        ...(type !== undefined ? { type } : {}),
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
    return categories.map((category) => this.toListItem(category));
  }

  async createInSpace(
    spaceId: string,
    dto: CreateCategoryDto,
  ): Promise<CategoryListItemDto> {
    if (dto.parentId !== undefined) {
      const parent = await this.prisma.category.findFirst({
        where: { id: dto.parentId, spaceId },
      });
      if (parent === null) {
        throw new NotFoundException({
          statusCode: 404,
          code: 'CATEGORY_NOT_FOUND',
          message: 'Parent category not found',
        });
      }
      if (parent.type !== dto.type) {
        throw new BadRequestException({
          statusCode: 400,
          code: 'INVALID_CATEGORY_TYPE',
          message: 'Parent category must have the same type',
        });
      }
    }

    const category = await this.prisma.category.create({
      data: {
        spaceId,
        name: dto.name,
        type: dto.type,
        parentId: dto.parentId,
      },
    });

    return this.toListItem(category);
  }

  private toListItem(category: Category): CategoryListItemDto {
    return {
      id: category.id,
      type: category.type,
      name: category.name,
      parentId: category.parentId ?? undefined,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    };
  }
}

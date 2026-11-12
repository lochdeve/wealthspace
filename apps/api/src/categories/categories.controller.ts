import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CategoryType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SpaceMembershipGuard } from '../spaces/guards/space-membership.guard';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CategoryListItemDto } from './dto/category-response.dto';

@ApiTags('categories')
@Controller('spaces/:spaceId/categories')
@UseGuards(JwtAuthGuard, SpaceMembershipGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List categories' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: CategoryType,
  })
  @ApiOkResponse({ type: CategoryListItemDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  async list(
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Query('type', new ParseEnumPipe(CategoryType, { optional: true }))
    type?: CategoryType,
  ): Promise<CategoryListItemDto[]> {
    return this.categoriesService.listForSpace(spaceId, type);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create category' })
  @ApiCreatedResponse({ type: CategoryListItemDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  async create(
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @Body() dto: CreateCategoryDto,
  ): Promise<CategoryListItemDto> {
    return this.categoriesService.createInSpace(spaceId, dto);
  }
}

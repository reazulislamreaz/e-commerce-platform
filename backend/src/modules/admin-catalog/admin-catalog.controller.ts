import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@/generated/prisma/client';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import type { JwtPayload } from '@/modules/auth/jwt.strategy';
import { AdminCatalogService } from './admin-catalog.service';
import {
  AdminProductDetailResponseDto,
  AdminProductStatsResponseDto,
  AdminProductSummaryResponseDto,
} from './dto/admin-product-response.dto';
import { CreateBrandDto, BrandResponseDto, UpdateBrandDto } from './dto/brand.dto';
import { CategoryResponseDto, CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import {
  CollectionResponseDto,
  CreateCollectionDto,
  UpdateCollectionDto,
} from './dto/collection.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateProductPriceWindowDto } from './dto/create-product-price.dto';
import { ListAdminProductsQueryDto } from './dto/list-admin-products.query.dto';
import { ProductImageUploadResponseDto } from './dto/product-image-upload.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  productImageMulterOptions,
  ProductImageStorageService,
  type UploadedImageFile,
} from './product-image-storage.service';

@ApiTags('Admin Catalog')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@ApiForbiddenResponse({ description: 'Admin role required' })
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminCatalogController {
  constructor(
    private readonly adminCatalog: AdminCatalogService,
    private readonly productImages: ProductImageStorageService,
  ) {}

  @Get('products')
  @ApiOperation({ summary: 'List products including draft and archived states' })
  @ApiOkResponse({ type: [AdminProductSummaryResponseDto] })
  listProducts(@Query() query: ListAdminProductsQueryDto) {
    return this.adminCatalog.listProducts(query);
  }

  @Get('products/stats')
  @ApiOperation({ summary: 'Catalog counts by status and stock bucket for the products header' })
  @ApiOkResponse({ type: AdminProductStatsResponseDto })
  getProductStats() {
    return this.adminCatalog.getProductStats();
  }

  @Post('products')
  @ApiOperation({ summary: 'Create a draft product with variants, media, and opening price' })
  @ApiCreatedResponse({ type: AdminProductDetailResponseDto })
  @ApiConflictResponse({ description: 'Slug or SKU already exists' })
  createProduct(@CurrentUser() actor: JwtPayload, @Body() dto: CreateProductDto) {
    return this.adminCatalog.createProduct(actor, dto);
  }

  @Post('products/images')
  @UseInterceptors(FileInterceptor('file', productImageMulterOptions))
  @ApiOperation({
    summary: 'Upload a product image',
    description:
      'Accepts a single multipart JPEG/PNG/WebP file (max 8 MB), validates its binary signature, ' +
      'stores it under a server-generated name, and returns the served relative URL.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiCreatedResponse({ type: ProductImageUploadResponseDto })
  @ApiBadRequestResponse({ description: 'Missing, non-image, or mismatched file content' })
  @ApiPayloadTooLargeResponse({ description: 'Image exceeds 8 MB' })
  uploadProductImage(@UploadedFile() file?: UploadedImageFile) {
    return this.productImages.store(file);
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get a product by id for admin merchandising' })
  @ApiOkResponse({ type: AdminProductDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Product not found' })
  getProduct(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminCatalog.getProduct(id);
  }

  @Patch('products/:id')
  @ApiOperation({ summary: 'Update merchandising fields (status changes use lifecycle routes)' })
  @ApiOkResponse({ type: AdminProductDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Product not found' })
  updateProduct(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.adminCatalog.updateProduct(actor, id, dto);
  }

  @Post('products/:id/publish')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Publish a product',
    description: 'Requires at least one active variant, media item, and active price.',
  })
  @ApiOkResponse({ type: AdminProductDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Publish prerequisites not met' })
  publishProduct(@CurrentUser() actor: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.adminCatalog.publishProduct(actor, id);
  }

  @Post('products/:id/unpublish')
  @HttpCode(200)
  @ApiOperation({ summary: 'Move a product back to draft' })
  @ApiOkResponse({ type: AdminProductDetailResponseDto })
  unpublishProduct(@CurrentUser() actor: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.adminCatalog.unpublishProduct(actor, id);
  }

  @Post('products/:id/archive')
  @HttpCode(200)
  @ApiOperation({ summary: 'Archive a product' })
  @ApiOkResponse({ type: AdminProductDetailResponseDto })
  archiveProduct(@CurrentUser() actor: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.adminCatalog.archiveProduct(actor, id);
  }

  @Post('products/:id/prices')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Create a new price window',
    description: 'Closes the prior active window and updates product price projections.',
  })
  @ApiOkResponse({ type: AdminProductDetailResponseDto })
  addProductPrice(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProductPriceWindowDto,
  ) {
    return this.adminCatalog.addProductPrice(actor, id, dto);
  }

  @Get('brands')
  @ApiOperation({ summary: 'List brands' })
  @ApiOkResponse({ type: [BrandResponseDto] })
  listBrands() {
    return this.adminCatalog.listBrands();
  }

  @Post('brands')
  @ApiOperation({ summary: 'Create a brand' })
  @ApiCreatedResponse({ type: BrandResponseDto })
  createBrand(@CurrentUser() actor: JwtPayload, @Body() dto: CreateBrandDto) {
    return this.adminCatalog.createBrand(actor, dto);
  }

  @Get('brands/:id')
  @ApiOperation({ summary: 'Get a brand by id' })
  @ApiOkResponse({ type: BrandResponseDto })
  @ApiNotFoundResponse({ description: 'Brand not found' })
  getBrand(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminCatalog.getBrand(id);
  }

  @Patch('brands/:id')
  @ApiOperation({ summary: 'Update a brand' })
  @ApiOkResponse({ type: BrandResponseDto })
  updateBrand(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBrandDto,
  ) {
    return this.adminCatalog.updateBrand(actor, id, dto);
  }

  @Delete('brands/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft delete a brand' })
  @ApiNoContentResponse({ description: 'Brand deleted' })
  deleteBrand(@CurrentUser() actor: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.adminCatalog.deleteBrand(actor, id);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List categories' })
  @ApiOkResponse({ type: [CategoryResponseDto] })
  listCategories() {
    return this.adminCatalog.listCategories();
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create a category or subcategory' })
  @ApiCreatedResponse({ type: CategoryResponseDto })
  createCategory(@CurrentUser() actor: JwtPayload, @Body() dto: CreateCategoryDto) {
    return this.adminCatalog.createCategory(actor, dto);
  }

  @Get('categories/:id')
  @ApiOperation({ summary: 'Get a category by id' })
  @ApiOkResponse({ type: CategoryResponseDto })
  getCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminCatalog.getCategory(id);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Update a category' })
  @ApiOkResponse({ type: CategoryResponseDto })
  updateCategory(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.adminCatalog.updateCategory(actor, id, dto);
  }

  @Delete('categories/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft delete a category' })
  @ApiNoContentResponse({ description: 'Category deleted' })
  deleteCategory(@CurrentUser() actor: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.adminCatalog.deleteCategory(actor, id);
  }

  @Get('collections')
  @ApiOperation({ summary: 'List collections' })
  @ApiOkResponse({ type: [CollectionResponseDto] })
  listCollections() {
    return this.adminCatalog.listCollections();
  }

  @Post('collections')
  @ApiOperation({ summary: 'Create a collection' })
  @ApiCreatedResponse({ type: CollectionResponseDto })
  createCollection(@CurrentUser() actor: JwtPayload, @Body() dto: CreateCollectionDto) {
    return this.adminCatalog.createCollection(actor, dto);
  }

  @Get('collections/:id')
  @ApiOperation({ summary: 'Get a collection by id' })
  @ApiOkResponse({ type: CollectionResponseDto })
  getCollection(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminCatalog.getCollection(id);
  }

  @Patch('collections/:id')
  @ApiOperation({ summary: 'Update a collection' })
  @ApiOkResponse({ type: CollectionResponseDto })
  updateCollection(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCollectionDto,
  ) {
    return this.adminCatalog.updateCollection(actor, id, dto);
  }

  @Delete('collections/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft delete a collection' })
  @ApiNoContentResponse({ description: 'Collection deleted' })
  deleteCollection(@CurrentUser() actor: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.adminCatalog.deleteCollection(actor, id);
  }
}

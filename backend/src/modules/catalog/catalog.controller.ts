import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { CatalogService } from './catalog.service';
import {
  ListProductsQueryDto,
  ProductIdsQueryDto,
  ProductLimitQueryDto,
  ProductSearchQueryDto,
} from './dto/list-products.query.dto';
import { ProductFacetsResponseDto, ProductResponseDto } from './dto/product-response.dto';

@Public()
@ApiTags('Catalog')
@Controller('products')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  @ApiOperation({
    summary: 'List published products',
    description:
      'Server-side filtering, sorting, and offset pagination matching the storefront catalog.',
  })
  @ApiOkResponse({ type: [ProductResponseDto] })
  @ApiBadRequestResponse({ description: 'Invalid filter or price range' })
  list(@Query() query: ListProductsQueryDto) {
    return this.catalog.list(query);
  }

  @Get('facets')
  @ApiOperation({ summary: 'Get available catalog filter facets' })
  @ApiOkResponse({ type: ProductFacetsResponseDto })
  facets() {
    return this.catalog.facets();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search published products for autocomplete' })
  @ApiOkResponse({ type: [ProductResponseDto] })
  search(@Query() query: ProductSearchQueryDto) {
    return this.catalog.search(query);
  }

  @Get('by-ids')
  @ApiOperation({ summary: 'Resolve a batch of product IDs for cart and wishlist state' })
  @ApiOkResponse({ type: [ProductResponseDto] })
  byIds(@Query() query: ProductIdsQueryDto) {
    return this.catalog.getByIdentifiers(query.ids);
  }

  @Get('new-arrivals')
  @ApiOperation({ summary: 'Get newest published products' })
  @ApiOkResponse({ type: [ProductResponseDto] })
  newArrivals(@Query() query: ProductLimitQueryDto) {
    return this.catalog.newArrivals(query);
  }

  @Get('on-sale')
  @ApiOperation({ summary: 'Get published products with an active compare-at price' })
  @ApiOkResponse({ type: [ProductResponseDto] })
  onSale(@Query() query: ProductLimitQueryDto) {
    return this.catalog.onSale(query);
  }

  @Get('id/:id')
  @ApiOperation({ summary: 'Get a published product by UUID' })
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiNotFoundResponse({ description: 'Product not found' })
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.getByIdentifier(id);
  }

  @Get(':slug/related')
  @ApiOperation({ summary: 'Get related products by category or collection' })
  @ApiOkResponse({ type: [ProductResponseDto] })
  @ApiNotFoundResponse({ description: 'Product not found' })
  related(@Param('slug') slug: string, @Query() query: ProductLimitQueryDto) {
    return this.catalog.related(slug, query);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a published product by slug' })
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiNotFoundResponse({ description: 'Product not found' })
  getBySlug(@Param('slug') slug: string) {
    return this.catalog.getBySlug(slug);
  }
}

@Public()
@ApiTags('Catalog')
@Controller()
export class TaxonomyController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('categories')
  @ApiOperation({ summary: 'List active storefront category names' })
  @ApiOkResponse({ type: [String] })
  async categories() {
    return (await this.catalog.facets()).categories;
  }

  @Get('brands')
  @ApiOperation({ summary: 'List active storefront brand names' })
  @ApiOkResponse({ type: [String] })
  async brands() {
    return (await this.catalog.facets()).brands;
  }
}

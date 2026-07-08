import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { CollectionService } from './collection.service';
import { SaveCollectionDto } from './dto/save-collection.dto';

@Controller('api/collections')
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @Get()
  async getCollections() {
    return this.collectionService.findAll();
  }

  @Post()
  @UseGuards(AdminGuard)
  async saveCollection(@Body() collectionData: SaveCollectionDto) {
    return this.collectionService.createOrUpdate(collectionData);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  async deleteCollection(@Param('id') id: string) {
    return this.collectionService.delete(id);
  }
}

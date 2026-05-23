import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { CollectionService } from './collection.service';

@Controller('api/collections')
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @Get()
  async getCollections() {
    return this.collectionService.findAll();
  }

  @Post()
  async saveCollection(@Body() collectionData: any) {
    return this.collectionService.createOrUpdate(collectionData);
  }

  @Delete(':id')
  async deleteCollection(@Param('id') id: string) {
    return this.collectionService.delete(id);
  }
}

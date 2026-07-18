import { Module } from '@nestjs/common';
import { AdminContactController, ContactController } from './contact.controller';
import { ContactRepository } from './contact.repository';
import { ContactService } from './contact.service';

@Module({
  controllers: [ContactController, AdminContactController],
  providers: [ContactRepository, ContactService],
})
export class ContactModule {}

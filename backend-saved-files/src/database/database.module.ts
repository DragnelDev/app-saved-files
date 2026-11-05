import { Global, Module } from '@nestjs/common';
import { DbSetupService } from './db-setup.service.js';

@Global()
@Module({ providers: [DbSetupService], exports: [DbSetupService] })
export class DatabaseModule {}

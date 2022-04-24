import { Module } from '@nestjs/common';
import User from './user/user.entity';
import AppController from './app.controller';
import AppService from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forRoot()],
  controllers: [AppController],
  providers: [AppService],
})
export default class AppModule {}

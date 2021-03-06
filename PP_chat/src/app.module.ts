import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user/user.module';
import AppController from './app.controller';
import AppService from './app.service';
import configuration from './configs/configuration';
import TypeOrmConfigService from './configs/typeorm.config';
import { AuthModule } from './auth/auth.module';
import { ChatroomsModule } from './chatrooms/chatrooms.module';
import { ChatroomsGateway } from './chatrooms/chatrooms.gateway';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useClass: TypeOrmConfigService,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    UserModule,
    AuthModule,
    ChatroomsModule,
  ],
  controllers: [AppController],
  providers: [AppService, ChatroomsGateway],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatBackEndModule } from './chatBackEnd/chatBackEnd.module';

@Module({
  imports: [ChatBackEndModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ChatBackEndGateway } from './chatBacnEnd.gateway';
import { ChatRoomService } from './chatRoom.service';

@Module({
  providers: [ChatBackEndGateway, ChatRoomService],
})
export class ChatBackEndModule {}

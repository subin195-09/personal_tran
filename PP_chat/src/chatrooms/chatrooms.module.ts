import { CacheModule, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import ChatParticipantRepository from './chat-participant.repository';
import ChatRepository from './chat.repository';
import ChatroomsController from './chatrooms.controller';
import { ChatroomsGateway } from './chatrooms.gateway';
import ChatroomsService from './chatrooms.service';
import MessageRepository from './message.repository';

@Module({
	imports: [
		EventEmitterModule.forRoot(), // socket event를 위한 module
		ScheduleModule.forRoot(), // cache -> db 를 주기적으로 옮기기 위한 module
		CacheModule.register({ ttl: 0 }), // cache 모듈, ttl : 주기적은 cache를 비워줌
	],
	controllers: [
		ChatroomsController,
	  ],
	  providers: [
		ChatroomsGateway,
		ChatroomsService,
		ChatRepository,
		MessageRepository,
		ChatParticipantRepository,
	  ],
})
export class ChatroomsModule { }

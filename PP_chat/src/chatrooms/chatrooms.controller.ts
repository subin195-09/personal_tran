import { Controller, Logger, UsePipes, ValidationPipe } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { ApiTags } from "@nestjs/swagger";

@ApiTags('채팅방')
@Controller('chatrooms')
@UsePipes(new ValidationPipe({ transform: true }))
export default class ChatroomsController {
	private readonly logger = new Logger(ChatroomsController.name);

	constructor(
		private chatroomsService: ChatroomsService,
		private eventRunner: EventEmitter2,
	) {}
}

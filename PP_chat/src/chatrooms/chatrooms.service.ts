import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export default class ChatroomsService {
	private readonly logger = new Logger(ChatroomsService.name);

	constructor(
		private readonly chatRepository: ChatRepository,
	) { }
}

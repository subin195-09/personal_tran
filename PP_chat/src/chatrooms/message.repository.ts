import { Injectable } from "@nestjs/common";

@Injectable()
export default class MessageRepository {
	MockEntity: any[] = [];

	constructor() {
		this.MockEntity.push({
			msgSeq: 0,
			chatSeq: 0,
			partcSeq: 1,
			msg: '안녕하세요',
			createAt: new Date(),
		});
	}

	saveMessage(message: any[]): any {
		message.forEach((message) => {
			this.MockEntity.push({
				msqSeq: message.msgSeq,
				chatSeq: message.chatSeq,
				partcSeq: message.from,
				msg: message.msg,
				createAt: message.createAt,
			});
		});
		return this.MockEntity[this.MockEntity.length - 1];
	}

	// 특정 메세지 이전 메시지만 조회하여 return
	getMessage(chatSeq: number, messageId: number, limit: number): any[] {
		const chats = Array.from(this.MockEntity.values()).reverse();
		const filteredChats: any[] = [];
		for (const chat of chats) {
			if (chat.chatSeq === chatSeq && chat.msgSeq < messageId) {
				filteredChats.push(chat);
			}
		}
		return filteredChats.slice(-limit);
	}

	// 가장 최신 메세지
	getLastChatIndex(): number {
		return this.MockEntity.length - 1;
	}
}

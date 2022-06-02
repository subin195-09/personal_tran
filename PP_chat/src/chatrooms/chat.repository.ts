import { Injectable } from "@nestjs/common";

@Injectable()
export default class ChatRepository {
	MockEntity: any[] = [];

	constructor() {
		this.MockEntity.push({
			chatSeq: 0,
			chatType: 'CHTP20',
			chatName: '푸주홍의 등산클럽',
			password: '',
			isDirected: false,
		});
		this.MockEntity.push({
			chatSeq: 1,
			chatType: 'CHTP20',
			chatName: '스킴클럽',
			password: '1234',
			isDirected: false,
		});
	}

	findRoomByRoomId(chatSeq: number): any {
		for (const room of this.MockEntity) {
			if (room.chatSeq === chatSeq) {
				return room;
			}
		}
		return null;
	}

	findRoomByRoomName(chatName: string): any {
		for (const room of this.MockEntity) {
			if (room.chatName === chatName) {
				return room;
			}
		}
		return null;
	}

	addRoom(room: any): any {
		this.MockEntity.push({
			chatSeq: this.MockEntity.length,
			chatType: room.chatType,
			chatName: room.chatName,
			password: room.password,
			isDirected: room.chatType === 'CHTP10',
		});
		return ({
			chatSeq: this.MockEntity.length - 1,
			chatType: room.chatType,
			chatName: room.chatName,
			password: room.password,
			isDirected: room.chatType === 'CHTP10',
		});
	}

	searchChatroom(searchKeyword: string, page: number, count: number): any[] {
		const searchResult = [];
		for (const room of this.MockEntity) {
			if (room.chatName.includes(searchKeyword)) {
				searchResult.push(room);
			}
		}
		console.log("page와 count가 왜 필요한가? : " , searchKeyword);
		return searchResult.slice(page * count, page * count + count);
	}
}

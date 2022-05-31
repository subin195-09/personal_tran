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
			chatName: '채팅방 2',
			password: '1234',
			isDirected: false,
		});
	}

	findRoomByRoomId(chatSeq: number): any {
	}

	findRoomByRoomName(chatName: string): any {
	}

	addRoom(room: any): any {

	}

	searchChatroom(serchKeyword: string, page: number, count: number): any[] {

	}
}

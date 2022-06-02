import { Injectable } from "@nestjs/common";
import PartcAuth from "src/enums/mastercode/partc-auth.enum";
import { ChatParticipantDto } from "./dto/chat-participant.dto";

@Injectable()
export default class ChatParticipantRepository {
	MockEntity: ChatParticipantDto[] = [];

	constructor() {
		this.MockEntity.push({
			partcSeq: 0,
			userSeq: 10,
			chatSeq: 0,
			partcAuth: PartcAuth.CPAU30,
			mutedUntil: new Date(),
			isBaned: false,
			enteredAt: new Date(),
			leavedAt: new Date(),
		  });
	}

	// 새로운 room 참가자 추가
	saveChatParticipants(userid: number, roomid: number, auth: PartcAuth): any {
		this.MockEntity.push({
			partcSeq: this.MockEntity.length,
			userSeq: userid,
			chatSeq: roomid,
			partcAuth: auth,
			mutedUntil: new Date(),
			isBaned: false,
			enteredAt: new Date(),
			leavedAt: new Date(),
		  });
	}

	// 특정 room의 참가자들 조회
	async getChatParticipantsByRoomid(roomid: number): Promise<any> {
		return this.MockEntity.filter(
			(participant) => participant.chatSeq === roomid,
		);
	}

	// 특정 유저가 들어가 있는 방 조회
	async getChatParticipantsByUserid(userid: number): Promise<any> {
		return this.MockEntity.filter(
			(participant) => participant.userSeq === userid,
		);
	}

	// 특정 유저가 들어가 있는 방 조회 (getChatParticipantsByUserid와 비슷하지만 return 값이 다름)
	findRoomsByUserId(id: number): number[] {
		return this.MockEntity
			.filter((participant) => participant.userSeq === id)
			.map((participant) => participant.chatSeq);
	}

	 // 해당 방의 유저 찾기
	async findEntity(chatSeq: number, user: number): Promise<ChatParticipantDto> {
		return this.MockEntity.find(
			(e) => e.chatSeq === chatSeq && e.userSeq === user,
		);
	}

	// 유저 ban 시키기
	async banUser(chatSeq: number, user: number): Promise<boolean> {
		const entity = await this.findEntity(chatSeq, user);
		if (entity) {
			entity.isBaned = true;
			return true;
		}
		return false;
	}

	// 유저 ban 해제
	async unbanUser(chatSeq: number, user: number): Promise<boolean> {
		const entity = await this.findEntity(chatSeq, user);
		if (entity) {
			entity.isBaned = false;
			return true;
		}
		return false;
	}

	// 유저 mute 시키기
	async muteUser(chatSeq: number, user: number, mutedUntil: Date): Promise<boolean> {
		const entity = await this.findEntity(chatSeq, user);
		if (entity) {
			entity.mutedUntil = mutedUntil;
			return true;
		}
		return false;
	}

	// 유저 mute 해제
	async unmuteUser(chatSeq: number, user: number): Promise<boolean> {
		const entity = await this.findEntity(chatSeq, user);
		if (entity) {
			entity.mutedUntil = new Date();
			return true;
		}
		return false;
	}

	// 특정방의 특정 유저 찾기
	async getChatParticipantByUserIdAndRoomId(
		chatSeq: number,
		userId: number,
	): Promise<ChatParticipantDto | undefined> {
		const entity = await this.findEntity(chatSeq, userId);
		return entity;
	}

	// 채팅방에 참가자 or 참가자들 추가
	async addUsers(chatSeq: number, users: number[]): Promise<void> {
		let counter = this.MockEntity.length - 1;
		const insert = users.map((user) => {
			counter += 1;
			const tempDto: ChatParticipantDto = {
				partcSeq: counter,
				userSeq: user,
				chatSeq,
				partcAuth: PartcAuth.CPAU10,
				mutedUntil: new Date(),
				isBaned: false,
				enteredAt: new Date(),
				leavedAt: new Date(),
			};
			return tempDto;
		});
		this.MockEntity.push(...insert);
	}

	// user 권한 변경
	async changeUserAuth(chatSeq: number, user: number, partcAuth: PartcAuth): Promise<boolean> {
		const entity = await this.findEntity(chatSeq, user);
		if (entity) {
			entity.partcAuth = partcAuth;
			return true;
		}
		return false;
	}

	// chatSeq에 해당하는 채팅방 참가자 삭제
	removeUser(chatSeq: number, user: number): boolean {
		this.MockEntity = this.MockEntity.filter(
			(entity) => !(entity.chatSeq === chatSeq && entity.userSeq === user),
		);
		return true;
	}
}

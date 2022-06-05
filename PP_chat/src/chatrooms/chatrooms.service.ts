import { CACHE_MANAGER, Inject, Injectable, Logger } from "@nestjs/common";
import * as bcrypt from 'bcrypt';
import { Cache } from "cache-manager";
import { Server, Socket } from "socket.io";
import ChatType from "src/enums/mastercode/chat-type.enum";
import PartcAuth from "src/enums/mastercode/partc-auth.enum";
import ChatParticipantRepository from "./chat-participant.repository";
import ChatRepository from "./chat.repository";
import MessageRepository from "./message.repository";
import ChatRoomResultDto from "./dto/chat-room-result.dto";
import { ChatRoomDto } from "./dto/chat-room.dto";
import { MessageDataDto } from "./dto/message-data.dto";
import Message from "src/entities/message.entity";
import { Cron } from "@nestjs/schedule";

@Injectable()
export default class ChatroomsService {
	private readonly logger = new Logger(ChatroomsService.name);

	constructor(
		private readonly chatRepository: ChatRepository,
		private chatParticipantRepository: ChatParticipantRepository,
		private messageRepository: MessageRepository,
		@Inject(CACHE_MANAGER) private cacheManager: Cache,
	) { }

	/*
	* messageRepository 주로 사용
	*/
	// cache 데이터를 주기적으로 db에 저장
	@Cron('0 * * * * *')
	async writeBehind(): Promise<void> {
		const chatCache: undefined | Array<MessageDataDto> = await this.cacheManager.get('chat');
		const chatIndex: undefined | number = await this.cacheManager.get('chat_index');
		await this.cacheManager.set('chat_index', chatIndex, {ttl: 120});
		if (chatCache === undefined && chatIndex !== undefined) {
			const len = chatCache.length;
			this.logger.debug(`DB에 저장된 채팅 메시지 수: ${len}`);
			this.messageRepository.saveMessage(chatCache);
			await this.cacheManager.del('chat');
		}
	}

	// cache에 메세지 작성하기
	async cacheChatWrite(chat: MessageDataDto): Promise<number> {
		let chatIndex: undefined | number = await this.cacheManager.get('chat_index');
		if (chatIndex === undefined) { // cache에 저장되어 있는 메세지가 없다면 db에서 제일 최신 메세지 가져오기
			chatIndex = await this.messageRepository.getLastChatIndex() + 1;
		}
		const chatData: MessageDataDto = {
			msgSeq: chatIndex,
			partcSeq: chat.partcSeq,
			chatSeq: chat.chatSeq,
			msg: chat.msg,
			createAt: chat.createAt,
		};

		await this.cacheManager.set('chat_index', chatIndex + 1, {ttl: 120});
		const chatCache: undefined | Array<MessageDataDto> = await this.cacheManager.get('chat');
		if (chatCache === undefined) {
			await this.cacheManager.set('chat', [chatData], {ttl: 120});
		} else {
			chatCache.push(chatData);
		}
		return chatIndex;
	}

	// cache에 있는 메세지 읽어오기, msgSeq 이전의 메세지들을 limit 만큼 가져와서 return
	async cacheChatRead(
		chatSeq: number,
		msgSeq: number,
		limit: number,
	): Promise<Array<MessageDateDto>> {
		let limitCnt = limit;
		let newMsgSeq = msgSeq;
		if (msgSeq < 0) {
			let msgSeqTmp: undefined | number = await this.cacheManager.get('chat_index');
			if (msgSeqTmp === undefined) {
				msgSeqTmp = await this.messageRepository.getLastChatIndex() + 1;
			}
			newMsgSeq = msgSeqTmp;
		} // msgSeq가 음수이면 모든 메세지를 가져온다.
		this.logger.debug(`cacheChatRead: 방 ID: ${chatSeq}, 메시지 ID: ${newMsgSeq}, 제한: ${limitCnt}`);
		let filteredChats: Array<MessageDataDto> = [];
		const cache: undefined | Array<MessageDataDto> = await this.cacheManager.get('chat');
		if (cache === undefined) { // cache에 저장된 메세지가 없다면 db에서 끌어오기
			filteredChats = this.messageRepository.getMessage(chatSeq, newMsgSeq, limitCnt);
		} else {
			for (let index = cache.length - 1; index >= 0; index--) {
				if (cache[index].chatSeq === chatSeq && cache[index].msgSeq < newMsgSeq && limitCnt !== 0) {
					filteredChats.push(cache[index]);
					limitCnt--;
				}
			}
			if (limitCnt !== 0) { // cache에 저장된 메세지를 넘어서 가져와야 한다면 db에서 가져와야함
				const dbrtn = this.messageRepository.getMessage(chatSeq, newMsgSeq, limitCnt);
				filteredChats.push(...dbrtn);
			}
		}
		return filteredChats;
	}

	// 메세지 입력
	async newChat(from: number, chatSeq: number, msg: string): Promise<any> {
		return this.cacheChatWrite({
			msgSeq: -1,
			partcSeq: from,
			chatSeq,
			msg,
			createAt: new Date(),
		});
	}

	// 메세지 가져오기
	async getMessage(
		chatSeq: number,
		messageId: number,
		limit: number,
	): Promise<Array<MessageDataDto>> {
		const rtn = await this.cacheChatRead(chatSeq, messageId, limit);
		return rtn;
	}


	/*
	* chatRepositoy 주로 사용
	*/
	// 새로운 방 생성 (단체)
	async addRoom(create: ChatRoomDto): Promise<number> {
		if (this.chatRepository.findRoomByRoomName(create.chatName)) {
			return -1;
		} // 만약 같은 방이 있다면 만들지 않는다.

		if (create.chatType === ChatType.CHTP10) {
			return -1;
		} // DM 방은 만들지 않는다.

		// 비밀번호가 있다면 hash 화 한다.
		const hashPassword = create.password ? await bcrypt.hash(create.password, 10) : "";
		// 해쉬된 정보로 다시 object를 만든다.
		const hashed = {
			...create,
			password: hashPassword,
		};
		this.logger.debug(`[ChatRoomService] addRoom: ${JSON.stringify(hashed)}`);
		return this.chatRepository.addRoom(hashed).chatSeq;
	}

	// DM 방 생성
	async addDM(user1: number, user2: number): Promise<number> {
		if (this.chatRepository.findRoomByRoomName(`DM-${user1}-${user2}`)
		|| this.chatRepository.findRoomByRoomName(`DM-${user2}-${user1}`)) {
			return -1;
		} // 기존 DM 방이 있다면 생성하지 않는다.

		const chatName = `DM-${user1}-${user2}`;
		const newRoom = {
			chatName,
			ChatType: ChatType.CHTP10,
		}; // DM 방 이름과 타입을
		this.logger.debug(`[ChatRoomService] addDM: ${JSON.stringify(newRoom)}`);
		return this.chatRepository.addRoom(newRoom).chatSeq;
	}

	// 채팅방 종류 가져오기 (단체방 or DM)
	async getRoomType(chatSeq: number): Promise<ChatType | undefined> {
		const room = await this.chatRepository.findRoomByRoomId(chatSeq);
		if (room === null) {
			return undefined;
		}
		return room.chatType;
	}

	async addNormalUser(chatSeq: number, users: number[]): Promise<void> {
		await this.chatParticipantRepository.addUsers(chatSeq, users);
	}

	// 방 검증 후 참가하기 (비밀번호))
	async joinRoomByExUser(
		chatSeq: number,
		user: number,
		password: string | undefined,
	): Promise<boolean> {
		const room = await this.chatRepository.findRoomByRoomId(chatSeq);
		this.logger.debug(`[ChatRoomService] joinRoomByExUser : ${JSON.stringify(room)}`);
		if (room === null) {
			return false;
		} // 존재 하지 않는 방이라면 false 반환
		if (room.password) { // 만약 password가 필요한 방이라면
			if (password === undefined) {
				return false;
			} // 비밀번호를 입력하지 않았다면 false
			if (!(await bcrypt.compare(password, room.password))) {
				return false;
			} // 비밀번호가 일치하는지 확인
		}
		await this.addNormalUser(chatSeq, [user]);
		return true;
	}

	// 방 검색하기
	async searchChatroom(
		searchKeyword: string,
		page: number,
		count: number,
	): Promise<Array<ChatRoomResultDto>> {
		// 해당 키워드가 포함되어 있는 room 리스트 가져오기
		const chatroomList = await this.chatRepository.searchChatroom(searchKeyword, page, count);
		const participants = await Promise.all(chatroomList.map(
			(chatroom) => this.chatParticipantRepository.getChatParticipantsByRoomid(chatroom.chatSeq),
		)); // 해당 채팅방에 참여하고 있는 유저 목록 가져오기
		return chatroomList.map((chatroom, index) => ({
			chatSeq: chatroom.chatSeq,
			chatName: chatroom.chatName,
			chatType: chatroom.chatType,
			isPassword: chatroom.password && chatroom.password.length > 0,
			participants: participants[index],
		}));
	}

	// 특정 채팅방에 대한 정보를 가져온다
	async getRoomInfo(chatSeq: number): Promise<ChatRoomResultDto> {
		const chatroom = await this.chatRepository.findRoomByRoomId(chatSeq);
		const participants = await this.chatParticipantRepository.getChatParticipantsByRoomid(chatSeq);
		const result:ChatRoomResultDto = {
			chatSeq: chatroom.chatSeq,
			chatName: chatroom.chatName,
			chatType: chatroom.chatType,
			isPassword: chatroom.password && chatroom.password.length > 0,
			participants,
		};
		return result;
	}


	/*
	* socket 관련
	*/
	// 유저 소켓에 헤당되는 username을 반환해준다.
	getUserId(user: Socket): number | undefined {
		const userId = user.handshake.query.userId;
		if (Number.isNaN(userId) === undefined) {
			return undefined;
		} else {
			Number(userId);
		}
	}

	// 서버에 저장되어 있는 소켓을 조회하여 userId를 반환한다.
	async whoAmI(user: Socket): Promise<number> {
		return this.cacheManager.get(user.id);
	};

	// 현재 속해 있는 방을 socket에 join 시켜준다.
	roomJoin(user: Socket, username: number): number[] {
		const rooms = this.chatParticipantRepository.findRoomsByUserId(username);
		const rtn = [];
		rooms.forEach((room) => {
			user.join(room.toString()); // 유저 socket을 room에 join
			rtn.push(room);
		});
		return rtn; // 본인이 속해 있는 방 리스트를 반환
	}

	// 채팅방을 나갈 때 socket에 leave 시켜준다.
	roomLeave(user: Socket): void {
		const username = this.getUserId(user);
		const rooms = this.chatParticipantRepository.findRoomsByUserId(username);
		rooms.forEach((room) => {
			user.leave(room.toString()); // 유저 socket을 room에 leave
		})
	}

	// 특정 채팅방에 유저 socket을 join
	async roomAddUsers(server: Server, chatSeq: number, userIDs: number[]): Promise<void> {
		for (const [id, socket] of (server.sockets as any)) {
			const userID : undefined | number = await this.cacheManager.get(id);
			if (userID != undefined && userIDs.includes(userID)) {
				socket.join(chatSeq.toString());
			}
		}
	}

	// 특정 채팅방에 유저 socket을 leave
	async roomLeaveUser(server: Server, chatSeq: number, userID: number): Promise<void> {
		for (const [id, socket] of (server.sockets as any)) {
			const userID : undefined | number = await this.cacheManager.get(id);
			if (userID != undefined && userID === userID) {
				socket.leave(chatSeq.toString());
			}
		}
	}

	// 사용자가 접속하면 온라인 사용자 리스트(cache)에 추가한다.
	async onlineUserAdd(user: Socket, userID: number): Promise<void> {
		await this.cacheManager.set(user.id, userID);
	}

	// 사용자의 연결이 해제되면 사용자 리스트(cache)에서 제거한다.
	async onlineUserRemove(user: Socket): Promise<void> {
		await this.cacheManager.del(user.id);
	}


	/*
	* chatParticipantRepository 주로 사용
	*/
	// 방에 사용자를 추가하고 그 사람을 방장으로 지정
	async addOwner(chatSeq: number, user: number): Promise<void> {
		await this.chatParticipantRepository.addUsers(chatSeq, [user]);
		await this.chatParticipantRepository.changeUserAuth(chatSeq, user, PartcAuth.CPAU30);
	}

	// 채팅방에서 유저 제거
	leftUser(chatSeq: number, user: number): boolean {
		return this.chatParticipantRepository.removeUser(chatSeq, user);
	}

	async getUserAuth(chatSeq: number, user: number): Promise<PartcAuth> {
		const participant = await this.chatParticipantRepository
		.getChatParticipantByUserIdAndRoomId(chatSeq, user);
		return participant.partcAuth;
	}

	async isParticipant(chatSeq: number, user: number): Promise<boolean> {
		const participant = await this.chatParticipantRepository
		.getChatParticipantByUserIdAndRoomId(chatSeq, user);
		return participant !== undefined;
	}

	async isMaster(chatSeq: number, user: number): Promise<boolean> {
		if (await this.isParticipant(chatSeq, user) === false) {
			return false;
		}
		const participant = await this.getUserAuth(chatSeq, user);
		return participant === PartcAuth.CPAU30;
	}
}

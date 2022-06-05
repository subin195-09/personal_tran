import { Logger, Param } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import ChatroomsService from './chatrooms.service';
import ISocketSend from './interface/socket-send';

@WebSocketGateway({ namespace: 'chatrooms' })
export class ChatroomsGateway implements OnGatewayConnection, OnGatewayDisconnect {
	private readonly logger = new Logger(ChatroomsGateway.name);

	constructor(
		private readonly chatroomsService: ChatroomsService,
	) { }

	@WebSocketServer()
	server: Server; // 서버 측 소켓

	async handleConnection(client: Socket) {
		this.logger.debug(`handleConnection: ${client.id} connected`);
		const userID = this.chatroomsService.getUserId(client);
		if (userID === undefined) {
			throw new Error('Auth Error');
		}

		// 클라이언트 소켓과 userID를 캐시에 저장한다.
		await this.chatroomsService.onlineUserAdd(client, userID);
		// 클라이언트가 속한 room에 join 시킨다.
		const roomList = this.chatroomsService.roomJoin(client, userID);

		client.emit('chat:init', roomList);
	}

	async handleDisconnect(client: any) {
		this.logger.debug(`handleDisconnect: ${client.id} disconnected`);

		// 클라이언트가 속해있던 룸에서 나갑니다.
		this.chatroomsService.roomLeave(client);
		// 클라이언트 소켓과 userID를 캐시에서 삭제한다.
		await this.chatroomsService.onlineUserRemove(client);
	}

	// 새로운 메세지
	@SubscribeMessage('chat')
	async handleChat(client: Socket, message: any) {
		this.logger.debug(`handleChat: ${client.id} sent message : ${message.content}`);

		// 클라이언트가 속한 룸 리스트를 담고 있다.
		const { rooms } = client;

		const name = await this.chatroomsService.whoAmI(client);
		if (rooms.has(message.at.toString()) && name != undefined) {
			const seq = await this.chatroomsService.newChat(name, message.at, message.content);
			const data: ISocketSend = {
				chatSeq: message.at, // 어느 채팅방에서
				userIDs: [name], // 누가
				msg: message.content, // 어떤 내용을
				id: seq
			};
			this.server.to(message.at.toString()).emit('chat', data);
		}
	}

	// 방 참가
	@OnEvent('room:join')
	async onRoomJoin(chatSeq: number, userIDs: number[]) {
		this.logger.debug(`onRoomJoined: ${chatSeq}, userIDs: ${JSON.stringify(userIDs)}`);

		const data: ISocketSend = {
			chatSeq,
			userIDs,
		};

		await this.chatroomsService.roomAddUsers(this.server, chatSeq, userIDs);
		// 룸에 참가한 사람에게 룸에 참가했다는 내용을 보낸다.
		this.server.to(chatSeq.toString()).emit('room:join', data);
	}

	// 방 퇴장
	@OnEvent('room:leave')
	async onRoomLeave(chatSeq: number, user: number, kicked: boolean) {
		this.logger.debug(`onRoomLeave: ${chatSeq}, user: ${user}, kicked: ${kicked}`);

		const data: ISocketSend = {
			chatSeq,
			userIDs: [user],
			kicked,
		};
		this.server.to(chatSeq.toString()).emit('room:leave', data);
		await this.chatroomsService.roomLeaveUser(this.server, chatSeq, user);
	}
}

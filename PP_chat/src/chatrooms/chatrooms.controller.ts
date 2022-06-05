import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Logger, Param, Post, Put, UsePipes, ValidationPipe } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import ChatType from "src/enums/mastercode/chat-type.enum";
import ChatroomsService from "./chatrooms.service";
import { AddRoomResultDto } from "./dto/add-rom-result.dto";
import ChatRoomResultDto from "./dto/chat-room-result.dto";
import { ChatRoomDto } from "./dto/chat-room.dto";
import { JoinRoomDto } from "./dto/join-room.dto";
import { MessageDataDto } from "./dto/message-data.dto";
import { IJoinRoomResult } from "./interface/join-room";

@ApiTags('채팅방')
@Controller('chatrooms')
@UsePipes(new ValidationPipe({ transform: true }))
export default class ChatroomsController {
	private readonly logger = new Logger(ChatroomsController.name);

	constructor(
		private chatroomsService: ChatroomsService,
		private eventRunner: EventEmitter2,
	) {}

	// 단체 방 만들기
	@ApiOperation({ summary: '방 만들기', description: '방을 만듭니다. 성공시 HTTP 201과 방 ID, 방 제목을 리턴합니다.' })
	@ApiResponse({ status: 201, type: AddRoomResultDto, description: '방 생성 성공' })
	@ApiResponse({ status: 400, description: 'Body Field Error' })
	@ApiParam({
	name: 'by', type: Number, example: 1, description: '유저 ID (제거 예정)',
	})
	@Post('new/:by')
	@HttpCode(201)
	async addRoom(
		@Body() reqData: ChatRoomDto,
		@Param('by') by: string,
	): Promise<AddRoomResultDto> {
		const owner = Number(by);
		this.logger.debug(`addRoom: ${reqData.chatName}`);

		const roomno = await this.chatroomsService.addRoom(reqData);
		if (roomno === -1) {
			throw new BadRequestException('요청이 유효하지 않습니다.');
		}

		await this.chatroomsService.addOwner(roomno, owner);
		this.eventRunner.emit('room:join', roomno, [owner]);

		const rtn: AddRoomResultDto = {
			chatSeq: roomno, // 새로 생신 방 ID
			chatName: reqData.chatName, // 입력한 방제
		};
		return rtn;
	}

	// DM방 만들기
	@ApiOperation({ summary: '디엠 방 만들기', description: '디엠 방을 만듭니다.'})
	@ApiOperation({ status: 201, type: AddRoomResultDto, description: '방 생성 성공' })
	@ApiResponse({ status: 400, description: 'Body Field Error' })
	@ApiParam({
		name: 'who', type: Number, example: 1, description: '초대받은 유저',
	})
	@ApiParam({
		name: 'by', type: Number, example: 2, description: '초대하는 유저',
	})
	@Post('new/dm/:who/:by')
	@HttpCode(201)
	async addDM(
		@Param('who') who: string,
		@Param('by') by: string,
	): Promise<AddRoomResultDto> {
		const inviter = Number(by);
		const invitee = Number(who);

		this.logger.debug(`addDM: ${inviter} -> ${invitee}`);
		const roomno = await this.chatroomsService.addDM(inviter, invitee);
		if (roomno === -1) {
			throw new BadRequestException('요청이 유효하지 않습니다. (중복 DM 방)');
		}

		await this.chatroomsService.addNormalUser(roomno, [inviter, invitee]); // DM방에 유저 추가(DB)
		this.eventRunner.emit('room:join', roomno, [inviter, invitee]); // socket room에 join 이벤트 발생
		const rtn: AddRoomResultDto = {
			chatSeq: roomno, // 새로 생신 방 ID (DM방)
		};
		return rtn;
	}

	// 방 참가하기
	@ApiOperation({ summary: '클라이언트의 방 입장 요청 처리', description: '사용자가 방에 입장하려고 합니다. 사용자 ID는 추후에 세션으로부터 가져옵니다.' })
	@ApiResponse({ status: 200, description: '방 참여 성공' })
	@ApiResponse({ status: 400, description: '비밀번호가 틀렸거나 존재하지 않는 방' })
	@ApiParam({
		name: 'roomId', type: Number, example: 1, description: '방 ID',
	})
	@Put('join/:roomId/:userId')
	async joinRoom(
		@Param('roomId') roomId: string,
		@Param('userId') userId: string,
		@Body() data:JoinRoomDto,
	): Promise<string> {
		this.logger.debug(`joinRoom: body -> ${JSON.stringify(data)}`);
		const roomid = Number(roomId);
		const user = Number(userId);

		const roomType = await this.chatroomsService.getRoomType(roomid);
		if (roomType === undefined) {
			throw new BadRequestException('존재하지 않는 방입니다.');
		} else if (roomType === ChatType.CHTP10) {
			throw new BadRequestException('DM 방입니다.');
		}

		const result = await this.chatroomsService.joinRoomByExUser(roomid, user, data.password);
		if (result === false) {
			throw new BadRequestException('비밀번호가 틀렸습니다.');
		}

		this.eventRunner.emit('room:join', roomid, [user]);
		const rtn: IJoinRoomResult = {
			chatSeq: roomid,
		};
		return JSON.stringify(rtn);
	}

	// 방에 초대하기
	@ApiOperation({ summary: '사용자를 방에 초대합니다.', description: '사용자를 방에 초대합니다.' })
	@ApiResponse({ status: 200, description: '초대 성공' })
	@ApiResponse({ status: 400, description: '초대할 사용자가 존재하지 않거나 자신을 초대하거나 존재하지 않는 방' })
	@ApiParam({
		name: 'target', type: Number, example: 1, description: '초대할 사용자 ID',
	})
	@ApiParam({
		name: 'roomId', type: Number, example: 1, description: '초대할 방 ID',
	})
	@ApiParam({
		name: 'by', type: Number, example: 1, description: '초대한 사용자 ID',
	})
	@Put('invite/:target/:roomId/:by')
	async inviteUser(
		@Param('target') target: string,
		@Param('roomId') roomId: string,
		@Param('by') by: string,
	): Promise<void> {
		this.logger.debug(`inviteUser: ${by} -> ${target} -> ${roomId}`);
		const targetId = Number(target);
		const roomid = Number(roomId);
		const inviter = Number(by);

		const roomType = await this.chatroomsService.getRoomType(roomid);
		if (roomType === undefined) {
			throw new BadRequestException('존재하지 않는 방입니다.');
		} else if (roomType === ChatType.CHTP10) {
			throw new BadRequestException('DM 방입니다.');
		}

		const isMaster = await this.chatroomsService.isMaster(roomid, inviter);
		if (isMaster === false) {
			throw new BadRequestException('초대할 권한이 없습니다.');
		}
		if (targetId === inviter) {
			throw new BadRequestException('자신을 초대할 수 없습니다.');
		}

		await this.chatroomsService.addNormalUser(roomid, [targetId]);
		this.eventRunner.emit('room:join', roomid, [targetId]);
	}

	// 방에서 나가기
	@ApiOperation({ summary: '클라이언트의 방 퇴장 요청 처리', description: '사용자가 방에서 나가려고 합니다. 사용자 ID는 세션으로부터 가져옵니다.' })
	@ApiResponse({ status: 204, description: '방 나가기 성공' })
	@ApiParam({
		name: 'roomId', type: Number, example: 1, description: '방 ID',
	})
	@ApiParam({
		name: 'userId', type: Number, example: 1, description: '방 ID (제거 예정)',
	})
	@Delete('leave/:roomId/:userId')
	@HttpCode(204)
	leaveRoom(
		@Param('roomId') roomId: string,
		@Param('userId') userId: string,
	): void {
		const roomid = Number(roomId);
		const user = Number(userId);
		const result = this.chatroomsService.leftUser(roomid, user);
		if (result) {
			this.eventRunner.emit('room:leave', roomid, user, false);
		}
	}

	// 강퇴
	@ApiOperation({ summary: '사용자를 방에서 강퇴합니다.', description: '사용자를 방에서 강퇴합니다.' })
	@ApiResponse({ status: 200, description: '강퇴 성공' })
	@ApiResponse({ status: 400, description: '강퇴할 사용자가 존재하지 않거나 자신을 강퇴하거나 존재하지 않는 방' })
	@ApiParam({
		name: 'target', type: Number, example: 1, description: '강퇴할 사용자 ID',
	})
	@ApiParam({
		name: 'roomId', type: Number, example: 1, description: '강퇴할 방 ID',
	})
	@ApiParam({
		name: 'by', type: Number, example: 1, description: '강퇴하는 관리자 ID',
	})
	@Delete('kick/:target/:roomId/:by')
	async kickUser(
		@Param('target') target: string,
		@Param('roomId') roomId: string,
		@Param('by') by: string,
	): Promise<void> {
		this.logger.debug(`kickUser: ${by} -> ${target} -> ${roomId}`);
		const targetId = Number(target);
		const roomno = Number(roomId);
		const who = Number(by);

		const isMaster = await this.chatroomsService.isMaster(roomno, who);
		if (isMaster ===  false) {
			throw new BadRequestException('강퇴할 권한이 없습니다.');
		}

		if (targetId === who) {
			throw new BadRequestException('자신을 강퇴할 수 없습니다.');
		}

		const result = this.chatroomsService.leftUser(roomno, targetId);
		if (result === false) {
			throw new BadRequestException('강퇴할 사용자가 존재하지 않습니다.');
		}
		// NOTE : 여기서는 왜 targetID가 array 인가
		this.eventRunner.emit('room:leave', roomno, [targetId], true);
	}

	// 채팅 메세지 가져오기
	@ApiOperation({
		summary: '채팅 메시지 조회',
		description: '채팅 메시지 조회 기능입니다. 기준이 되는 메시지 (msgID) 이전의 채팅을 가져오며, msgID가 -1일시 가장 최신의 메시지부터 가져옵니다.',
	})
	@ApiResponse({ status: 200, type: [MessageDataDto], description: '채팅 메시지 조회 성공' })
	@ApiParam({
		name: 'roomId', type: Number, example: 1, description: '방 ID',
	})
	@ApiParam({
		name: 'msgID', type: Number, example: -1, description: '메시지 고유 ID',
	})
	@ApiParam({
		name: 'count', type: Number, example: 10, description: '가져올 메시지 개수',
	})
	@Get('messages/:roomId/:msgID/:count') // msgID부터 count 개 만큼
	async getMessage(
		@Param('roomId') roomId: string,
		@Param('msgID') msgID: string,
		@Param('count') count: string,
	): Promise<Array<MessageDataDto>> {
		const messages = await this.chatroomsService.getMessage(
			Number(roomId),
			Number(msgID),
			Number(count),
		);
		return messages;
	}

	// 채팅 방 정보 조회
	@ApiOperation({ summary: '방 정보 조회', description: '방 정보를 조회합니다.' })
	@ApiResponse({ status: 200, type: ChatRoomResultDto, description: '방 정보 조회 성공' })
	@ApiParam({
		name: 'roomId', type: Number, example: 1, description: '방 ID',
	})
	@Get('room/:roomId')
	async getRoom(
		@Param('roomId') roomId: string,
	): Promise<ChatRoomResultDto> {
		this.logger.debug(`getRoom: ${roomId}`);
		const room = await this.chatroomsService.getRoomInfo(Number(roomId));
		return room;
	}

	// 방 검색 (DM, Private 방 제외)
	@ApiOperation({ summary: '방 검색', description: '방 검색 기능입니다. 검색 키워드와 페이지 번호를 입력하여 검색 결과를 반환합니다.' })
	@ApiResponse({ status: 200, type: [ChatRoomResultDto], description: '방 검색 성공' })
	@ApiParam({
		name: 'searchKeyword', type: String, example: '푸주', description: '검색 키워드',
	})
	@ApiParam({
		name: 'page', type: Number, example: 1, description: '페이지 번호',
	})
	@ApiParam({
		name: 'count', type: Number, example: 10, description: '페이지당 방 개수',
	})
	@Get('search/:searchKeyword/:page/:count')
	async searchChatroom(
		@Param('searchKeyword') searchKeyword: string,
		@Param('page') page: string,
		@Param('count') count:string,
	): Promise<Array<ChatRoomResultDto>> {
		const result = await this.chatroomsService.searchChatroom(
			searchKeyword,
			Number(page),
			Number(count),
		);
		return result;
	}
}

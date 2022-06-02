import { ApiProperty } from "@nestjs/swagger";
import ChatParticipant from "src/entities/chat-participant.entity";
import ChatType from "src/enums/mastercode/chat-type.enum";
import { ChatParticipantDto } from "./chat-participant.dto";

export default class ChatRoomResultDto { // 검색 후 반환하는 객체
	@ApiProperty({
		description: '채팅방 ID',
	})
	chatSeq: number;

	@ApiProperty({
		description: '채팅방 이름',
		example: '채팅방 이름',
	})
	chatName: string;

	@ApiProperty({
		description: '채팅방 종류 (마스터코드)',
		type: ChatType,
		enum: ['CHTP20', 'CHTP30'],
	})
	chatType: ChatType;

	@ApiProperty({
		description: '채팅방 비밀번호 여부',
		example: false,
	})
	isPassword: boolean;

	@ApiProperty({
		description: '채팅 참여자 배열',
		type: [Array<ChatParticipantDto>],
	})
	participants: Array<ChatParticipantDto>;
}

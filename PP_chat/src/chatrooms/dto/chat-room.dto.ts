import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import ChatType from "src/enums/mastercode/chat-type.enum";

export class ChatRoomDto { // chat table에 저장하는 객체
	@ApiProperty({
		description: '채팅방 종류 (마스터코드)',
		enum: ['CHTP10', 'CHTP20', 'CHTP30', 'CHTP40'],
		example: 'CHTP20',
	 })
	 @IsEnum(ChatType)
	 @IsNotEmpty()
	 chatType: ChatType;

	 @ApiProperty({
		 description: '채팅방 이름',
		 example: '푸주홍의 등산클럽',
	 })
	 @IsString()
	 @IsNotEmpty()
	 chatName: string;

	 @ApiProperty({
		 description: '채팅방 비밀번호',
		 example: 'password',
	 })
	 @IsString()
	 @IsOptional()
	 password: string;

	 @ApiProperty({
		 description: 'DM 여부',
	 })
	 @IsBoolean()
	 @IsNotEmpty()
	 isDirected: boolean;
}

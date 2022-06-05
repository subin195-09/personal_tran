import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class JoinRoomDto {
	@ApiProperty({
		description: '채팅방 비밀번호',
	})
	@IsString()
	@IsOptional()
	@IsNotEmpty()
	password: string;
}

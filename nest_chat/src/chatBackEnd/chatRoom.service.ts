import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { chatRoomListDTO } from './dto/chatBackEnd.dto';
import { v4 as uuidv4 } from 'uuid';

// room 관리를 위한 service
@Injectable()
export class ChatRoomService {
  private chatRoomList: Record<string, chatRoomListDTO>;
  constructor() {
    this.chatRoomList = {
      // 기본 lobby room
      'room:lobby': {
        roomId: 'room:lobby',
        roomName: '로비',
        cheifId: null,
      },
    };
  }

  createChatRoom(client: Socket, roomName: string): void {
    const roomId = `room:${uuidv4()}`;
    const nickname: string = client.data.nickname;
    this.chatRoomList[roomId] = {
      roomId,
      cheifId: client.id,
      roomName,
    };
    console.log(this.chatRoomList);
    client.data.roomId = roomId;
    client.rooms.clear(); // 여러개의 room에 속해있을 수 있으므로 clear를 실행해준다.
    client.join(roomId);
    client.emit('getMessage', {
      id: null,
      nickname: '안내',
      message: `${nickname}님이 ${roomName}방을 생성하였습니다.`,
    });
  }

  enterChatRoom(client: Socket, roomId: string): void {
    console.log(roomId);
    client.data.roomId = roomId;
    client.rooms.clear();
    client.join(roomId);
    const { nickname } = client.data;
    const { roomName } = this.getChatRoom(roomId);
    client.to(roomId).emit('getMessage', {
      id: null,
      nickname: '안내',
      message: `${nickname}님이 ${roomName}방에 입장하였습니다.`,
    });
  }

  exitChatRoom(client: Socket, roomId: string) {
    client.data.roomId = `room:lobby`;
    client.rooms.clear();
    client.join('room:lobby');
    const { nickname } = client.data;
    client.to(roomId).emit('getMessage', {
      id: null,
      nickname: '안내',
      message: `${nickname}님이 방을 나가셨습니다.`,
    });
  }

  getChatRoom(roomId: string): chatRoomListDTO {
    return this.chatRoomList[roomId];
  }

  getChatRoomList(): Record<string, chatRoomListDTO> {
    return this.chatRoomList;
  }

  deleteChatRoom(roomId: string): void {
    delete this.chatRoomList[roomId];
  }
}

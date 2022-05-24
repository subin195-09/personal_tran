import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatRoomService } from './chatRoom.service';
import { setInitDTO } from './dto/chatBackEnd.dto';

// 서버를 실행하게 되면 "서버주소:포트번호/네임스페이스" 에서 웹소켓 서버가 실행된다.
@WebSocketGateway(2424, {
  transports: ['websocket'],
})
export class ChatBackEndGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  constructor(private readonly ChatRoomService: ChatRoomService) {}

  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('AppGateway');
  // client: Record<string, any>;

  // 소켓 연결 시 유저목록에 추가
  handleConnection(client) {
    this.logger.log(`Client Connected : ${client.id}`);

    // 연결이 이루어지자마자 본인 socket id room에서 나오고
    // 기본 room 인 room:lobby에 들어간다.
    client.leave(client.id);
    client.data.roomId = `room:lobby`;
    client.join('room:lobby');
  }

  // 소켓 연결 해제 시 유저목록에서 삭제
  handleDisconnect(client: Socket) {
    const { roomId } = client.data;
    if (
      roomId != 'room:lobby' &&
      !this.server.sockets.adapter.rooms.get(roomId)
    ) {
      this.ChatRoomService.deleteChatRoom(roomId);
      this.server.emit(
        'getChatRoomList',
        this.ChatRoomService.getChatRoomList(),
      );
    }

    this.logger.log(`Client Disconnected : ${client.id}`);
  }

  // 메세지가 전송되면 모든 유저에게 메세지 전송
  @SubscribeMessage('sendMessage')
  sendMessage(client: Socket, message: string): void {
    const { roomId } = client.data;
    client.to(roomId).emit('getMessage', {
      id: client.id,
      nickname: client.data.nickname,
      message,
    });
  }

  // 처음 접속 시 닉네임 등 최초 설정
  @SubscribeMessage('setInit')
  setInit(client: Socket, data: setInitDTO): setInitDTO {
    // 이미 세팅 되어있는 경우
    if (client.data.nickname) {
      return;
    }

    client.data.nickname = data.nickname ? data.nickname : 'user' + client.id;
    client.data.isInit = true;

    return {
      nickname: client.data.nickname,
      room: {
        roomId: 'room:lobby',
        roomName: '로비',
      },
    };
  }

  // 닉네임 변경
  @SubscribeMessage('setNickname')
  setNickname(client: Socket, nickname: string): void {
    const { roomId } = client.data;
    client.to(roomId).emit('getMessage', {
      id: null,
      nickname: '안내',
      message: `${client.data.nickname}님이 ${nickname}님으로 닉네임을 변경하였습니다.`,
    });
    client.data.nickname = nickname;
  }

  // 채팅방 목록 가져오기
  @SubscribeMessage('getChatRoomList')
  getChatRoomList(client: Socket, payload: any) {
    client.emit('getChatRoomList', this.ChatRoomService.getChatRoomList());
  }

  // 채팅방 생성하기
  @SubscribeMessage('createChatRoom')
  createChatRoom(client: Socket, roomName: string) {
    // 원래 속해 있던 room 이 나 혼자 였다면 방 제거
    if (
      client.data.roomId != 'room:lobby' &&
      this.server.sockets.adapter.rooms.get(client.data.roomId).size == 1
    ) {
      this.ChatRoomService.deleteChatRoom(client.data.roomId);
    }
    this.ChatRoomService.createChatRoom(client, roomName);
    return {
      roomId: client.data.roomId,
      roomName: this.ChatRoomService.getChatRoom(client.data.roomId).roomName,
    };
  }

  // 채팅방 들어가기
  @SubscribeMessage('enterChatRoom')
  enterChatRoom(client: Socket, roomId: string) {
    console.log(roomId);
    // 이미 들어와 있는 방일 경우
    if (client.rooms.has(roomId)) {
      return;
    }

    // 원래 속해 있던 방에 나 혼자 였다면 방 제거
    if (
      client.data.roomId != 'room:lobby' &&
      this.server.sockets.adapter.rooms.get(client.data.roomId).size == 1
    ) {
      this.ChatRoomService.deleteChatRoom(client.data.roomId);
    }

    this.ChatRoomService.enterChatRoom(client, roomId);
    return {
      roomId: roomId,
      roomName: this.ChatRoomService.getChatRoom(roomId).roomName,
    };
  }
}

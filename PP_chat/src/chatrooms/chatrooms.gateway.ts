import { Logger, Param } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import ChatroomsService from './chatrooms.service';

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
  }

  @SubscribeMessage('message')
  handleMessage(client: any, payload: any): string {
    return 'Hello world!';
  }
}

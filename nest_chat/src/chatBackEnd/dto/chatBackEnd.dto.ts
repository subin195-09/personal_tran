export class setInitDTO {
  nickname: string;
  room: {
    roomId: string;
    roomName: string;
  };
}

export class chatRoomListDTO {
  roomId: string; // room:아이디  형태
  cheifId: string; // 방장의 socket id
  roomName: string; // 방 제목 (방 생성 시 입력받는다.)
}

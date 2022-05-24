const myInfo = {
  nickname: null,
  id: null,
  room: {
    roomId: null,
    roomName: null,
  },
};

const socket = io('http://localhost:2424', {
  transports: ['websocket'],
});
socket.on('connect', () => {
  console.log('connected');

  // 연결이 되었다면 로컬 스토리지를 확인하여 닉네임을 세팅한다.
  const nickname = localStorage.getItem('nickname');
  socket.emit('setInit', { nickname }, (res) => {
    myInfo.nickname = res.nickname;
    myInfo.id = socket.id;
    myInfo.room = res.room;
    $('.nickname').val(myInfo.nickname);
    $('.roomname').text(myInfo.room.roomName);
  });
  socket.emit('getChatRoomList', null);
});

socket.on('getMessage', ({ id, nickname, message }) => {
  let html = '';
  if (myInfo.id == id) {
    html += '<div class="outgoing_msg">';
    html += '<div class="sent_msg">';
    html += '<p>' + message + '</p>';
    html +=
      '<span class="time_date"> ' +
      nickname +
      '    | 11:01 AM    |    June 9</span>';
    html += '</div>';
    html += '</div>';
  } else {
    html += '<div class="incoming_msg">';
    html += '<div class="received_msg">';
    html += '<div class="received_withd_msg">';
    html += '<p>' + message + '</p>';
    html +=
      '<span class="time_date"> ' +
      nickname +
      '    | 11:01 AM    |    June 9</span>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
  }
  $('.chat').append(html);
  $('.chat').scrollTop($('.chat')[0].scrollHeight);
});

socket.on('getChatRoomList', (res) => {
  let html = '';
  for (const { roomId, roomName } of Object.values(res)) {
    html +=
      '<div class="chat_list ' +
      (myInfo.room.roomId === roomId ? 'active_chat' : 'enterChatRoom') +
      '" data-roomId="' +
      roomId +
      '">';
    html += '<div class="chat_people">';
    html += '<div class="chat_ib">';
    html += '<h5>' + roomName + '</h5>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
  }
  $('.chatRoomList').html(html);
});

socket.on('disconnect', () => {
  $('.chatRoomList').html('');
  console.log('disconnected');
});

// 채팅방 생성
$('.createChatRoom').on('click', () => {
  const roomName = prompt('채팅방 이름을 입력하세요.');
  if (!roomName) {
    return false;
  }
  $('.chat').html('');
  socket.emit('createChatRoom', roomName, (res) => {
    if (!res) return;
    myInfo.room = res;
    $('.roomName').text(myInfo.room.roomName);
    $('.chat').html('');
  });
  socket.emit('getChatRoomList', null);
});

// 채팅방 입장
$(document).on('click', '.enterChatRoom', () => {
  const thisRoomId = $(this).attr('data-roomId');
  socket.emit('enterChatRoom', thisRoomId, (res) => {
    if (!res) return;
    myInfo.room = res;
    $('.roomName').text(myInfo.room.roomName);
    $('.chat').html('');
  });
  socket.emit('getChatRoomList', null);
});

// 메세지 전송
$('.sendMessage').on('click', () => {
  socket.emit('sendMessage', $('.write_msg').val());
  $('.write_msg').val('');
});

// 닉네임 설정
$('.setNickname').on('click', () => {
  const nickname = prompt('닉네임을 입력하세요.');
  if (!nickname) {
    return false;
  }
  socket.emit('setNickname', nickname);
  localStorage.setItem('nickname', nickname);
});

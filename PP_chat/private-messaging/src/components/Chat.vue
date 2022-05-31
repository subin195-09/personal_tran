<template>
  <div>
    <div class="left-panel">
      <user
        v-for="user in users"
        :key="user.userID"
        :user="user"
        :selected="selectedUser === user"
      />
    </div>
    <div class="left-panel-2">
      <room
        v-for="room in rooms"
        :key="room.chatSeq"
        :room="room"
        :selected="selectedRoom === room"
        @select="onSelectRoom(room)"
      />
    </div>
    <message-panel
      v-if="selectedRoom"
      :user="selectedUser"
      :room="selectedRoom"
      @input="onMessage"
      class="right-panel"
    />
    <div class="buttons">
      <div class="group">
        <button v-on:click="join">선택한 방에 Join</button>
        <button v-on:click="leave">선택한 방에서 Leave</button>
      </div>
      <div class="group">
        <input v-model="newroomname" placeholder="방제">
        <button v-on:click="create">방 만들기</button>
      </div>
      <div class="group">
        <button v-on:click="prevChat">이전 채팅</button>
      </div>
    </div>
  </div>
</template>

<script>
import socket from "../socket";
import User from "./User";
import MessagePanel from "./MessagePanel";
import Room from "./Room.vue";

export default {
  name: "Chat",
  components: { User, MessagePanel, Room },
  data() {
    return {
      selectedUser: null,
      selectedRoom: null,
      users: [],
      rooms: [],
      newroomname: "",
    };
  },
  methods: {
    onMessage(content) {
      if (this.selectedRoom) {
        socket.emit("chat", {
          content,
          at: this.selectedRoom.chatSeq,
        });
      }
    },
    onSelectRoom(room) {
      this.selectedRoom = room;
    },
    join() {
      fetch(`http://localhost:3000/chat/join/${this.selectedRoom.chatSeq}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: this.selectedUser.username,
        }),
      })
      .then((data) => data.json())
      .then((data) => {
        this.rooms.forEach((room) => {
          if (room.chatSeq === data.chatSeq) {
            console.log("ok");
            room.roominfo = "참여중";
          }
        });
      })
    },
    leave() {
      fetch(`http://localhost:3000/chat/leave/${this.selectedRoom.chatSeq}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: this.selectedUser.username,
        }),
      })
      .then((data) => data.json())
      .then((data) => {
        this.rooms.forEach((room) => {
          console.log(room.chatSeq);
          if (room.chatSeq === data.chatSeq) {
            room.roominfo = undefined;
          }
        });
      })
    },
    prevChat() {
      console.log(this.selectedRoom.chatSeq);
      console.log(this.selectedRoom.messages.length);
      if (this.selectedRoom.messages.length > 0) {
        for (let index = 0; index < this.selectedRoom.messages.length; index++) {
          const element = this.selectedRoom.messages[index];
          console.log("val", element);
        }
        fetch(`http://localhost:3000/chat/message/${this.selectedRoom.chatSeq}/${this.selectedRoom.messages[0].seq}`, {
          method: 'GET'
        })
        .then((data) => data.json())
        .then((data) => {
          const r =
            data.message.map((arr) => {
              return {
                content: arr.msg,
                at: arr.chatRoom,
                fromSelf: this.selectedUser.username === arr.from,
                username: arr.from,
                seq: arr.messageId,
              };
            });
          this.selectedRoom.messages.unshift(...r);
          for (let index = 0; index < this.selectedRoom.messages.length; index++) {
            const element = this.selectedRoom.messages[index];
            console.log("val1", element);
          }
        });
      }
    },
    create() {
      if (!this.newroomname) {
        alert("방제를 입력하세요");
      } else {
        fetch(`http://localhost:3000/chatrooms/new`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
              chatType: "CHTP20",
              chatName: this.newroomname,
              password: "pass",
              isDirected: false
          }),
        })
        .then((data) => data.json())
        .catch(() => {
          alert('방 생성 실패');
        });
      }
    }
  },
  created() {
    socket.on("connect", () => {
      console.log("connect");
    });

    socket.on("disconnect", () => {
      this.users.forEach((user) => {
        if (user.self) {
          user.connected = false;
        }
      });
    });

    const initReactiveProperties = (user) => {
      user.connected = true;
      user.hasNewMessages = false;
    };

    const initRoomProperties = (room) => {
      room.messages = [];
      if (room.isJoined) {
        room.roominfo = "참여중";
      }
    };

    socket.on("users", (users) => {
      users.forEach((user) => {
        if (user.username === socket.auth.username) {
          user.self = true;
          this.selectedUser = user;
        }
        initReactiveProperties(user);
      });
      // put the current user first, and sort by username
      this.users = users.sort((a, b) => {
        if (a.self) return -1;
        if (b.self) return 1;
        if (a.username < b.username) return -1;
        return a.username > b.username ? 1 : 0;
      });
    });

    socket.on("rooms", (rooms) => {
      this.rooms = [];
      rooms.forEach((room) => {
        initRoomProperties(room);
        this.rooms.push(room);
      });
    });

    socket.on("new room", (room) => {
      initRoomProperties(room);
      this.rooms.push(room);
    });

    socket.on("user leave", (leaveRoom) => {
      for (let i = 0; i < this.rooms.length; i++) {
        const room = this.rooms[i];
        if (room.chatSeq === leaveRoom.chatSeq) {
          room.messages.push({
            content: `[${leaveRoom.user}님이 방에서 나가셨습니다.]`,
            fromSelf: false,
            username: "system",
          });
          break;
        }
      }
    });

    socket.on("join room", (joinRoom) => {
      initRoomProperties(joinRoom);
      for (const room of this.rooms) {
        if (room.chatSeq === joinRoom.chatSeq) {
          room.roominfo = "참여중";
          return;
        }
      }
      this.rooms.push(joinRoom);
    });

    socket.on("user connected", (newUser) => {
      for (const user of this.users) {
        if (user.username === newUser.username) {
          user.userID = newUser.userID;
          user.connected = true;
          return;
        }
      }
      initReactiveProperties(newUser);
      this.users.push(newUser);
    });

    socket.on("user disconnected", (id) => {
      for (let i = 0; i < this.users.length; i++) {
        const user = this.users[i];
        if (user.userID === id) {
          user.connected = false;
          break;
        }
      }
    });

    socket.on("chat", ({ content, at, user, seq }) => {
      for (let i = 0; i < this.rooms.length; i++) {
        const room = this.rooms[i];
        if (room.chatSeq === at) {
          room.messages.push({
            content,
            fromSelf: this.selectedUser.username === user,
            username: user,
            seq,
          });
          break;
        }
      }
    });

  },
  destroyed() {
    socket.off("connect");
    socket.off("disconnect");
    socket.off("user connected");
    socket.off("user disconnected");
    socket.off("users");
    socket.off("private message");
  },
};
</script>

<style scoped>
.left-panel {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 260px;
  overflow-x: hidden;
  background-color: #3e1659;
  color: white;
}
.left-panel-2 {
  position: fixed;
  left: 260px;
  top: 0;
  bottom: 0;
  width: 260px;
  overflow-x: hidden;
  background-color: #412d6a;
  color: white;
}
.buttons {
  position: fixed;
  left: 30px;
  bottom: 30px;
  width: 290px;
  height: 180px;
  padding: 10px;
  overflow-x: hidden;
  background-color: #ff00ae;
  border-radius: 20px;
  color: white;
}

.group {
  position: relative;
  padding: 10px;
  margin: 10px;
  overflow-x: hidden;
  background-color: #821e62;
  border-radius: 12px;
  color: white;
}

.right-panel {
  margin-left: 520px;
}
</style>

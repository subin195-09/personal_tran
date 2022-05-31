import { Manager } from "socket.io-client";

const URL = "http://localhost:3000";
const socketManager = new Manager(URL, { path: '/socket.io', autoConnect: false, transports: ["websocket"] });
/*
socket.onAny((event, ...args) => {
  console.log(event, args);
});
*/
const socket = socketManager.socket("/socket");
export default socket;

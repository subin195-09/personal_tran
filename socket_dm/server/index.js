const httpServer = require("htt[").createServer();
const io = require("socket.io")(httpServer, {
	cors: {
		origin: "http://localhost:8080",
	},
});

io.use((socket, next) => { // socket이 연결되기 전에 실행되는 함수이다.
	const username = socket.handshake.auth.username; // socket.handshake.auth는 무엇인가
	if (!username) {
		return next(new Error("Authentication error"));
	}
	socket.username = username;
	next();
});

io.on("connection", (socket) => {
	const users = [];
	for (let [id, socket] of io.of("/").sockets) {
		users.push({
			userID: id,
			username: socket.username,
		});
	}
	socket.emit("users", users);

	socket.broadcast.emit("user connected", {
		userID: socket.id,
		usersname: socket.username,
	});

	socket.on("private message", ({ content, to }) => {
		socket.to(to).emit("private message", {
			content,
			from: socket.id,
		});
	});

	socket.on("disconnect", () => {
		socket.broadcast.emit("user disconnected", socket.id);
	});
});

const PORT = 3000;

httpServer.listen(PORT, () => {
	console.log(`server is running on port ${PORT}`);
});

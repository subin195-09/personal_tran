const express = require('express');
const socket = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = socket(server);

app.get('/', () => {

})

server.listen(3000, () => {
	console.log("server is running on port 3000");
});




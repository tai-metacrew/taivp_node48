import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

let count = 1;
io.on("connection", (socket) => {
  console.log("New client connected: ", socket.id);
  io.emit("sendMessage", { message: "Hello from server" });

  socket.on("increament", () => {
    console.log("Client send increment event");
    count = count + 1;
    io.emeit("serverSendCount", { count });
  });
});

const PORT = 3001;

server.listen(PORT, () => {
  console.log(`Server socketio is running on port ${PORT}`);
});

import express from "express";
import { createServer as createViteServer } from "vite";
import { Server } from "socket.io";
import http from "http";

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: "*" }
  });
  const PORT = 3000;

  io.on("connection", (socket) => {
    socket.on("join-room", (room) => {
      socket.join(room.toString());
    });
    socket.on("new-round", ({ room, newRoom }) => {
      io.to(room.toString()).emit("redirect-room", newRoom);
    });
    socket.on("update-inputs", ({ room, inputs }) => {
      socket.to(room.toString()).emit("sync-inputs", inputs);
    });
    socket.on("request-sync", (room) => {
      socket.to(room.toString()).emit("request-sync");
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

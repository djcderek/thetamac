import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketServer } from "socket.io";
import { setupMultiplayerHandlers } from "./src/lib/multiplayer/socket-handlers";
import { setupRacingHandlers } from "./src/lib/racing/socket-handlers";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new SocketServer(httpServer, {
    cors: {
      origin: dev ? "http://localhost:3000" : process.env.NEXT_PUBLIC_APP_URL,
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  // Setup multiplayer game handlers (1v1 mode)
  setupMultiplayerHandlers(io);
  
  // Setup Math Racers game handlers (5-player racing mode)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setupRacingHandlers(io as any);

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Socket.io server running`);
    console.log(`> Math Racers mode enabled`);
  });
});





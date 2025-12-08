import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketServer } from "socket.io";
import { setupMultiplayerHandlers } from "./src/lib/multiplayer/socket-handlers";
import { setupRacingHandlers } from "./src/lib/racing/socket-handlers";
import { env } from "./src/lib/env";

const dev = env.NODE_ENV !== "production";
// In production (Docker/Fly.io), bind to 0.0.0.0 to accept external connections
const hostname = dev ? "localhost" : "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    
    // Health check endpoint for Fly.io
    if (parsedUrl.pathname === "/api/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }));
      return;
    }
    
    handle(req, res, parsedUrl);
  });

  // Build allowed origins for CORS
  const allowedOrigins = [env.NEXT_PUBLIC_APP_URL];
  // In production, also allow Fly.io internal URLs
  if (!dev && process.env.FLY_APP_NAME) {
    allowedOrigins.push(`https://${process.env.FLY_APP_NAME}.fly.dev`);
  }

  const io = new SocketServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    // Cap inbound payloads to reduce risk from oversized client messages
    maxHttpBufferSize: 16 * 1024, // 16kb
    // Increase ping timeout for potentially slower connections
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Setup multiplayer game handlers (1v1 mode)
  setupMultiplayerHandlers(io);
  
  // Setup Math Racers game handlers (5-player racing mode)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setupRacingHandlers(io as any);

  httpServer.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Socket.io server running`);
    console.log(`> Math Racers mode enabled`);
    if (process.env.FLY_APP_NAME) {
      console.log(`> Running on Fly.io: ${process.env.FLY_APP_NAME}`);
    }
  });
});





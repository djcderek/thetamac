import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketServer } from "socket.io";
import { setupMultiplayerHandlers } from "./src/lib/multiplayer/socket-handlers";
import { setupRacingHandlers } from "./src/lib/racing/socket-handlers";

// Use process.env directly to avoid env validation blocking startup
const dev = process.env.NODE_ENV !== "production";
// In production (Docker/Fly.io), bind to 0.0.0.0 to accept external connections
const hostname = dev ? "localhost" : "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

// Check if we're running in WebSocket-only mode (production on Fly.io)
const websocketOnly = process.env.WEBSOCKET_ONLY === "true";
// The main app URL to redirect to (Vercel)
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://thetamac.vercel.app";
const appOrigin = (() => {
  try {
    return new URL(appUrl).origin;
  } catch {
    return appUrl.replace(/\/+$/, "");
  }
})();

console.log(`> Starting server in ${dev ? "development" : "production"} mode`);
console.log(`> WebSocket-only mode: ${websocketOnly}`);
console.log(`> Will listen on ${hostname}:${port}`);

// Create HTTP server
const httpServer = createServer((req, res) => {
  const parsedUrl = parse(req.url!, true);
  
  // Health check endpoint for Fly.io - always respond
  if (parsedUrl.pathname === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }));
    return;
  }
  
  // In WebSocket-only mode, redirect all other requests to the main app
  if (websocketOnly) {
    // Allow Socket.io polling transport (used as fallback when WebSocket fails)
    if (parsedUrl.pathname?.startsWith("/socket.io")) {
      // Let Socket.io handle these requests (handled by the io server)
      return;
    }
    
    // Redirect everything else to the main Vercel app
    const redirectUrl = `${appOrigin}${req.url}`;
    res.writeHead(302, { Location: redirectUrl });
    res.end();
    return;
  }
  
  // Development mode: serve Next.js app
  if (!nextReady) {
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "starting", message: "Server is starting up" }));
    return;
  }
  
  handle(req, res, parsedUrl);
});

let nextReady = false;
let handle: ReturnType<typeof next>["getRequestHandler"] extends () => infer R ? R : never;

// Only initialize Next.js if not in WebSocket-only mode
const app = websocketOnly ? null : next({ dev, hostname, port });

// Start listening immediately so health checks pass
httpServer.listen(port, hostname, () => {
  console.log(`> HTTP server listening on http://${hostname}:${port}`);
  console.log(`> Health check available at /api/health`);
  if (websocketOnly) {
    console.log(`> WebSocket-only mode: HTTP requests will redirect to ${appUrl}`);
  }
});

// Build allowed origins for CORS
const allowedOrigins: string[] = [];
if (process.env.NEXT_PUBLIC_APP_URL) {
  // Normalize to an origin (no path/trailing slash) so CORS matches the browser Origin header.
  const url = new URL(process.env.NEXT_PUBLIC_APP_URL);
  allowedOrigins.push(url.origin);
  // Also allow www version if it's a custom domain
  if (!url.hostname.startsWith("www.")) {
    allowedOrigins.push(`${url.protocol}//www.${url.hostname}`);
  }
}
// In production, also allow Fly.io internal URLs
if (!dev && process.env.FLY_APP_NAME) {
  allowedOrigins.push(`https://${process.env.FLY_APP_NAME}.fly.dev`);
}

const io = new SocketServer(httpServer, {
  cors: {
    origin: allowedOrigins.length > 0 ? allowedOrigins : "*",
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

// Engine.IO-level connection errors (useful when proxies/CORS/auth break handshakes)
io.engine.on("connection_error", (err: unknown) => {
  console.error("[socket.io] connection_error", err);
});

// Setup multiplayer game handlers (1v1 mode)
setupMultiplayerHandlers(io);

// Setup Math Racers game handlers (5-player racing mode)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
setupRacingHandlers(io as any);

// Prepare Next.js in the background (only in dev/non-websocket-only mode)
if (app) {
  app.prepare().then(() => {
    handle = app.getRequestHandler();
    nextReady = true;
    console.log(`> Next.js ready`);
    console.log(`> Socket.io server running`);
    console.log(`> Math Racers mode enabled`);
    if (process.env.FLY_APP_NAME) {
      console.log(`> Running on Fly.io: ${process.env.FLY_APP_NAME}`);
    }
  }).catch((err) => {
    console.error("Failed to prepare Next.js:", err);
    process.exit(1);
  });
} else {
  // WebSocket-only mode - no Next.js needed
  console.log(`> Socket.io server running (WebSocket-only mode)`);
  console.log(`> Math Racers mode enabled`);
  if (process.env.FLY_APP_NAME) {
    console.log(`> Running on Fly.io: ${process.env.FLY_APP_NAME}`);
  }
}





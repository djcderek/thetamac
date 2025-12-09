import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker/Fly.io deployment
  output: "standalone",

  // Security headers
  async headers() {
    // Get the socket URL for CSP (defaults to same origin if not set)
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "";
    const socketHost = socketUrl ? new URL(socketUrl).host : "";

    // Build connect-src directive
    const connectSrc = [
      "'self'",
      "https://api.stripe.com",
      "https://*.stripe.com",
      // Allow WebSocket connections to Fly.io
      socketHost ? `https://${socketHost}` : "",
      socketHost ? `wss://${socketHost}` : "",
      // Allow same-origin WebSocket for local dev
      "ws://localhost:*",
      "wss://localhost:*",
    ]
      .filter(Boolean)
      .join(" ");

    return [
      {
        // Apply to all routes
        source: "/:path*",
        headers: [
          // Prevent clickjacking
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          // Prevent MIME type sniffing
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // Control referrer information
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Restrict browser features
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // XSS protection (legacy browsers)
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          // Content Security Policy
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.googleusercontent.com https://*.stripe.com",
              "font-src 'self' data:",
              "frame-src https://js.stripe.com https://hooks.stripe.com",
              `connect-src ${connectSrc}`,
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;

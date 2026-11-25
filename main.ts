// Echo fixture: no automatic heartbeat or application-level session timeout.
const port = Number(Deno.env.get("PORT") ?? 8000);
const startedAt = new Date().toISOString();

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}

let activeConnections = 0;
let totalConnections = 0;
let messagesReceived = 0;
let bytesReceived = 0;
let bytesSent = 0;
const encoder = new TextEncoder();

Deno.serve({ hostname: "0.0.0.0", port }, (request) => {
  const path = new URL(request.url).pathname;

  if (path === "/health") {
    return Response.json({
      status: "ok",
      fixtureVersion: "ws-test-v1",
      runtime: Deno.version.deno,
      startedAt,
      activeConnections,
      totalConnections,
      messagesReceived,
      bytesReceived,
      bytesSent,
    }, { headers: { "cache-control": "no-store" } });
  }

  if (path === "/ws") {
    if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
      return new Response("WebSocket upgrade required\n", { status: 426 });
    }

    // Deno normally sends idle pings. Disable them so an idle connection
    // really stays idle; a test client can send its own heartbeat if needed.
    const { socket, response } = Deno.upgradeWebSocket(request, {
      idleTimeout: 0,
    });
    socket.binaryType = "arraybuffer";
    let opened = false;
    socket.onopen = () => {
      opened = true;
      activeConnections++;
      totalConnections++;
    };
    socket.onmessage = (event) => {
      const data = event.data;
      const size = typeof data === "string"
        ? encoder.encode(data).byteLength
        : data.byteLength;
      messagesReceived++;
      bytesReceived += size;
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(data);
        bytesSent += size;
      }
    };
    socket.onclose = () => {
      if (opened) {
        opened = false;
        activeConnections--;
      }
    };
    socket.onerror = () => console.error("WebSocket transport error");
    return response;
  }

  if (path === "/") {
    return new Response("apps-wss-test v1\nWebSocket echo: /ws\nHealth and counters: /health\n");
  }
  return new Response("Not found\n", { status: 404 });
});

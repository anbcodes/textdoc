import http from 'http';
import {readFile, writeFile} from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { readFileSync } from 'fs';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = +(process.argv[2] ?? 8080);
let stateFile = "./state.json"

// HTTP server to serve index.html
const server = http.createServer(async (req, res) => {
  if (req.method === 'GET') {
    const filePath = path.join(__dirname, 'index.html');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    let file = await readFile(filePath);
    res.end(file);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

server.on('upgrade', (req, socket, head) => {
  if (req.url === '/ws') {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  } else {
    socket.destroy();
  }
});

// WebSocket server attached to the HTTP server
const wss = new WebSocketServer({ server, path: '/ws' });
let doc = [
  ['i', 0, 'hello world!'],
];

try {
  let content = readFileSync(stateFile, 'utf8');
  doc = JSON.parse(content)
} catch (e) {
  console.log("No save found")
}

let changed = true;
setInterval(() => {
  if (changed) {
    writeFile(stateFile, JSON.stringify(doc));
    changed = false;
  }
}, 1000);

wss.on('connection', (ws) => {
  console.log('New client connected');
  ws.send(JSON.stringify(doc));

  ws.on('message', (data, isbin) => {
    const msg = isbin ? data : data.toString();
    console.log(`Received: ${msg}`);

    doc.push(...JSON.parse(msg));
    changed = true;

    for (const client of wss.clients) {
      if (client.readyState === ws.OPEN && client !== ws) {
        client.send(msg);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`HTTP + WebSocket server running at http://localhost:${PORT}/`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws`);
});


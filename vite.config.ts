import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve('./data');
const DATA_FILE = path.join(DATA_DIR, 'portfolio.json');

export default defineConfig({
  plugins: [
    react(),
    {
      // ローカルファイルストレージ: data/portfolio.json に全データを保存する。
      // localStorage はポートが変わると消えるが、このファイルは永続する。
      name: 'portfolio-storage',
      configureServer(server) {
        server.middlewares.use('/api/storage', (req, res) => {
          if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
          }

          if (req.method === 'GET') {
            if (fs.existsSync(DATA_FILE)) {
              try {
                const content = fs.readFileSync(DATA_FILE, 'utf-8');
                JSON.parse(content); // 壊れたファイルを弾く
                res.setHeader('Content-Type', 'application/json');
                res.end(content);
              } catch {
                res.setHeader('Content-Type', 'application/json');
                res.end('{}');
              }
            } else {
              res.setHeader('Content-Type', 'application/json');
              res.end('{}');
            }
          } else if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', () => {
              try {
                JSON.parse(body); // バリデーション
                fs.writeFileSync(DATA_FILE, body, 'utf-8');
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 200;
                res.end('{"ok":true}');
              } catch {
                res.statusCode = 400;
                res.end('{"error":"Invalid JSON"}');
              }
            });
          } else {
            res.statusCode = 405;
            res.end();
          }
        });
      },
    },
  ],
  server: {
    // ポートを固定する。ポートが変わると localStorage のオリジンが変わりデータが消えるため。
    port: 5173,
  },
});

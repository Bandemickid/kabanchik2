// server.js
const express = require('express');
const path = require('path');

const app = express();
const ROOT = __dirname;

// статика з кореня
app.use(express.static(ROOT));

// головна
app.get('/', (_req, res) => res.sendFile(path.join(ROOT, 'index.html')));

// MPA-роути на файл у корені
[
  ['/citizenship', 'citizenship.html'],
  ['/ru/citizenship', 'citizenship.html'],
].forEach(([route, file]) => {
  app.get([route, route + '/'], (_req, res) =>
    res.sendFile(path.join(ROOT, file))
  );
});

// 404
app.use((_req, res) => res.status(404).send('Not Found'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`→ http://localhost:${PORT}`));

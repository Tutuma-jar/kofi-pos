import { createApp } from './app.js';

const portText = process.env.PORT ?? '3000';
const port = Number(portText);

if (
  !/^\d+$/.test(portText) ||
  !Number.isInteger(port) ||
  port < 1 ||
  port > 65535
) {
  throw new Error('PORT debe ser un entero entre 1 y 65535.');
}

const server = createApp().listen(port, '127.0.0.1', () => {
  console.log(`Kofi: Express técnico en http://127.0.0.1:${port}`);
});

server.on('error', (error) => {
  console.error('No se pudo iniciar Express:', error.message);
  process.exitCode = 1;
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.close();
  });
}

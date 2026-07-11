const { io } = require('socket.io-client');

const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('✅ WebSocket bağlantısı kuruldu');
  console.log('Socket ID:', socket.id);
});

socket.on('new-order', (order) => {
  console.log('\n🔔 YENİ SİPARİŞ GELDİ');
  console.dir(order, { depth: null });
});

socket.on('connect_error', (error) => {
  console.error('❌ WebSocket bağlantı hatası:', error.message);
});

socket.on('disconnect', (reason) => {
  console.log('⚠️ WebSocket bağlantısı kesildi:', reason);
});
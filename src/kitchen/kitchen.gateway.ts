import {
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class KitchenGateway {
  @WebSocketServer()
  server!: Server;

   sendNewOrder(order: any) {
    console.log(
      '📡 new-order yayını yapılıyor. Bağlı istemci sayısı:',
      this.server.sockets.sockets.size,
    );

    this.server.emit('new-order', order);
  }
}
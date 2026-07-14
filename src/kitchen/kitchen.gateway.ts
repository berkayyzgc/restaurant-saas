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

  sendServiceRequestCreated(serviceRequest: unknown) {
  console.log(
    '📡 service-request-created yayını yapılıyor.',
  );

  this.server.emit(
    'service-request-created',
    serviceRequest,
  );
}

sendServiceRequestUpdated(serviceRequest: unknown) {
  console.log(
    '📡 service-request-updated yayını yapılıyor.',
  );

  this.server.emit(
    'service-request-updated',
    serviceRequest,
  );
}

  sendPaymentCompleted(payment: unknown) {
  this.server.emit('payment-completed', payment);
}

  sendOrderUpdated(order: any) {
    console.log(
      '📡 order-updated yayını yapılıyor. Bağlı istemci sayısı:',
      this.server.sockets.sockets.size,
    );

    this.server.emit('order-updated', order);
  }
}
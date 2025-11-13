import { Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { WebSocketEvent, WebSocketRoom } from '../../common/enums';

interface RegisterUserDto {
  userId: string;
}

interface NotificationPayload {
  jobId: string | number;
  progress?: number;
  message?: string;
  planId?: string;
  error?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    // Setup Redis adapter for Socket.IO (enables multi-server support)
    const redisHost = this.configService.get<string>('redis.host') || 'localhost';
    const redisPort = this.configService.get<number>('redis.port') || 6379;
    const redisPassword = this.configService.get<string>('redis.password');

    const pubClient = createClient({
      socket: {
        host: redisHost,
        port: redisPort,
      },
      password: redisPassword,
    });

    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    this.server.adapter(createAdapter(pubClient, subClient));
    this.logger.log('Socket.IO configured with Redis adapter');
  }

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage(WebSocketEvent.REGISTER_USER)
  handleRegisterUser(
    @MessageBody() data: RegisterUserDto,
    @ConnectedSocket() client: Socket,
  ): void {
    const { userId } = data;
    const userRoom = `${WebSocketRoom.USER_PREFIX}${userId}`;

    // Join user-specific room
    client.join(userRoom);

    this.logger.log(`User ${userId} registered with socket ${client.id} in room ${userRoom}`);

    client.emit(WebSocketEvent.REGISTRATION_SUCCESS, { userId });
  }

  /**
   * Send notification to specific user (works across multiple servers via Redis)
   */
  sendToUser(userId: string, event: WebSocketEvent, data: NotificationPayload): void {
    const userRoom = `${WebSocketRoom.USER_PREFIX}${userId}`;
    this.server.to(userRoom).emit(event, data);
    this.logger.debug(`Sent event "${event}" to user ${userId}`);
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(event: WebSocketEvent, data: NotificationPayload): void {
    this.server.emit(event, data);
    this.logger.debug(`Broadcasted event "${event}"`);
  }

  /**
   * Send to admin room
   */
  sendToAdmins(event: WebSocketEvent, data: NotificationPayload): void {
    this.server.to(WebSocketRoom.ADMIN).emit(event, data);
    this.logger.debug(`Sent event "${event}" to admins`);
  }
}

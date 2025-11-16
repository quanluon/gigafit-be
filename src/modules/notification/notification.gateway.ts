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
import { createAdapter } from '@socket.io/mongo-adapter';
import { MongoClient } from 'mongodb';
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
  private mongoClient?: MongoClient;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    // Setup MongoDB adapter for Socket.IO (enables multi-server support)
    // Note: MongoDB adapter requires a replica set or sharded cluster for Change Streams
    // For local development, you can create a replica set: https://docs.mongodb.com/manual/tutorial/convert-standalone-to-replica-set/
    const mongoUri =
      this.configService.get<string>('database.uri') || 'mongodb://localhost:27017/gigafit';

    // Extract database name from URI or use default
    const dbName = this.extractDatabaseName(mongoUri) || 'gigafit';
    const collectionName = 'socket.io-adapter-events';

    this.mongoClient = new MongoClient(mongoUri);

    try {
      await this.mongoClient.connect();
      this.logger.log('MongoDB client connected for Socket.IO adapter');

      const mongoCollection = this.mongoClient.db(dbName).collection(collectionName);

      // Create TTL index for automatic cleanup (expires after 1 hour)
      try {
        await mongoCollection.createIndex(
          { createdAt: 1 },
          { expireAfterSeconds: 3600, background: true },
        );
        this.logger.log('TTL index created for Socket.IO adapter collection');
      } catch (error) {
        // Index might already exist, which is fine
        this.logger.debug('TTL index creation skipped (may already exist)');
      }

      // Configure adapter with TTL index support
      this.server.adapter(
        createAdapter(mongoCollection, {
          addCreatedAtField: true,
        }),
      );
      this.logger.log('Socket.IO configured with MongoDB adapter');
    } catch (error) {
      this.logger.error('Failed to setup MongoDB adapter for Socket.IO', error);
      throw error;
    }
  }

  /**
   * Extract database name from MongoDB URI
   */
  private extractDatabaseName(uri: string): string | null {
    try {
      const url = new URL(uri);
      const pathname = url.pathname;
      if (pathname && pathname.length > 1) {
        // Remove leading slash
        return pathname.substring(1).split('/')[0] || null;
      }
      return null;
    } catch {
      // Fallback: try to extract from connection string format
      const match = uri.match(/mongodb:\/\/[^/]+\/([^?]+)/);
      return match ? match[1] : null;
    }
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
   * Send notification to specific user (works across multiple servers via MongoDB)
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

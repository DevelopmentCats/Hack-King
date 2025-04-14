import { Server } from 'socket.io';
import { createSocketService } from '../services/socket.service';

export class SocketController {
  private socketService: ReturnType<typeof createSocketService>;

  constructor(io: Server) {
    this.socketService = createSocketService(io);
    console.log('Socket controller initialized');
  }

  /**
   * Send a notification to a user
   */
  async sendNotification(userId: string, notification: {
    title: string;
    content: string;
    type: 'ATTACK' | 'DEFENSE' | 'SYSTEM' | 'ACHIEVEMENT' | 'TRANSACTION';
  }): Promise<void> {
    await this.socketService.sendNotification(userId, notification);
  }

  /**
   * Send an achievement notification to a user
   */
  async sendAchievementNotification(userId: string, achievement: {
    id: string;
    name: string;
    description: string;
    experienceReward: number;
  }): Promise<void> {
    await this.socketService.sendAchievementNotification(userId, achievement);
  }

  /**
   * Send a level up notification to a user
   */
  async sendLevelUpNotification(userId: string, oldLevel: number, newLevel: number): Promise<void> {
    await this.socketService.sendLevelUpNotification(userId, oldLevel, newLevel);
  }

  /**
   * Emit an event to all sockets belonging to a user
   */
  emitToUser(userId: string, event: string, data: any): void {
    this.socketService.emitToUser(userId, event, data);
  }
}

// Export a function to create the controller
export const createSocketController = (io: Server): SocketController => {
  return new SocketController(io);
};
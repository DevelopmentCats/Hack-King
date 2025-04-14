import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma.service';
import { TokenPayload } from '../types';

interface AuthenticatedSocket extends Socket {
  user?: TokenPayload;
}

export class SocketService {
  private io: Server;
  private userSockets: Map<string, Set<string>> = new Map();
  private socketUsers: Map<string, string> = new Map();

  constructor(io: Server) {
    this.io = io;
    this.setupSocketHandlers();
  }

  /**
   * Set up socket event handlers
   */
  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log('User connected:', socket.id);

      // Handle authentication
      socket.on('authenticate', async (data: { token: string }) => {
        try {
          const decoded = jwt.verify(
            data.token,
            process.env.JWT_SECRET || 'default_secret'
          ) as TokenPayload;

          // Store user data in socket
          socket.user = decoded;

          // Track user's sockets
          this.addUserSocket(decoded.userId, socket.id);

          // Send success response
          socket.emit('authenticate_result', {
            success: true,
            userId: decoded.userId,
            username: decoded.username
          });

          // Set up authenticated event handlers
          this.setupAuthenticatedHandlers(socket);
        } catch (error) {
          console.error('Socket authentication error:', error);
          socket.emit('authenticate_result', {
            success: false,
            error: 'Invalid or expired token'
          });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (socket.user) {
          this.removeUserSocket(socket.user.userId, socket.id);
        }
      });
    });
  }

  /**
   * Set up event handlers for authenticated sockets
   */
  private setupAuthenticatedHandlers(socket: AuthenticatedSocket): void {
    if (!socket.user) return;

    // Terminal command handling
    socket.on('terminal:command', async (data: {
      attemptId: string;
      command: string;
      timestamp: number;
    }) => {
      try {
        const { attemptId, command, timestamp } = data;

        // Check if attempt exists and belongs to user
        const attack = await prisma.attack.findFirst({
          where: {
            id: attemptId,
            attackerId: socket.user?.userId
          },
          include: {
            targetMachine: true
          }
        });

        if (!attack) {
          socket.emit('error', {
            code: 'NOT_FOUND',
            message: 'Mission attempt not found',
            context: { attemptId }
          });
          return;
        }

        // Process command
        const commandId = this.generateId();
        const result = await this.processTerminalCommand(command, attack);

        // Update logs
        const logs = JSON.parse(attack.logs || '[]');
        logs.push({
          timestamp: new Date(),
          command,
          result: result.output
        });

        await prisma.attack.update({
          where: { id: attemptId },
          data: { logs: JSON.stringify(logs) }
        });

        // Send response
        socket.emit('terminal:response', {
          attemptId,
          commandId,
          command,
          output: result.output,
          status: result.status,
          timestamp: Date.now(),
          ...(result.objectiveCompleted && { objectiveCompleted: result.objectiveCompleted })
        });

        // If objective completed, update environment
        if (result.objectiveCompleted) {
          socket.emit('terminal:environment_update', {
            attemptId,
            environment: {
              currentDirectory: result.newDirectory || '/home/user',
              variables: {
                TARGET_IP: attack.targetMachine.ipAddress,
                ACCESS_LEVEL: result.newAccessLevel || 'user'
              },
              availableCommands: this.getAvailableCommands(result.newAccessLevel || 'user')
            }
          });

          // Send mission update
          socket.emit('game:mission_update', {
            attemptId,
            missionId: attack.targetMachineId,
            status: 'in_progress',
            objectives: [
              {
                id: result.objectiveCompleted.objectiveId,
                description: result.objectiveCompleted.description,
                status: 'completed',
                completedAt: Date.now()
              },
              {
                id: this.generateId(),
                description: 'Next objective',
                status: 'in_progress',
                hint: 'Continue exploring the system'
              }
            ],
            timeRemaining: 1800, // 30 minutes in seconds
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error('Terminal command error:', error);
        socket.emit('error', {
          code: 'SERVER_ERROR',
          message: 'Error processing command',
          context: { error: (error as Error).message }
        });
      }
    });

    // Terminal history request
    socket.on('terminal:history', async (data: {
      attemptId: string;
      limit: number;
      offset: number;
    }) => {
      try {
        const { attemptId, limit, offset } = data;

        // Check if attempt exists and belongs to user
        const attack = await prisma.attack.findFirst({
          where: {
            id: attemptId,
            attackerId: socket.user?.userId
          }
        });

        if (!attack) {
          socket.emit('error', {
            code: 'NOT_FOUND',
            message: 'Mission attempt not found',
            context: { attemptId }
          });
          return;
        }

        // Get command history from logs
        const logs = JSON.parse(attack.logs || '[]');
        const commands = logs.slice(offset, offset + limit).map((log: any, index: number) => ({
          commandId: this.generateId(),
          command: log.command,
          output: log.result,
          status: 'success',
          timestamp: new Date(log.timestamp).getTime()
        }));

        socket.emit('terminal:history_result', {
          attemptId,
          commands,
          pagination: {
            total: logs.length,
            limit,
            offset
          }
        });
      } catch (error) {
        console.error('Terminal history error:', error);
        socket.emit('error', {
          code: 'SERVER_ERROR',
          message: 'Error retrieving command history',
          context: { error: (error as Error).message }
        });
      }
    });

    // Notification handling
    socket.on('notification:mark_read', async (data: { notificationId: string }) => {
      try {
        const { notificationId } = data;

        // Update notification
        const notification = await prisma.notification.findFirst({
          where: {
            id: notificationId,
            userId: socket.user?.userId
          }
        });

        if (!notification) {
          socket.emit('error', {
            code: 'NOT_FOUND',
            message: 'Notification not found',
            context: { notificationId }
          });
          return;
        }

        await prisma.notification.update({
          where: { id: notificationId },
          data: {
            isRead: true,
            readAt: new Date()
          }
        });

        socket.emit('notification:marked_read', {
          notificationId,
          success: true
        });
      } catch (error) {
        console.error('Mark notification read error:', error);
        socket.emit('error', {
          code: 'SERVER_ERROR',
          message: 'Error marking notification as read',
          context: { error: (error as Error).message }
        });
      }
    });

    // Get unread notification count
    socket.on('notification:get_unread_count', async () => {
      try {
        const count = await prisma.notification.count({
          where: {
            userId: socket.user?.userId,
            isRead: false
          }
        });

        socket.emit('notification:unread_count', { count });
      } catch (error) {
        console.error('Get notification count error:', error);
        socket.emit('error', {
          code: 'SERVER_ERROR',
          message: 'Error getting notification count',
          context: { error: (error as Error).message }
        });
      }
    });

    // Ping/pong for connection testing
    socket.on('ping', () => {
      socket.emit('pong', {
        serverTime: Date.now(),
        latency: 0 // Client will calculate actual latency
      });
    });
  }

  /**
   * Process a terminal command
   */
  private async processTerminalCommand(command: string, attack: any): Promise<{
    output: string;
    status: 'success' | 'error' | 'partial';
    objectiveCompleted?: {
      objectiveId: string;
      description: string;
    };
    newDirectory?: string;
    newAccessLevel?: string;
  }> {
    const cmd = command.toLowerCase().trim();
    
    // Help command
    if (cmd === 'help') {
      return {
        output: `Available commands:
- help: Display this help message
- scan <ip>: Scan a target IP for open ports
- connect <ip> <port>: Connect to a specific port on a target
- exploit <vulnerability>: Attempt to exploit a vulnerability
- ls: List files in current directory
- cd <directory>: Change directory
- cat <file>: Display file contents
- exit: Exit the current session`,
        status: 'success'
      };
    }
    
    // Scan command
    if (cmd.startsWith('scan')) {
      const ip = cmd.split(' ')[1];
      
      if (!ip) {
        return {
          output: 'Usage: scan <ip>',
          status: 'error'
        };
      }
      
      if (ip === attack.targetMachine.ipAddress) {
        return {
          output: `Scanning ${ip}...\n\nPORT     STATE    SERVICE\n22/tcp   open     ssh\n80/tcp   open     http\n443/tcp  open     https\n3306/tcp filtered mysql`,
          status: 'success',
          objectiveCompleted: {
            objectiveId: this.generateId(),
            description: 'Scan the target network'
          }
        };
      } else {
        return {
          output: `Scanning ${ip}...\n\nNo response from host. Host may be down or blocking ICMP.`,
          status: 'error'
        };
      }
    }
    
    // Connect command
    if (cmd.startsWith('connect')) {
      const parts = cmd.split(' ');
      const ip = parts[1];
      const port = parts[2];
      
      if (!ip || !port) {
        return {
          output: 'Usage: connect <ip> <port>',
          status: 'error'
        };
      }
      
      if (ip === attack.targetMachine.ipAddress) {
        if (port === '80' || port === '443') {
          return {
            output: `Connected to ${ip}:${port}\n\nWelcome to ${attack.targetMachine.name} web server\nRunning Apache/2.4.41 (Ubuntu)`,
            status: 'success',
            objectiveCompleted: {
              objectiveId: this.generateId(),
              description: 'Connect to the web server'
            },
            newDirectory: '/var/www/html'
          };
        } else if (port === '22') {
          return {
            output: `Connected to ${ip}:${port}\n\nSSH-2.0-OpenSSH_8.2p1 Ubuntu-4ubuntu0.5\nPassword authentication required.`,
            status: 'success'
          };
        } else if (port === '3306') {
          return {
            output: `Connection to ${ip}:${port} failed. Connection refused.`,
            status: 'error'
          };
        } else {
          return {
            output: `Connection to ${ip}:${port} failed. No service running on that port.`,
            status: 'error'
          };
        }
      } else {
        return {
          output: `Connection to ${ip}:${port} failed. Host unreachable.`,
          status: 'error'
        };
      }
    }
    
    // Exploit command
    if (cmd.startsWith('exploit')) {
      const vulnerability = cmd.substring(8).trim();
      
      if (!vulnerability) {
        return {
          output: 'Usage: exploit <vulnerability>',
          status: 'error'
        };
      }
      
      // Check if target has this vulnerability
      const hasVulnerability = attack.targetMachine.vulnerabilities.some(
        (v: any) => v.name.toLowerCase().includes(vulnerability.toLowerCase())
      );
      
      if (hasVulnerability) {
        return {
          output: `Exploiting ${vulnerability}...\n\nExploit successful! You have gained user access to the system.`,
          status: 'success',
          objectiveCompleted: {
            objectiveId: this.generateId(),
            description: `Exploit ${vulnerability}`
          },
          newAccessLevel: 'user'
        };
      } else {
        return {
          output: `Exploiting ${vulnerability}...\n\nExploit failed. The target does not appear to be vulnerable to this exploit.`,
          status: 'error'
        };
      }
    }
    
    // Default response for unrecognized commands
    return {
      output: `Command not recognized: ${command}\nType 'help' for a list of available commands.`,
      status: 'error'
    };
  }

  /**
   * Get available commands based on access level
   */
  private getAvailableCommands(accessLevel: string): string[] {
    const baseCommands = ['help', 'scan', 'connect', 'exit'];
    
    if (accessLevel === 'user') {
      return [...baseCommands, 'ls', 'cd', 'cat', 'whoami', 'pwd', 'find'];
    } else if (accessLevel === 'root') {
      return [...baseCommands, 'ls', 'cd', 'cat', 'whoami', 'pwd', 'find', 'chmod', 'chown', 'rm', 'systemctl'];
    }
    
    return baseCommands;
  }

  /**
   * Send a notification to a user
   */
  async sendNotification(userId: string, notification: {
    title: string;
    content: string;
    type: 'ATTACK' | 'DEFENSE' | 'SYSTEM' | 'ACHIEVEMENT' | 'TRANSACTION';
  }): Promise<void> {
    try {
      // Create notification in database
      const newNotification = await prisma.notification.create({
        data: {
          userId,
          title: notification.title,
          content: notification.content,
          type: notification.type,
          isRead: false
        }
      });

      // Send to all user's connected sockets
      this.emitToUser(userId, 'notification:new', {
        id: newNotification.id,
        type: notification.type.toLowerCase(),
        title: notification.title,
        message: notification.content,
        data: {},
        isRead: false,
        timestamp: newNotification.createdAt.getTime()
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  /**
   * Send achievement notification
   */
  async sendAchievementNotification(userId: string, achievement: {
    id: string;
    name: string;
    description: string;
    experienceReward: number;
  }): Promise<void> {
    try {
      // Create notification in database
      await prisma.notification.create({
        data: {
          userId,
          title: 'Achievement Unlocked!',
          content: `You've earned the '${achievement.name}' achievement`,
          type: 'ACHIEVEMENT',
          isRead: false
        }
      });

      // Send to all user's connected sockets
      this.emitToUser(userId, 'notification:achievement_unlocked', {
        achievementId: achievement.id,
        name: achievement.name,
        description: achievement.description,
        iconUrl: null,
        experienceReward: achievement.experienceReward,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error sending achievement notification:', error);
    }
  }

  /**
   * Send level up notification
   */
  async sendLevelUpNotification(userId: string, oldLevel: number, newLevel: number): Promise<void> {
    try {
      // Create notification in database
      await prisma.notification.create({
        data: {
          userId,
          title: 'Level Up!',
          content: `You've reached level ${newLevel}`,
          type: 'SYSTEM',
          isRead: false
        }
      });

      // Send to all user's connected sockets
      this.emitToUser(userId, 'notification:level_up', {
        oldLevel,
        newLevel,
        skillPointsGained: 2,
        unlockedFeatures: [
          {
            type: 'mission_category',
            name: 'Advanced Cryptography',
            id: this.generateId()
          }
        ],
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error sending level up notification:', error);
    }
  }

  /**
   * Track user's socket connections
   */
  private addUserSocket(userId: string, socketId: string): void {
    // Add to userSockets map
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)?.add(socketId);

    // Add to socketUsers map
    this.socketUsers.set(socketId, userId);
  }

  /**
   * Remove socket from tracking when disconnected
   */
  private removeUserSocket(userId: string, socketId: string): void {
    // Remove from userSockets map
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }

    // Remove from socketUsers map
    this.socketUsers.delete(socketId);
  }

  /**
   * Emit an event to all sockets belonging to a user
   */
  emitToUser(userId: string, event: string, data: any): void {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      for (const socketId of sockets) {
        this.io.to(socketId).emit(event, data);
      }
    }
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}

// Export a function to create the service
export const createSocketService = (io: Server): SocketService => {
  return new SocketService(io);
};
import { v4 as uuidv4 } from 'uuid';
import { prisma } from './prisma.service';
import { AppError, ErrorCode } from '../types';

export class MissionService {
  /**
   * Get available missions for a user
   */
  async getAvailableMissions(
    userId: string,
    options: {
      categoryId?: string;
      difficulty?: number;
      page?: number;
      limit?: number;
    }
  ) {
    const { categoryId, difficulty, page = 1, limit = 10 } = options;
    
    // Get user profile to check level
    const userProfile = await prisma.profile.findUnique({
      where: { userId }
    });

    if (!userProfile) {
      throw new AppError(ErrorCode.NOT_FOUND, 'User profile not found', 404);
    }

    // For now, we'll simulate missions based on virtual machines
    // In a real implementation, you would have a proper missions table
    const virtualMachines = await prisma.virtualMachine.findMany({
      where: {
        // Exclude user's own VMs
        NOT: {
          ownerId: userId
        }
      },
      include: {
        owner: true,
        vulnerabilities: true
      },
      take: limit,
      skip: (page - 1) * limit
    });

    // Count total for pagination
    const total = await prisma.virtualMachine.count({
      where: {
        NOT: {
          ownerId: userId
        }
      }
    });

    // Transform VMs into missions
    const missions = virtualMachines.map(vm => {
      // Calculate difficulty based on VM specs and vulnerabilities
      const missionDifficulty = Math.min(
        10,
        Math.max(
          1,
          Math.floor((vm.firewallLevel + vm.antivirusLevel + vm.encryptionLevel) / 3) +
            (vm.vulnerabilities.length > 0 ? -1 : 1)
        )
      );

      // Skip if difficulty filter is applied and doesn't match
      if (difficulty && missionDifficulty !== difficulty) {
        return null;
      }

      // Create mission from VM
      return {
        id: vm.id,
        title: `Hack ${vm.name}`,
        description: `Infiltrate ${vm.owner.username}'s virtual machine and exploit its vulnerabilities.`,
        category: {
          id: 'network-security',
          name: 'Network Security'
        },
        difficulty: missionDifficulty,
        timeLimit: 30,
        experienceReward: 50 * missionDifficulty,
        currencyReward: 25 * missionDifficulty,
        reputationReward: 5 * missionDifficulty,
        isAvailable: userProfile.level >= missionDifficulty,
        isCompleted: false
      };
    }).filter(Boolean);

    return {
      missions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get mission details
   */
  async getMissionDetails(missionId: string, userId: string) {
    // In a real implementation, you would fetch from a missions table
    // Here we're simulating with virtual machines
    const vm = await prisma.virtualMachine.findUnique({
      where: { id: missionId },
      include: {
        owner: true,
        vulnerabilities: true
      }
    });

    if (!vm) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Mission not found', 404);
    }

    // Calculate difficulty
    const difficulty = Math.min(
      10,
      Math.max(
        1,
        Math.floor((vm.firewallLevel + vm.antivirusLevel + vm.encryptionLevel) / 3) +
          (vm.vulnerabilities.length > 0 ? -1 : 1)
      )
    );

    // Generate objectives based on VM properties
    const objectives = [
      {
        id: uuidv4(),
        description: `Scan ${vm.ipAddress} for open ports`,
        type: 'NETWORK_SCAN',
        order: 1,
        isOptional: false,
        hints: 'Use the scan command with appropriate parameters'
      },
      {
        id: uuidv4(),
        description: 'Identify vulnerabilities in the target system',
        type: 'FIND_VULNERABILITY',
        order: 2,
        isOptional: false,
        hints: 'Look for outdated software or misconfigured services'
      }
    ];

    // Add vulnerability-specific objectives
    vm.vulnerabilities.forEach((vuln, index) => {
      objectives.push({
        id: uuidv4(),
        description: `Exploit ${vuln.name}`,
        type: 'EXPLOIT_SYSTEM',
        order: 3 + index,
        isOptional: false,
        hints: vuln.description
      });
    });

    // Add final objective
    objectives.push({
      id: uuidv4(),
      description: 'Gain root access to the system',
      type: 'EXECUTE_COMMAND',
      order: 3 + vm.vulnerabilities.length,
      isOptional: false,
      hints: 'Use the access you\'ve gained to elevate privileges'
    });

    return {
      id: vm.id,
      title: `Hack ${vm.name}`,
      description: `Infiltrate ${vm.owner.username}'s virtual machine and exploit its vulnerabilities.`,
      category: {
        id: 'network-security',
        name: 'Network Security'
      },
      difficulty,
      timeLimit: 30,
      experienceReward: 50 * difficulty,
      currencyReward: 25 * difficulty,
      reputationReward: 5 * difficulty,
      objectives,
      prerequisites: []
    };
  }

  /**
   * Start a mission
   */
  async startMission(missionId: string, userId: string) {
    // Check if mission exists
    const vm = await prisma.virtualMachine.findUnique({
      where: { id: missionId }
    });

    if (!vm) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Mission not found', 404);
    }

    // Check if user is trying to hack their own VM
    if (vm.ownerId === userId) {
      throw new AppError(ErrorCode.FORBIDDEN, 'You cannot hack your own virtual machine', 403);
    }

    // Create an attack record to represent the mission attempt
    const attack = await prisma.attack.create({
      data: {
        attackerId: userId,
        defenderId: vm.ownerId,
        targetMachineId: vm.id,
        attackType: 'BRUTE_FORCE', // Default attack type
        startTime: new Date(),
        logs: JSON.stringify([])
      }
    });

    return {
      attemptId: attack.id,
      missionId,
      startedAt: attack.startTime,
      initialState: {
        terminalCommands: ['help', 'scan', 'exploit', 'connect', 'exit'],
        environment: {
          targetIp: vm.ipAddress,
          availableTools: [
            'nmap',
            'hydra',
            'metasploit',
            'wireshark'
          ]
        }
      }
    };
  }

  /**
   * Submit mission objective
   */
  async submitObjective(
    missionId: string,
    attemptId: string,
    objectiveId: string,
    data: { command: string; result: string },
    userId: string
  ) {
    // Check if attempt exists
    const attack = await prisma.attack.findUnique({
      where: { id: attemptId },
      include: {
        targetMachine: {
          include: {
            vulnerabilities: true
          }
        }
      }
    });

    if (!attack) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Mission attempt not found', 404);
    }

    if (attack.attackerId !== userId) {
      throw new AppError(ErrorCode.FORBIDDEN, 'You do not have permission to submit to this attempt', 403);
    }

    // Parse existing logs
    const logs = JSON.parse(attack.logs || '[]');
    
    // Add new log entry
    logs.push({
      timestamp: new Date(),
      command: data.command,
      result: data.result,
      objectiveId
    });

    // Update attack with new logs
    await prisma.attack.update({
      where: { id: attemptId },
      data: {
        logs: JSON.stringify(logs)
      }
    });

    // Simulate objective completion based on command
    const isCompleted = this.checkObjectiveCompletion(data.command, objectiveId, attack.targetMachine);

    // Generate next objective (if any)
    const nextObjective = this.getNextObjective(objectiveId, attack.targetMachine);

    return {
      isCompleted,
      feedback: isCompleted
        ? 'Great job! You\'ve completed this objective.'
        : 'Keep trying. You\'re on the right track.',
      nextObjective
    };
  }

  /**
   * Complete a mission
   */
  async completeMission(missionId: string, attemptId: string, userId: string) {
    // Check if attempt exists
    const attack = await prisma.attack.findUnique({
      where: { id: attemptId },
      include: {
        targetMachine: true
      }
    });

    if (!attack) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Mission attempt not found', 404);
    }

    if (attack.attackerId !== userId) {
      throw new AppError(ErrorCode.FORBIDDEN, 'You do not have permission to complete this attempt', 403);
    }

    // Calculate time spent
    const startTime = attack.startTime;
    const endTime = new Date();
    const timeSpent = Math.floor((endTime.getTime() - startTime.getTime()) / 1000); // in seconds

    // Calculate success and score
    const logs = JSON.parse(attack.logs || '[]');
    const isSuccessful = logs.length >= 3; // Simplified success criteria
    const score = isSuccessful ? Math.max(50, 100 - Math.floor(timeSpent / 60)) : 0;

    // Calculate rewards based on difficulty
    const difficulty = Math.min(
      10,
      Math.max(
        1,
        Math.floor(
          (attack.targetMachine.firewallLevel +
            attack.targetMachine.antivirusLevel +
            attack.targetMachine.encryptionLevel) /
            3
        )
      )
    );

    const experiencePoints = isSuccessful ? 50 * difficulty : 10;
    const currency = isSuccessful ? 25 * difficulty : 5;
    const reputation = isSuccessful ? 5 * difficulty : 0;

    // Update attack record
    await prisma.attack.update({
      where: { id: attemptId },
      data: {
        endTime,
        success: isSuccessful,
        damageDealt: isSuccessful ? 10 : 0,
        resourcesStolen: isSuccessful ? currency : 0
      }
    });

    // Update user profile with rewards
    const userProfile = await prisma.profile.findUnique({
      where: { userId }
    });

    if (userProfile) {
      await prisma.profile.update({
        where: { userId },
        data: {
          experience: userProfile.experience + experiencePoints,
          reputation: userProfile.reputation + reputation,
          cryptoBalance: userProfile.cryptoBalance + currency,
          // Level up if enough experience
          level: userProfile.experience + experiencePoints >= userProfile.level * 100 
            ? userProfile.level + 1 
            : userProfile.level
        }
      });
    }

    // Create achievement if successful
    if (isSuccessful) {
      await prisma.achievement.create({
        data: {
          userId,
          name: `Completed Mission: Hack ${attack.targetMachine.name}`,
          description: `Successfully hacked ${attack.targetMachine.name}`,
          rewardAmount: currency,
          unlockedAt: endTime
        }
      });
    }

    return {
      isSuccessful,
      timeSpent,
      score,
      rewards: {
        experiencePoints,
        currency,
        reputation,
        items: isSuccessful
          ? [
              {
                id: uuidv4(),
                name: 'Basic Firewall',
                type: 'SOFTWARE',
                rarity: 'COMMON'
              }
            ]
          : []
      },
      achievements: isSuccessful
        ? [
            {
              id: uuidv4(),
              name: 'Network Novice',
              description: 'Complete your first network security mission'
            }
          ]
        : []
    };
  }

  /**
   * Get mission history for a user
   */
  async getMissionHistory(
    userId: string,
    options: {
      status?: 'completed' | 'failed' | 'in-progress';
      page?: number;
      limit?: number;
    }
  ) {
    const { status, page = 1, limit = 10 } = options;

    // Query attacks as mission attempts
    const attacks = await prisma.attack.findMany({
      where: {
        attackerId: userId,
        ...(status === 'completed' && { success: true }),
        ...(status === 'failed' && { success: false }),
        ...(status === 'in-progress' && { endTime: null })
      },
      include: {
        targetMachine: true
      },
      orderBy: {
        startTime: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    });

    // Count total for pagination
    const total = await prisma.attack.count({
      where: {
        attackerId: userId,
        ...(status === 'completed' && { success: true }),
        ...(status === 'failed' && { success: false }),
        ...(status === 'in-progress' && { endTime: null })
      }
    });

    return {
      attempts: attacks.map(attack => ({
        id: attack.id,
        missionId: attack.targetMachineId,
        missionTitle: `Hack ${attack.targetMachine.name}`,
        startedAt: attack.startTime,
        completedAt: attack.endTime,
        isSuccessful: attack.success,
        score: attack.success ? 100 - Math.min(50, Math.floor((attack.endTime?.getTime() || 0 - attack.startTime.getTime()) / 60000)) : 0,
        timeSpent: attack.endTime
          ? Math.floor((attack.endTime.getTime() - attack.startTime.getTime()) / 1000)
          : null
      })),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Helper method to check if an objective is completed based on command
   */
  private checkObjectiveCompletion(command: string, objectiveId: string, targetMachine: any): boolean {
    // In a real implementation, this would be more sophisticated
    // For now, we'll use simple string matching
    
    const commandLower = command.toLowerCase();
    
    if (commandLower.includes('scan') && commandLower.includes(targetMachine.ipAddress)) {
      return true;
    }
    
    if (commandLower.includes('exploit') && targetMachine.vulnerabilities.some(v => 
      commandLower.includes(v.name.toLowerCase()))) {
      return true;
    }
    
    if (commandLower.includes('connect') && commandLower.includes(targetMachine.ipAddress)) {
      return true;
    }
    
    if (commandLower.includes('root') || commandLower.includes('sudo')) {
      return true;
    }
    
    // Default to 50% chance of success for demo purposes
    return Math.random() > 0.5;
  }

  /**
   * Helper method to get the next objective
   */
  private getNextObjective(currentObjectiveId: string, targetMachine: any): any {
    // In a real implementation, this would fetch from a database of objectives
    // For now, we'll return a simulated next objective
    
    return {
      id: uuidv4(),
      description: 'Attempt to access the web server',
      type: 'EXECUTE_COMMAND',
      order: 3,
      hints: 'Try connecting to port 80'
    };
  }
}

export default new MissionService();
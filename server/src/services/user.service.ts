import { prisma } from './prisma.service';
import { AppError, ErrorCode, UserProfile, UserProgressUpdate } from '../types';

export class UserService {
  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<UserProfile> {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            createdAt: true,
            isAdmin: true
          }
        }
      }
    });

    if (!profile) {
      throw new AppError(ErrorCode.NOT_FOUND, 'User profile not found', 404);
    }

    return profile;
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    data: {
      displayName?: string;
      bio?: string;
      avatarUrl?: string;
    }
  ): Promise<UserProfile> {
    // Check if profile exists
    const existingProfile = await prisma.profile.findUnique({
      where: { userId }
    });

    if (!existingProfile) {
      throw new AppError(ErrorCode.NOT_FOUND, 'User profile not found', 404);
    }

    // Update profile
    const updatedProfile = await prisma.profile.update({
      where: { userId },
      data,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            createdAt: true,
            isAdmin: true
          }
        }
      }
    });

    return updatedProfile;
  }

  /**
   * Get user progress
   */
  async getUserProgress(userId: string) {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: {
        level: true,
        experience: true,
        reputation: true,
        hackingSkill: true,
        defenseSkill: true,
        cryptoBalance: true,
        lastLogin: true
      }
    });

    if (!profile) {
      throw new AppError(ErrorCode.NOT_FOUND, 'User progress not found', 404);
    }

    // Get additional progress data
    const completedMissions = await prisma.achievement.count({
      where: {
        userId,
        name: {
          contains: 'Mission'
        }
      }
    });

    return {
      ...profile,
      completedMissions,
      // Map skills to the expected format from API spec
      programmingSkill: profile.hackingSkill,
      networkingSkill: Math.max(1, Math.floor(profile.hackingSkill * 0.8)),
      cryptographySkill: Math.max(1, Math.floor(profile.hackingSkill * 0.7)),
      securitySkill: profile.defenseSkill,
      // Calculate available skill points based on level
      skillPoints: Math.max(0, profile.level * 2 - (profile.hackingSkill + profile.defenseSkill))
    };
  }

  /**
   * Update user skills
   */
  async updateSkills(userId: string, skillUpdates: UserProgressUpdate): Promise<any> {
    // Get current profile
    const profile = await prisma.profile.findUnique({
      where: { userId }
    });

    if (!profile) {
      throw new AppError(ErrorCode.NOT_FOUND, 'User profile not found', 404);
    }

    // Calculate total skill points needed
    const requestedPoints = (skillUpdates.programmingSkill || 0) +
                           (skillUpdates.networkingSkill || 0) +
                           (skillUpdates.cryptographySkill || 0) +
                           (skillUpdates.securitySkill || 0);

    // Calculate available skill points
    const availablePoints = Math.max(0, profile.level * 2 - (profile.hackingSkill + profile.defenseSkill));

    if (requestedPoints > availablePoints) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        `Not enough skill points. Available: ${availablePoints}, Requested: ${requestedPoints}`,
        400
      );
    }

    // Update skills
    const updatedProfile = await prisma.profile.update({
      where: { userId },
      data: {
        hackingSkill: profile.hackingSkill + (skillUpdates.programmingSkill || 0),
        defenseSkill: profile.defenseSkill + (skillUpdates.securitySkill || 0)
      }
    });

    // Calculate remaining skill points
    const remainingPoints = Math.max(
      0,
      profile.level * 2 - (updatedProfile.hackingSkill + updatedProfile.defenseSkill)
    );

    return {
      skillPoints: remainingPoints,
      programmingSkill: updatedProfile.hackingSkill,
      networkingSkill: Math.max(1, Math.floor(updatedProfile.hackingSkill * 0.8)),
      cryptographySkill: Math.max(1, Math.floor(updatedProfile.hackingSkill * 0.7)),
      securitySkill: updatedProfile.defenseSkill
    };
  }

  /**
   * Get user wallet
   */
  async getUserWallet(userId: string) {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: {
        cryptoBalance: true
      }
    });

    if (!profile) {
      throw new AppError(ErrorCode.NOT_FOUND, 'User wallet not found', 404);
    }

    // Get recent transactions (simulated as achievements with rewards)
    const transactions = await prisma.achievement.findMany({
      where: {
        userId,
        rewardAmount: {
          gt: 0
        }
      },
      orderBy: {
        unlockedAt: 'desc'
      },
      take: 10,
      select: {
        id: true,
        name: true,
        description: true,
        rewardAmount: true,
        unlockedAt: true
      }
    });

    return {
      balance: profile.cryptoBalance,
      transactions: transactions.map(t => ({
        id: t.id,
        amount: t.rewardAmount,
        type: 'MISSION_REWARD',
        description: `Reward for ${t.name}`,
        createdAt: t.unlockedAt
      }))
    };
  }

  /**
   * Get user inventory
   */
  async getUserInventory(userId: string, type?: string) {
    // For now, we'll simulate inventory with virtual machines and software
    const virtualMachines = await prisma.virtualMachine.findMany({
      where: { ownerId: userId },
      include: {
        softwareInstalled: true
      }
    });

    // Transform virtual machines and software into inventory items
    const items = [];

    for (const vm of virtualMachines) {
      // Add VM as hardware item
      items.push({
        id: vm.id,
        itemId: vm.id,
        name: vm.name,
        description: `Virtual machine with ${vm.processingPower} CPU, ${vm.memorySize} RAM, ${vm.storageSize} Storage`,
        type: 'HARDWARE',
        rarity: 'UNCOMMON',
        effectValue: vm.processingPower + vm.memorySize,
        effectType: 'PROCESSING_POWER',
        isConsumable: false,
        isEquipped: vm.isOnline,
        currentDurability: 100,
        acquiredAt: vm.createdAt
      });

      // Add software items
      for (const software of vm.softwareInstalled) {
        if (type && software.type !== type) continue;

        items.push({
          id: software.id,
          itemId: software.id,
          name: `${software.name} v${software.version}`,
          description: `${software.type} software for your virtual machine`,
          type: 'SOFTWARE',
          rarity: software.effectiveness > 5 ? 'RARE' : 'COMMON',
          effectValue: software.effectiveness,
          effectType: software.type === 'FIREWALL' ? 'DEFENSE_BOOST' : 'ATTACK_BOOST',
          isConsumable: false,
          isEquipped: true,
          currentDurability: 100,
          acquiredAt: software.installDate
        });
      }
    }

    return {
      items,
      pagination: {
        total: items.length,
        page: 1,
        limit: 100,
        pages: 1
      }
    };
  }

  /**
   * Get user achievements
   */
  async getUserAchievements(userId: string, status?: 'completed' | 'in-progress') {
    const achievements = await prisma.achievement.findMany({
      where: {
        userId
      },
      orderBy: {
        unlockedAt: 'desc'
      }
    });

    return {
      achievements: achievements.map(a => ({
        id: a.id,
        name: a.name,
        description: a.description,
        type: 'SPECIAL_EVENT',
        iconUrl: null,
        progress: 1,
        requirement: 1,
        isCompleted: true,
        completedAt: a.unlockedAt
      })),
      pagination: {
        total: achievements.length,
        page: 1,
        limit: 100,
        pages: 1
      }
    };
  }
}

export default new UserService();
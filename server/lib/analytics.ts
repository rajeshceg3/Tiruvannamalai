import { Visit, Shrine, Achievement } from "@shared/schema";
import { storage } from "../storage";

export interface JourneyStats {
  totalVisits: number;
  physicalVisits: number;
  virtualVisits: number;
  totalDistance: number; // in meters (estimated)
  completionPercentage: number;
  firstVisitDate: Date | null;
  lastVisitDate: Date | null;
  achievements: Achievement[];
}

export const BADGE_DEFINITIONS = [
  {
    id: "pilgrim_initiate",
    name: "Pilgrim Initiate",
    description: "Completed the first check-in.",
    icon: "🌱"
  },
  {
    id: "true_seeker",
    name: "True Seeker",
    description: "Verified presence at 3 physical locations.",
    icon: "📍"
  },
  {
    id: "master_walker",
    name: "Master Walker",
    description: "Completed the entire pilgrimage (8 shrines).",
    icon: "👑"
  },
  {
    id: "speed_demon",
    name: "Wind Walker",
    description: "Visited 3 shrines in under 3 hours.",
    icon: "⚡"
  }
];

export async function calculateJourneyStats(userId: number): Promise<JourneyStats> {
  const visits = await storage.getVisits(userId);
  const shrines = await storage.getShrines();
  const achievements = await storage.getAchievements(userId);

  const physicalVisits = visits.filter(v => !v.isVirtual).length;
  const virtualVisits = visits.filter(v => v.isVirtual).length;
  const uniqueShrines = new Set(visits.map(v => v.shrineId)).size;

  let firstVisitDate = null;
  let lastVisitDate = null;

  if (visits.length > 0) {
    const dates = visits.map(v => new Date(v.visitedAt).getTime());
    firstVisitDate = new Date(Math.min(...dates));
    lastVisitDate = new Date(Math.max(...dates));
  }

  return {
    totalVisits: visits.length,
    physicalVisits,
    virtualVisits,
    totalDistance: 0, // TODO: Implement distance calc from verified locations
    completionPercentage: Math.round((uniqueShrines / shrines.length) * 100),
    firstVisitDate,
    lastVisitDate,
    achievements
  };
}

export async function checkAchievements(userId: number) {
  const stats = await calculateJourneyStats(userId);
  const currentBadges = new Set(stats.achievements.map(a => a.badgeId));
  const newBadges: string[] = [];

  // Check: Pilgrim Initiate
  if (stats.totalVisits >= 1 && !currentBadges.has("pilgrim_initiate")) {
    await storage.createAchievement(userId, "pilgrim_initiate");
    newBadges.push("pilgrim_initiate");
  }

  // Check: True Seeker
  if (stats.physicalVisits >= 3 && !currentBadges.has("true_seeker")) {
    await storage.createAchievement(userId, "true_seeker");
    newBadges.push("true_seeker");
  }

  // Check: Master Walker
  if (stats.completionPercentage >= 100 && !currentBadges.has("master_walker")) {
    await storage.createAchievement(userId, "master_walker");
    newBadges.push("master_walker");
  }

  return newBadges;
}

import {
  type Shrine,
  shrineData,
  type User,
  type InsertUser,
  type Visit,
  type Journey,
  users,
  visits,
  journeys,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // Shrine Data (Static)
  getShrines(): Promise<Shrine[]>;
  getShrine(id: string): Promise<Shrine | undefined>;

  // User Data
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Visits
  createVisit(userId: number, shrineId: string, notes?: string, isVirtual?: boolean, verifiedLocation?: any): Promise<Visit>;
  getVisits(userId: number): Promise<Visit[]>;
  updateVisitNote(visitId: number, notes: string): Promise<Visit | undefined>;

  // Journey
  getJourney(userId: number): Promise<Journey | undefined>;
  createOrUpdateJourney(userId: number, currentShrineOrder: number): Promise<Journey>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private visits: Map<number, Visit>;
  private journeys: Map<number, Journey>;
  private currentUserId: number;
  private currentVisitId: number;
  private currentJourneyId: number;

  constructor() {
    this.users = new Map();
    this.visits = new Map();
    this.journeys = new Map();
    this.currentUserId = 1;
    this.currentVisitId = 1;
    this.currentJourneyId = 1;
  }

  // Static Shrine Data
  async getShrines(): Promise<Shrine[]> {
    return shrineData.sort((a, b) => a.order - b.order);
  }

  async getShrine(id: string): Promise<Shrine | undefined> {
    return shrineData.find(s => s.id === id);
  }

  // User Data
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id, createdAt: new Date() };
    this.users.set(id, user);
    return user;
  }

  // Visits
  async createVisit(userId: number, shrineId: string, notes?: string, isVirtual: boolean = true, verifiedLocation?: any): Promise<Visit> {
    const existingVisit = Array.from(this.visits.values()).find(
      (v) => v.userId === userId && v.shrineId === shrineId,
    );

    if (existingVisit) {
      // If re-visiting and the new visit is physical, update it?
      // For now, let's just return existing.
      return existingVisit;
    }

    const id = this.currentVisitId++;
    const visit: Visit = {
      id,
      userId,
      shrineId,
      notes: notes || null,
      isVirtual,
      verifiedLocation: verifiedLocation || null,
      visitedAt: new Date(),
    };
    this.visits.set(id, visit);
    return visit;
  }

  async getVisits(userId: number): Promise<Visit[]> {
    return Array.from(this.visits.values())
      .filter((visit) => visit.userId === userId)
      .sort((a, b) => b.visitedAt.getTime() - a.visitedAt.getTime());
  }

  async updateVisitNote(visitId: number, notes: string): Promise<Visit | undefined> {
    const visit = this.visits.get(visitId);
    if (!visit) return undefined;

    const updatedVisit = { ...visit, notes };
    this.visits.set(visitId, updatedVisit);
    return updatedVisit;
  }

  // Journey
  async getJourney(userId: number): Promise<Journey | undefined> {
    return Array.from(this.journeys.values()).find(
      (journey) => journey.userId === userId,
    );
  }

  async createOrUpdateJourney(userId: number, currentShrineOrder: number): Promise<Journey> {
    const existing = await this.getJourney(userId);

    if (existing) {
      // Only update if the new order is greater than the current one (prevent regression)
      if (currentShrineOrder > existing.currentShrineOrder) {
        const updated = { ...existing, currentShrineOrder };
        this.journeys.set(existing.id, updated);
        return updated;
      }
      return existing;
    } else {
      const id = this.currentJourneyId++;
      const journey: Journey = {
        id,
        userId,
        currentShrineOrder,
        status: "active",
        startedAt: new Date(),
        completedAt: null,
      };
      this.journeys.set(id, journey);
      return journey;
    }
  }
}

export class DatabaseStorage implements IStorage {
  async getShrines(): Promise<Shrine[]> {
    return shrineData.sort((a, b) => a.order - b.order);
  }

  async getShrine(id: string): Promise<Shrine | undefined> {
    return shrineData.find(s => s.id === id);
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createVisit(userId: number, shrineId: string, notes?: string, isVirtual: boolean = true, verifiedLocation?: any): Promise<Visit> {
    // Check if exists first to avoid duplicates (though UI should handle this)
    const [existing] = await db.select().from(visits).where(
        and(eq(visits.userId, userId), eq(visits.shrineId, shrineId))
    );

    if (existing) {
        return existing;
    }

    const [visit] = await db.insert(visits).values({
      userId,
      shrineId,
      notes,
      isVirtual,
      verifiedLocation
    }).returning();
    return visit;
  }

  async getVisits(userId: number): Promise<Visit[]> {
    return db
      .select()
      .from(visits)
      .where(eq(visits.userId, userId))
      .orderBy(desc(visits.visitedAt));
  }

  async updateVisitNote(visitId: number, notes: string): Promise<Visit | undefined> {
    const [visit] = await db
      .update(visits)
      .set({ notes })
      .where(eq(visits.id, visitId))
      .returning();
    return visit;
  }

  async getJourney(userId: number): Promise<Journey | undefined> {
    const [journey] = await db.select().from(journeys).where(eq(journeys.userId, userId));
    return journey;
  }

  async createOrUpdateJourney(userId: number, currentShrineOrder: number): Promise<Journey> {
    const [existing] = await db.select().from(journeys).where(eq(journeys.userId, userId));

    if (existing) {
      // Only update if the new order is greater than the current one
      if (currentShrineOrder > existing.currentShrineOrder) {
        const [updated] = await db.update(journeys)
          .set({ currentShrineOrder })
          .where(eq(journeys.id, existing.id))
          .returning();
        return updated;
      }
      return existing;
    } else {
      const [created] = await db.insert(journeys)
        .values({ userId, currentShrineOrder, status: "active" })
        .returning();
      return created;
    }
  }
}

// Factory to select the correct storage implementation
function createStorage(): IStorage {
  if (process.env.DATABASE_URL) {
    return new DatabaseStorage();
  }
  return new MemStorage();
}

export const storage = createStorage();

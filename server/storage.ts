import {
  type Shrine,
  shrineData,
  type User,
  type InsertUser,
  type Visit,
  type Journey,
  type Group,
  type GroupMember,
  users,
  visits,
  journeys,
  groups,
  groupMembers,
  type SitRep,
  sitreps,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gt } from "drizzle-orm";
import { nanoid } from "nanoid";

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

  // Groups
  createGroup(name: string, creatorId: number): Promise<Group>;
  getGroup(id: number): Promise<Group | undefined>;
  getGroupByCode(code: string): Promise<Group | undefined>;
  addGroupMember(groupId: number, userId: number): Promise<GroupMember>;
  getGroupMembers(groupId: number): Promise<(GroupMember & { user: User })[]>;
  getUserGroup(userId: number): Promise<Group | undefined>;
  updateGroupObjective(groupId: number, shrineId: string | null): Promise<Group | undefined>;
  updateGroupMemberStatus(groupId: number, userId: number, status?: string, location?: any): Promise<void>;

  // SitReps
  createSitRep(groupId: number, userId: number, content: string, type: string): Promise<SitRep>;
  getSitReps(groupId: number): Promise<(SitRep & { user: User })[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private visits: Map<number, Visit>;
  private journeys: Map<number, Journey>;
  private groups: Map<number, Group>;
  private groupMembers: Map<number, GroupMember>;
  private sitreps: Map<number, SitRep>;
  private currentUserId: number;
  private currentVisitId: number;
  private currentJourneyId: number;
  private currentGroupId: number;
  private currentGroupMemberId: number;
  private currentSitRepId: number;

  constructor() {
    this.users = new Map();
    this.visits = new Map();
    this.journeys = new Map();
    this.groups = new Map();
    this.groupMembers = new Map();
    this.sitreps = new Map();
    this.currentUserId = 1;
    this.currentVisitId = 1;
    this.currentJourneyId = 1;
    this.currentGroupId = 1;
    this.currentGroupMemberId = 1;
    this.currentSitRepId = 1;
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
    // Check if recently visited (e.g., within last 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const existingRecentVisit = Array.from(this.visits.values()).find(
      (v) => v.userId === userId && v.shrineId === shrineId && v.visitedAt > tenMinutesAgo,
    );

    if (existingRecentVisit) {
      return existingRecentVisit;
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
      // Allow re-visiting or updating progress. If new order is greater, update.
      // If same or less, we generally don't revert progress, but if it's a new "round", we might?
      // For now, keep "monotonic" logic but ensure we don't break if someone visits an old shrine.
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

  // Groups
  async createGroup(name: string, creatorId: number): Promise<Group> {
    const id = this.currentGroupId++;
    const code = nanoid(6).toUpperCase();
    const group: Group = {
      id,
      name,
      code,
      creatorId,
      createdAt: new Date(),
      activeObjective: null,
    };
    this.groups.set(id, group);
    await this.addGroupMember(id, creatorId); // Creator joins automatically
    return group;
  }

  async getGroup(id: number): Promise<Group | undefined> {
    return this.groups.get(id);
  }

  async getGroupByCode(code: string): Promise<Group | undefined> {
    return Array.from(this.groups.values()).find((g) => g.code === code);
  }

  async addGroupMember(groupId: number, userId: number): Promise<GroupMember> {
    const id = this.currentGroupMemberId++;
    const member: GroupMember = {
      id,
      groupId,
      userId,
      joinedAt: new Date(),
      lastStatus: "ok",
      lastLocation: null,
    };
    this.groupMembers.set(id, member);
    return member;
  }

  async getGroupMembers(groupId: number): Promise<(GroupMember & { user: User })[]> {
    const members = Array.from(this.groupMembers.values()).filter(
      (m) => m.groupId === groupId
    );
    const result: (GroupMember & { user: User })[] = [];
    for (const m of members) {
      const user = await this.getUser(m.userId);
      if (user) {
        result.push({ ...m, user });
      }
    }
    return result;
  }

  async getUserGroup(userId: number): Promise<Group | undefined> {
    const member = Array.from(this.groupMembers.values())
      .reverse() // Get latest
      .find((m) => m.userId === userId);
    if (!member) return undefined;
    return this.getGroup(member.groupId);
  }

  async updateGroupObjective(groupId: number, shrineId: string | null): Promise<Group | undefined> {
    const group = this.groups.get(groupId);
    if (!group) return undefined;
    const updated = { ...group, activeObjective: shrineId };
    this.groups.set(groupId, updated);
    return updated;
  }

  async updateGroupMemberStatus(groupId: number, userId: number, status?: string, location?: any): Promise<void> {
    const members = Array.from(this.groupMembers.values()).filter(m => m.groupId === groupId && m.userId === userId);
    // There should be only one current membership usually, but filter just in case.
    for (const member of members) {
        let updated = { ...member };
        if (status !== undefined) {
            updated.lastStatus = status;
        }
        if (location !== undefined) {
             updated.lastLocation = location;
        }
        this.groupMembers.set(member.id, updated);
    }
  }

  async createSitRep(groupId: number, userId: number, content: string, type: string): Promise<SitRep> {
    const id = this.currentSitRepId++;
    const sitrep: SitRep = {
        id,
        groupId,
        userId,
        content,
        type,
        createdAt: new Date()
    };
    this.sitreps.set(id, sitrep);
    return sitrep;
  }

  async getSitReps(groupId: number): Promise<(SitRep & { user: User })[]> {
     const sitreps = Array.from(this.sitreps.values())
        .filter(s => s.groupId === groupId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const result: (SitRep & { user: User })[] = [];
    for (const s of sitreps) {
        const user = await this.getUser(s.userId);
        if (user) {
            result.push({ ...s, user });
        }
    }
    return result;
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
    // Check if recently visited (e.g., within last 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const [existingRecent] = await db.select().from(visits).where(
        and(
            eq(visits.userId, userId),
            eq(visits.shrineId, shrineId),
            gt(visits.visitedAt, tenMinutesAgo)
        )
    );

    if (existingRecent) {
        return existingRecent;
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

  // Groups
  async createGroup(name: string, creatorId: number): Promise<Group> {
    const code = nanoid(6).toUpperCase();
    const [group] = await db.insert(groups).values({
      name,
      code,
      creatorId,
      activeObjective: null,
    }).returning();
    await this.addGroupMember(group.id, creatorId);
    return group;
  }

  async getGroup(id: number): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    return group;
  }

  async getGroupByCode(code: string): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.code, code));
    return group;
  }

  async addGroupMember(groupId: number, userId: number): Promise<GroupMember> {
    const [member] = await db.insert(groupMembers).values({
      groupId,
      userId,
      lastStatus: "ok",
      lastLocation: null,
    }).returning();
    return member;
  }

  async getGroupMembers(groupId: number): Promise<(GroupMember & { user: User })[]> {
    const members = await db.select().from(groupMembers).where(eq(groupMembers.groupId, groupId));
    const result: (GroupMember & { user: User })[] = [];
    for (const m of members) {
      const user = await this.getUser(m.userId);
      if (user) {
        result.push({ ...m, user });
      }
    }
    return result;
  }

  async getUserGroup(userId: number): Promise<Group | undefined> {
    // Basic implementation: just find the most recent group they joined
    const [member] = await db
      .select()
      .from(groupMembers)
      .where(eq(groupMembers.userId, userId))
      .orderBy(desc(groupMembers.joinedAt))
      .limit(1);

    if (!member) return undefined;
    return this.getGroup(member.groupId);
  }

  async updateGroupObjective(groupId: number, shrineId: string | null): Promise<Group | undefined> {
    const [group] = await db
        .update(groups)
        .set({ activeObjective: shrineId })
        .where(eq(groups.id, groupId))
        .returning();
    return group;
  }

  async updateGroupMemberStatus(groupId: number, userId: number, status?: string, location?: any): Promise<void> {
    const updateData: any = {};
    if (status !== undefined) {
        updateData.lastStatus = status;
    }
    if (location !== undefined) {
        updateData.lastLocation = location;
    }

    if (Object.keys(updateData).length === 0) return;

    await db.update(groupMembers)
        .set(updateData)
        .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
  }

  async createSitRep(groupId: number, userId: number, content: string, type: string): Promise<SitRep> {
    const [sitrep] = await db.insert(sitreps).values({
        groupId,
        userId,
        content,
        type
    }).returning();
    return sitrep;
  }

  async getSitReps(groupId: number): Promise<(SitRep & { user: User })[]> {
    const rows = await db
        .select({
            sitrep: sitreps,
            user: users
        })
        .from(sitreps)
        .innerJoin(users, eq(sitreps.userId, users.id))
        .where(eq(sitreps.groupId, groupId))
        .orderBy(desc(sitreps.createdAt));

    return rows.map(row => ({
        ...row.sitrep,
        user: row.user
    }));
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

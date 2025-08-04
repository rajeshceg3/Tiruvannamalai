import { type Shrine, shrineData } from "@shared/schema";

export interface IStorage {
  getShrines(): Promise<Shrine[]>;
  getShrine(id: string): Promise<Shrine | undefined>;
}

export class MemStorage implements IStorage {
  private shrines: Map<string, Shrine>;

  constructor() {
    this.shrines = new Map();
    // Initialize with shrine data
    shrineData.forEach(shrine => {
      this.shrines.set(shrine.id, shrine);
    });
  }

  async getShrines(): Promise<Shrine[]> {
    return Array.from(this.shrines.values()).sort((a, b) => a.order - b.order);
  }

  async getShrine(id: string): Promise<Shrine | undefined> {
    return this.shrines.get(id);
  }
}

export const storage = new MemStorage();

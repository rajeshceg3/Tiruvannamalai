import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

export async function createGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const { name } = req.body;
    const group = await storage.createGroup(name, req.user!.id);
    res.status(201).json(group);
  } catch (error) {
    next(error);
  }
}

export async function joinGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = req.body;
    const group = await storage.getGroupByCode(code);

    if (!group) {
      return res.status(404).json({ message: "Invalid group code" });
    }

    // Check if already a member
    const existingGroup = await storage.getUserGroup(req.user!.id);
    if (existingGroup && existingGroup.id === group.id) {
      return res.json({ message: "Already a member", group });
    }

    // For MVP, user can only be in one group at a time or we just track the latest join.
    // Logic in storage.getUserGroup returns the latest.
    await storage.addGroupMember(group.id, req.user!.id);

    res.json(group);
  } catch (error) {
    next(error);
  }
}

export async function getCurrentGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const group = await storage.getUserGroup(req.user!.id);
    if (!group) {
      // Not in a group is a valid state, return null or empty
      return res.json(null);
    }

    const members = await storage.getGroupMembers(group.id);
    res.json({ ...group, members });
  } catch (error) {
    next(error);
  }
}

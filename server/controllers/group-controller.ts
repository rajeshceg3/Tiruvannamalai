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

export async function getSitReps(req: Request, res: Response, next: NextFunction) {
  try {
    const groupId = parseInt(req.params.groupId);
    // Security check: Ensure user is a member of the group
    const userGroup = await storage.getUserGroup(req.user!.id);
    if (!userGroup || userGroup.id !== groupId) {
        return res.status(403).json({ message: "Not authorized to view this group's SitReps" });
    }

    const sitreps = await storage.getSitReps(groupId);
    res.json(sitreps);
  } catch (error) {
    next(error);
  }
}

export async function createSitRep(req: Request, res: Response, next: NextFunction) {
  try {
    const groupId = parseInt(req.params.groupId);
    const { content, type } = req.body;

    // Security check
    const userGroup = await storage.getUserGroup(req.user!.id);
    if (!userGroup || userGroup.id !== groupId) {
        return res.status(403).json({ message: "Not authorized" });
    }

    const sitrep = await storage.createSitRep(groupId, req.user!.id, content, type);
    res.status(201).json(sitrep);
  } catch (error) {
    next(error);
  }
}

export async function updateGroupObjective(req: Request, res: Response, next: NextFunction) {
  try {
    const groupId = parseInt(req.params.groupId);
    const { shrineId } = req.body;

    // Security check
    const userGroup = await storage.getUserGroup(req.user!.id);
    if (!userGroup || userGroup.id !== groupId) {
        return res.status(403).json({ message: "Not authorized" });
    }

    // Only creator can set objective? Or anyone? For now, allow any member.
    // Ideally only leader (creator).
    if (userGroup.creatorId !== req.user!.id) {
        return res.status(403).json({ message: "Only the Squad Leader can set the tactical objective" });
    }

    const group = await storage.updateGroupObjective(groupId, shrineId);
    res.json(group);
  } catch (error) {
    next(error);
  }
}

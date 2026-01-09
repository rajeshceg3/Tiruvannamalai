import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

export async function getShrines(req: Request, res: Response, next: NextFunction) {
  try {
    const shrines = await storage.getShrines();
    res.json(shrines);
  } catch (error) {
    next(error);
  }
}

export async function getShrine(req: Request, res: Response, next: NextFunction) {
  try {
    const shrine = await storage.getShrine(req.params.id);
    if (!shrine) {
      return res.status(404).json({ message: "Shrine not found" });
    }
    res.json(shrine);
  } catch (error) {
    next(error);
  }
}

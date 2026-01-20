import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { calculateDistance } from "../lib/geo";
import { LOCATION_VERIFICATION_THRESHOLD } from "@shared/schema";

const VERIFICATION_THRESHOLD_METERS = LOCATION_VERIFICATION_THRESHOLD;
const MAX_ACCURACY_THRESHOLD_METERS = 100;

export async function getVisits(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const visits = await storage.getVisits(req.user!.id, limit, offset);
    res.json(visits);
  } catch (error) {
    next(error);
  }
}

export async function createVisit(req: Request, res: Response, next: NextFunction) {
  try {
    const { shrineId, notes, latitude, longitude, accuracy } = req.body;

    // Verify shrine exists
    const shrine = await storage.getShrine(shrineId);
    if (!shrine) {
      return res.status(404).json({ message: "Invalid shrine" });
    }

    let isVirtual = true;
    let verifiedLocation = null;

    // Verification Logic
    if (latitude !== undefined && longitude !== undefined) {
      const distance = calculateDistance(latitude, longitude, shrine.latitude, shrine.longitude);

      // Strict accuracy check: accuracy must be provided and within threshold
      const isAccurateEnough = accuracy !== undefined && accuracy <= MAX_ACCURACY_THRESHOLD_METERS;
      const isInRange = distance <= VERIFICATION_THRESHOLD_METERS;

      if (isAccurateEnough && isInRange) {
        isVirtual = false;
        verifiedLocation = {
          latitude,
          longitude,
          accuracy,
          distance,
          timestamp: new Date().toISOString()
        };
      }
    }

    const visit = await storage.createVisit(req.user!.id, shrineId, notes, isVirtual, verifiedLocation);

    // Update journey progress
    await storage.createOrUpdateJourney(req.user!.id, shrine.order);

    res.status(201).json(visit);
  } catch (error) {
    next(error);
  }
}

export async function updateVisitNote(req: Request, res: Response, next: NextFunction) {
  try {
    const visitId = parseInt(req.params.id);
    const { notes } = req.body;

    const visit = await storage.updateVisitNote(visitId, notes);
    if (!visit) {
      return res.status(404).json({ message: "Visit not found" });
    }
    res.json(visit);
  } catch (error) {
    next(error);
  }
}

export async function getJourney(req: Request, res: Response, next: NextFunction) {
  try {
    const journey = await storage.getJourney(req.user!.id);
    res.json(journey || { status: "not_started", currentShrineOrder: 0 });
  } catch (error) {
    next(error);
  }
}

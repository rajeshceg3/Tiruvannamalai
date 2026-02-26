import { pgTable, text, serial, integer, boolean, timestamp, jsonb, index, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --- Static Data Definitions (kept for reference and type safety) ---

export const shrineSchema = z.object({
  id: z.string(),
  name: z.string(),
  element: z.string(),
  direction: z.string(),
  description: z.string(),
  significance: z.string(),
  mantra: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  color: z.string(),
  emoji: z.string(),
  order: z.number(),
  imageUrl: z.string(),
});

export type Shrine = z.infer<typeof shrineSchema>;

export const LOCATION_VERIFICATION_THRESHOLD = 200; // meters

export const verifiedLocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  accuracy: z.number().optional(),
  timestamp: z.number().optional()
});

export type VerifiedLocation = z.infer<typeof verifiedLocationSchema>;

export const shrineData: Shrine[] = [
  {
    id: "indra-lingam",
    name: "Indra Lingam",
    element: "Ether & Sun",
    direction: "East",
    description: "The journey awakens with the dawn at Indra Lingam. Here, the first rays of the sun pierce the morning mist, illuminating the path ahead. Surrounded by ancient trees and the distant hum of chanting, this shrine invites you to shed the heaviness of sleep and embrace the clarity of a new beginning. It is the seat of Indra, the King of Heavens, marking the auspicious start of the Girivalam. The air here feels crisp, charged with the promise of initiation.",
    significance: "Invoke the strength to begin. As the sun rises, so too does your inner awareness. Let this first step be a promise to yourself to walk with presence and purpose. Shed your old skin like the morning sheds the night.",
    mantra: "Om Indraya Namah",
    latitude: 12.2353,
    longitude: 79.0847,
    color: "#FFA500",
    emoji: "🌞",
    order: 1,
    imageUrl: "https://images.unsplash.com/photo-1545558014-8692077e9b5c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
  },
  {
    id: "agni-lingam",
    name: "Agni Lingam",
    element: "Fire",
    direction: "Southeast",
    description: "Feel the heat of transformation at Agni Lingam. Located in the direction of fire, this shrine pulses with an intensity that mirrors the burning of karmic impurities. The atmosphere here is electric, often filled with the pungent smoke of camphor and the fervent prayers of devotees. It is a crucible where the old self is offered to the flames, making way for purification and renewal.",
    significance: "Fire does not destroy; it transforms. Offer your doubts, fears, and burdens to the sacred flame here. Allow the heat of devotion to forge a stronger, purer spirit within you. Let the fire of knowledge burn away the ignorance of limitation.",
    mantra: "Om Agnaye Namah",
    latitude: 12.2253,
    longitude: 79.0897,
    color: "#FF4500",
    emoji: "🔥",
    order: 2,
    imageUrl: "https://images.unsplash.com/photo-1548013146-72479768bada?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
  },
  {
    id: "yama-lingam",
    name: "Yama Lingam",
    element: "Earth (Justice)",
    direction: "South",
    description: "Stand before the guardian of the South, Yama Lingam. Often misunderstood as fearful, Yama represents the inevitable law of dharma and the impartial cycle of time. The energy here is solemn and grounding, urging pilgrims to reflect on the impermanence of physical life. The stillness here is profound, a reminder that every breath is borrowed.",
    significance: "Contemplate your mortality not with fear, but as a teacher. Realize that every moment is precious. Let go of petty grievances and align your actions with your highest truth. In the face of time, only love and truth endure.",
    mantra: "Om Yamaya Namah",
    latitude: 12.2153,
    longitude: 79.0847,
    color: "#8B0000",
    emoji: "⚖️",
    order: 3,
    imageUrl: "https://images.unsplash.com/photo-1606216794074-735e91aaad6e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
  },
  {
    id: "niruthi-lingam",
    name: "Niruthi Lingam",
    element: "Earth (Protection)",
    direction: "Southwest",
    description: "Enter the quiet, protective embrace of Niruthi Lingam. Tucked away in the shadows of the path, this shrine is ruled by the guardian of the Southwest, shielding pilgrims from negative influences and unseen obstacles. The atmosphere is dense and comforting, often inviting a slower pace. It is a place to ground yourself deeply, connecting with the unshakeable stability of the earth beneath your feet.",
    significance: "Seek stability in chaos. When the mind wavers, return to the breath and the body. Here, ask for protection not just from external harm, but from your own inner negativity. Find the fortress within.",
    mantra: "Om Niruthaye Namah",
    latitude: 12.2153,
    longitude: 79.0747,
    color: "#654321",
    emoji: "🪨",
    order: 4,
    imageUrl: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
  },
  {
    id: "varuna-lingam",
    name: "Varuna Lingam",
    element: "Water",
    direction: "West",
    description: "Flow into the serenity of Varuna Lingam. Dedicated to the Lord of Waters, this shrine offers a cooling respite on the long journey. Like a river that carves through rock with persistence and grace, this space invites emotional cleansing and deep healing. The energy here is fluid, washing away the rigidity of the ego and soothing the weary traveler's soul.",
    significance: "Be like water—soft yet yielding, humble yet powerful. Allow your emotions to flow without judgment. Wash away the dust of the road and the dust of the mind. In fluidity, find your strength.",
    mantra: "Om Varunaya Namah",
    latitude: 12.2153,
    longitude: 79.0647,
    color: "#0066CC",
    emoji: "🌧️",
    order: 5,
    imageUrl: "https://images.unsplash.com/photo-1570366583862-f91883984fde?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
  },
  {
    id: "vayu-lingam",
    name: "Vayu Lingam",
    element: "Air",
    direction: "Northwest",
    description: "Breathe in the vastness at Vayu Lingam. Here, the air element reigns supreme. Breezy and open, this shrine represents the life force (Prana) that sustains all beings. It is a place of movement and lightness, where the wind carries the prayers of thousands towards the peak of Arunachala. The sensation here is one of unburdening and expansion, lifting the spirit towards the sky.",
    significance: "Connect with your breath, the bridge between body and spirit. Inhale the sacred energy of the mountain; exhale all that no longer serves you. Feel the freedom of the wind. You are not the heavy body, you are the soaring spirit.",
    mantra: "Om Vayuve Namah",
    latitude: 12.2253,
    longitude: 79.0647,
    color: "#4682B4",
    emoji: "🌬️",
    order: 6,
    imageUrl: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
  },
  {
    id: "kubera-lingam",
    name: "Kubera Lingam",
    element: "Earth (Wealth)",
    direction: "North",
    description: "Discover the richness of spirit at Kubera Lingam. Associated with the Lord of Wealth, this shrine is not just about material prosperity, but spiritual abundance. Nestled in a lush part of the path, it reminds pilgrims that true wealth lies in contentment and inner peace. Devotees often pause here to offer gratitude for the sustenance of life and the richness of the journey.",
    significance: "True abundance is a heart full of gratitude. Reflect on the gifts you have been given—this body, this breath, this moment. Prosperity flows to those who appreciate what is. You are already whole.",
    mantra: "Om Kuberaya Namah",
    latitude: 12.2353,
    longitude: 79.0647,
    color: "#228B22",
    emoji: "🌱",
    order: 7,
    imageUrl: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
  },
  {
    id: "eesanya-lingam",
    name: "Eesanya Lingam",
    element: "Ether (Space)",
    direction: "Northeast",
    description: "Arrive at the gateway to the infinite at Eesanya Lingam. Facing the Northeast, the direction of Ishvara, this final shrine represents the dissolution of the individual into the cosmic whole. The journey comes full circle here. The energy is subtle, silent, and transcendent, inviting you to let go of the seeker and simply be the seeking. Here, the noise of the world fades into the primordial silence.",
    significance: "The path ends where it began, but you are not the same. In the silence of Eesanya, surrender your final identity. You are the space in which the universe dances. The drop returns to the ocean. Om Namah Shivaya.",
    mantra: "Om Namah Shivaya",
    latitude: 12.2353,
    longitude: 79.0747,
    color: "#4B0082",
    emoji: "🌙",
    order: 8,
    imageUrl: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
  }
];

// --- Database Schema ---

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const visits = pgTable("visits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  shrineId: text("shrine_id").notNull(),
  visitedAt: timestamp("visited_at").defaultNow().notNull(),
  notes: text("notes"), // User's personal reflection
  isVirtual: boolean("is_virtual").default(true).notNull(), // true = checked in from app remotely
  verifiedLocation: jsonb("verified_location"), // Stores { lat, lng, accuracy, timestamp }
}, (table) => [
  index("user_id_idx").on(table.userId),
  index("shrine_id_idx").on(table.shrineId)
]);

// For keeping track of overall journey state
export const journeys = pgTable("journeys", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  status: text("status").notNull().default("active"), // active, completed, paused
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  currentShrineOrder: integer("current_shrine_order").default(0).notNull(), // To track sequence
});

export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(), // Invite code
  creatorId: integer("creator_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const groupMembers = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groups.id),
  userId: integer("user_id").notNull().references(() => users.id),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  lastLocation: jsonb("last_location"), // { lat, lng }
  lastSeenAt: timestamp("last_seen_at"),
  lastStatus: text("last_status"), // 'OK', 'SOS', 'MOVING', etc.
  lastWaypointId: integer("last_waypoint_id"), // Track last visited waypoint to prevent spam
});

export const waypoints = pgTable("waypoints", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groups.id),
  name: text("name").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  radius: integer("radius").notNull().default(50), // meters
  type: text("type").notNull().default("RALLY"), // RALLY, HAZARD, OBJECTIVE
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sitreps = pgTable("sitreps", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groups.id),
  userId: integer("user_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"), // info, alert, status
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// AAR: Tactical Movement Logging
export const movementLogs = pgTable("movement_logs", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groups.id),
  userId: integer("user_id").notNull().references(() => users.id),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  status: text("status"), // e.g. 'OK', 'SOS'
}, (table) => [
  index("movement_group_idx").on(table.groupId),
  index("movement_user_idx").on(table.userId),
  index("movement_time_idx").on(table.timestamp)
]);


// --- Zod Schemas for API Validation ---

export const insertGroupSchema = createInsertSchema(groups).pick({
  name: true,
}).extend({
  name: z.string().min(3, "Group name must be at least 3 characters"),
});

export const joinGroupSchema = z.object({
  code: z.string().length(6, "Invalid code format"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
}).extend({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const insertVisitSchema = createInsertSchema(visits).pick({
  shrineId: true,
  notes: true,
  isVirtual: true,
}).extend({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  accuracy: z.number().min(0).optional(),
});

export const insertWaypointSchema = createInsertSchema(waypoints).pick({
  name: true,
  latitude: true,
  longitude: true,
  type: true,
  radius: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Visit = typeof visits.$inferSelect;
export type Journey = typeof journeys.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type GroupMember = typeof groupMembers.$inferSelect;
export type SitRep = typeof sitreps.$inferSelect;
export type Waypoint = typeof waypoints.$inferSelect;
export type MovementLog = typeof movementLogs.$inferSelect;
export type JoinGroup = z.infer<typeof joinGroupSchema>;
export type InsertWaypoint = z.infer<typeof insertWaypointSchema>;
export type InsertVisit = z.infer<typeof insertVisitSchema>;

// --- WebSocket Schemas ---

export const wsJoinGroupSchema = z.object({
  type: z.literal("join_group"),
  groupId: z.number(),
  userId: z.number().optional(), // Client sends it, server uses session ID
});

export const wsLocationUpdateSchema = z.object({
  type: z.literal("location_update"),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    timestamp: z.number().optional(),
  }),
});

export const wsBeaconSignalSchema = z.object({
  type: z.literal("beacon_signal"),
  signal: z.enum(["SOS", "REGROUP", "MOVING"]),
});

export const wsSitRepSchema = z.object({
  type: z.literal("sitrep"),
  text: z.string(),
});

export const wsStatusUpdateSchema = z.object({
  type: z.literal("status_update"),
  status: z.string(),
});

export const wsMessageSchema = z.discriminatedUnion("type", [
  wsJoinGroupSchema,
  wsLocationUpdateSchema,
  wsBeaconSignalSchema,
  wsSitRepSchema,
  wsStatusUpdateSchema,
]);

export type WsMessage = z.infer<typeof wsMessageSchema>;

// --- Server to Client Messages ---

export const scLocationUpdateSchema = z.object({
  type: z.literal("location_update"),
  userId: z.number(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    timestamp: z.number().optional(),
  }),
});

export const scBeaconSignalSchema = z.object({
  type: z.literal("beacon_signal"),
  userId: z.number(),
  signal: z.enum(["SOS", "REGROUP", "MOVING"]),
});

export const scSitRepSchema = z.object({
  type: z.literal("sitrep"),
  sitrep: z.object({
      id: z.number(),
      groupId: z.number(),
      userId: z.number(),
      message: z.string(),
      type: z.string(),
      createdAt: z.string().or(z.date()),
  })
});

export const scMemberUpdateSchema = z.object({
  type: z.literal("member_update"),
  userId: z.number(),
  status: z.string(),
});

export const scStatusUpdateSchema = z.object({
  type: z.literal("status_update"),
  userId: z.number(),
  status: z.string(),
});

export const serverToClientMessageSchema = z.discriminatedUnion("type", [
  scLocationUpdateSchema,
  scBeaconSignalSchema,
  scSitRepSchema,
  scMemberUpdateSchema,
  scStatusUpdateSchema,
]);

export type ServerToClientMessage = z.infer<typeof serverToClientMessageSchema>;

// --- API Response Schemas ---

export const groupMemberResponseSchema = z.object({
  id: z.number(),
  groupId: z.number(),
  userId: z.number(),
  joinedAt: z.string().or(z.date()), // API might return string ISO date
  lastLocation: verifiedLocationSchema.optional().nullable(),
  lastSeenAt: z.string().or(z.date()).nullable(),
  lastStatus: z.string().nullable(),
  lastWaypointId: z.number().nullable(),
  user: z.object({
    username: z.string()
  })
});

export const commandCenterResponseSchema = z.object({
  group: z.object({
    id: z.number(),
    name: z.string(),
    code: z.string(),
    creatorId: z.number(),
    createdAt: z.string().or(z.date())
  }),
  members: z.array(groupMemberResponseSchema),
  sitreps: z.array(z.object({
    id: z.number(),
    groupId: z.number(),
    userId: z.number(),
    message: z.string(),
    type: z.string(),
    createdAt: z.string().or(z.date())
  })),
  waypoints: z.array(z.object({
    id: z.number(),
    groupId: z.number(),
    name: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    radius: z.number(),
    type: z.string(),
    createdAt: z.string().or(z.date())
  }))
});

export type GroupMemberResponse = z.infer<typeof groupMemberResponseSchema>;
export type CommandCenterResponse = z.infer<typeof commandCenterResponseSchema>;

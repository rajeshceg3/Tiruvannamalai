import { pgTable, text, serial, integer, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";
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
  latitude: z.number(),
  longitude: z.number(),
  color: z.string(),
  emoji: z.string(),
  order: z.number(),
  imageUrl: z.string(),
});

export type Shrine = z.infer<typeof shrineSchema>;

export const shrineData: Shrine[] = [
  {
    id: "indra-lingam",
    name: "Indra Lingam",
    element: "Light",
    direction: "East",
    description: "Where the journey begins with the dawn. Bathed in soft golden light, birds sing in banyan trees above, and the air smells faintly of incense and sacred ash. Associated with the celestial king Indra, this Lingam invites clarity and awakening.",
    significance: "The delicate chants of pilgrims set the tone — it's not just a walk, it's a pilgrimage of the soul.",
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
    description: "A temple that burns with inner fire. As the sun climbs higher, this Lingam radiates heat and intensity like a flame frozen in stone. The element of fire is palpable—in the passion of devotees and the crackling silence around the shrine.",
    significance: "You can feel it — not just in temperature, but in the passion of the devotees. You pause, palms pressed together, eyes closed — and for a moment, you are the fire.",
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
    element: "Justice",
    direction: "South",
    description: "Named after the God of Death, Yama Lingam symbolizes the control over death and rebirth. Worshipping here is believed to bestow longevity and protect against untimely death. It is a place to contemplate the cycle of life.",
    significance: "A powerful reminder of the impermanence of life, urging us to live righteously.",
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
    element: "Earth",
    direction: "Southwest",
    description: "A quiet watcher in the shadows. Associated with protection from evil, the energy deepens here. Light dims, the path narrows, footsteps become deliberate. Surrounded by towering trees and old stones, this is a place to confront fears and offer them to the earth.",
    significance: "It's still. It's grounding. And it whispers: 'Let go.'",
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
    description: "Where water and wisdom flow. Dedicated to the Lord of Rain, this shrine cools the spirit. You hear the imagination of rain and feel the fluid wisdom of the universe, washing away impurities.",
    significance: "There's a fluid wisdom in this place. You might sit here a little longer, watching the temple elephant walk past in solemn grace.",
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
    description: "Breathing in the invisible sacred. Tucked beneath whispering trees, this shrine honors the wind god. The breeze dances through your hair as you stand in silence, feeling the weightlessness of breath and motion—like the pause between thoughts.",
    significance: "It's airy, tranquil, and spacious — like the pause between thoughts. You inhale deeply and exhale centuries of stillness.",
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
    element: "Abundance",
    direction: "North",
    description: "Abundance in the green embrace. Nestled near fragrant gardens and shaded groves, this Northern shrine glows with generosity. Dedicated to the Lord of Wealth, people tie yellow threads, offer turmeric rice, and whisper prayers for health and prosperity.",
    significance: "The aroma of sandalwood and sweet pongal hangs in the air. You smile — not from riches, but from fullness.",
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
    element: "Ether",
    direction: "Northeast",
    description: "Where sky meets silence. Your final stop faces Northeast—a sacred compass pointing to transcendence. The landscape opens up, birds drift overhead. This shrine, symbolizing ether or space, is where elements dissolve into pure awareness.",
    significance: "You sit in silence as dusk settles over Arunachala. The stars begin to blink alive. And in that infinite sky, you find your place in the cosmos.",
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

// --- Zod Schemas for API Validation ---

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
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  accuracy: z.number().optional(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Visit = typeof visits.$inferSelect;
export type Journey = typeof journeys.$inferSelect;

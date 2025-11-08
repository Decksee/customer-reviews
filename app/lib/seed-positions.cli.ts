#!/usr/bin/env node
/**
 * Seed default positions for the pharmacy system
 * 
 * Usage:
 *   npx tsx app/lib/seed-positions.cli.ts
 */

import { positionService } from "~/services/position.service.server";
import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Default positions for a pharmacy
const defaultPositions = [
  "Pharmacien",
  "Pharmacien adjoint", 
  "Préparateur en pharmacie",
  "Préparateur",
  "Préparateur stagiaire",
  "Étudiant en pharmacie",
  "Stagiaire",
  "Apprenti",
  "Vendeur en pharmacie",
  "Caissier",
  "Assistant",
  "Rayonniste",
  "Responsable parapharmacie",
  "Technicien de laboratoire",
  // Newly added positions
  "Agent d'entretien",
  "Agent de sécurité",
  "Auxilliaire",
  "Caissière",
  "Chargé de commande",
  "Chef d'Equipe",
  "Chef de Service",
  "Comptable",
  "Dermo- conseillère",
  "Pharmacien Assistant",
  "Responsable Accueil & Qualité"
];

async function run() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.DB_URL || process.env.MONGODB_URL;
    if (!mongoUri) {
      throw new Error("DATABASE_URL or MONGODB_URL environment variable is required");
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    console.log("Starting position seeding...");
    
    let createdCount = 0;
    let skippedCount = 0;

    for (const positionTitle of defaultPositions) {
      try {
        // Check if position already exists
        const existingPosition = await positionService.findByTitle(positionTitle);
        
        if (existingPosition) {
          console.log(`- Skipped: "${positionTitle}" (already exists)`);
          skippedCount++;
        } else {
          // Create new position
          const newPosition = await positionService.createPosition(positionTitle);
          console.log(`- Created: "${positionTitle}" (ID: ${newPosition._id})`);
          createdCount++;
        }
      } catch (error) {
        console.error(`- Error creating "${positionTitle}":`, error instanceof Error ? error.message : String(error));
      }
    }

    console.log("\nSeeding completed:");
    console.log(`- ${createdCount} positions created`);
    console.log(`- ${skippedCount} positions skipped (already existed)`);
    console.log(`- ${createdCount + skippedCount} total positions processed`);

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : String(error));
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

run(); 
#!/usr/bin/env node
/**
 * Initialize the first admin user in the application
 * 
 * Usage:
 *   npx tsx app/lib/init.cli.ts --email admin@example.com --password securePassword --name "Admin User" [--role manager]
 *   OR
 *   npx tsx app/lib/init.cli.ts admin@example.com securePassword "Admin User" [manager]
 */

import { userService } from "~/services/user.service.server";
import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Parse command-line arguments
const args = process.argv.slice(2);
const params: Record<string, string> = {};

// Check if using named parameters (--param value format) or positional parameters
const isUsingNamedParams = args.length > 0 && args[0].startsWith('--');

if (isUsingNamedParams) {
  // Named parameter parsing (--param value format)
  for (let i = 0; i < args.length; i += 2) {
    if (args[i].startsWith("--")) {
      params[args[i].slice(2)] = args[i + 1];
    }
  }
} else {
  // Positional parameter parsing (email password name [role])
  if (args.length >= 3) {
    params['email'] = args[0];
    params['password'] = args[1];
    params['name'] = args[2];
    
    if (args.length >= 4) {
      params['role'] = args[3];
    }
  }
}

// Validate required parameters
const requiredParams = ["email", "password", "name"];
const missingParams = requiredParams.filter(param => !params[param]);

if (missingParams.length > 0) {
  console.error(`Error: Missing required parameters: ${missingParams.join(", ")}`);
  console.log("\nUsage:");
  console.log("  npx tsx app/lib/init.cli.ts --email admin@example.com --password securePassword --name \"Admin User\" [--role manager]");
  console.log("  OR");
  console.log("  npx tsx app/lib/init.cli.ts admin@example.com securePassword \"Admin User\" [manager]");
  process.exit(1);
}

// Connect to the database
async function run() {
  try {
    const MONGODB_URI = process.env.DB_URL;
    
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined in the environment variables");
    }
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Check if user already exists
    const existingUser = await userService.findByEmail(params.email);
    
    if (existingUser) {
      console.log(`User with email ${params.email} already exists.`);
      await mongoose.disconnect();
      process.exit(0);
    }

    // Split the name into first and last name
    const nameParts = params.name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    // Create the user using the createOne method from BaseService
    const user = await userService.createOne({
      email: params.email,
      password: params.password, // The service/entity should handle password hashing
      firstName,
      lastName,
      role: params.role || "employee",
      isActive: true,
    });

    console.log(`User created successfully:`);
    console.log(`- ID: ${user._id}`);
    console.log(`- Email: ${user.email}`);
    console.log(`- Name: ${firstName} ${lastName}`);
    console.log(`- Role: ${user.role}`);

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

import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Ensure the uploads directory exists
async function ensureUploadsDir() {
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "avatars");
    if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
    }
    return uploadsDir;
}

// Handle file upload and return the path
export async function handleFileUpload(formData: FormData) {
    const avatarFile = formData.get("avatar") as File;

    // If no file was uploaded or it's not a real file (happens when no new file is selected)
    if (!avatarFile || avatarFile.size === 0 || !(avatarFile instanceof File)) {
        return null;
    }

    // Check if it's an image
    if (!avatarFile.type.startsWith("image/")) {
        throw new Error("Le fichier doit être une image");
    }

    // Limit file size (2MB)
    if (avatarFile.size > 2 * 1024 * 1024) {
        throw new Error("L'image ne doit pas dépasser 2MB");
    }

    // Create a unique filename
    const fileExtension = avatarFile.name.split(".").pop();
    const filename = `${randomUUID()}.${fileExtension}`;

    // Ensure uploads directory exists
    const uploadsDir = await ensureUploadsDir();

    // Save the file
    const arrayBuffer = await avatarFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filePath = path.join(uploadsDir, filename);
    await writeFile(filePath, buffer);

    // Return the public URL path
    return `/uploads/avatars/${filename}`;
}           


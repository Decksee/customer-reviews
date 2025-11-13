import type { Route } from "./+types/preview.$id";
import { reportService } from "~/services/report.service.server";
import { authService } from "~/services/auth.service.server";
import fs from "node:fs";
import path from "node:path";

export async function loader({ request, params }: Route.LoaderArgs) {
  // Ensure user is authenticated
  await authService.requireUser(request);
  
  // Get report ID from params
  const reportId = params.id;
  if (!reportId) {
    throw new Response("Report ID is required", { status: 400 });
  }
  
  // Get the report
  const report = await reportService.getReportById(reportId);
  
  if (!report || !report.filePath) {
    throw new Response("Report not found", { status: 404 });
  }
  
  // Only allow preview for PDF files
  if (report.format !== 'PDF') {
    throw new Response("Preview only available for PDF reports", { status: 400 });
  }
  
  try {
    // Extract filename from filePath
    const filename = path.basename(report.filePath);
    
    // Construct path to the public/reports directory
    const publicReportsDir = path.join(process.cwd(), 'public', 'reports');
    const filePath = path.join(publicReportsDir, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      throw new Response("Report file not found", { status: 404 });
    }
    
    // Read the file
    const fileBuffer = fs.readFileSync(filePath);
    
    // Return PDF with inline display
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline", // Importante: "inline" au lieu de "attachment"
        "Content-Length": fileBuffer.length.toString()
      }
    });
  } catch (error) {
    console.error("Error reading report file:", error);
    throw new Response(`Error reading report file: ${(error as Error).message}`, { status: 500 });
  }
}

// No default export - this makes it a resource route 
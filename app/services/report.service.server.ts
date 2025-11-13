import Report, { type IReport, type IReportMethods, type ReportModel } from "~/core/entities/report.entity.server";
import { BaseService } from "~/core/abstracts/service.server";
import mongoose from "mongoose";
import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import { feedbackSessionService } from "~/services/feedback-session.service.server";
import { userService } from "~/services/user.service.server";
import { logger } from "~/core/utils/logger.server";

export default class ReportService extends BaseService<
  IReport,
  IReportMethods,
  ReportModel
> {
  constructor() {
    super(Report);
  }

  private static instance: ReportService;

  public static getInstance(): ReportService {
    if (!ReportService.instance) {
      ReportService.instance = new ReportService();
    }
    return ReportService.instance;
  }

  /**
   * Get recent reports with pagination
   */
  async getRecentReports(limit = 10, page = 1) {
    const reports = await this.model.find()
      .sort({ date: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .populate('generatedBy', 'firstName lastName email');

    return reports;
  }

  /**
   * Generate a report file
   */
  async generateReport(
    type: IReport['type'],
    format: IReport['format'],
    userId: string,
    dateRange?: { start: Date; end: Date },
    employeeId?: string,
    sentimentFilter?: string
  ) {
    try {
      // Create directory if it doesn't exist
      const reportDir = path.join(process.cwd(), 'public', 'reports');
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${type}_${timestamp}.${format === 'PDF' ? 'pdf' : 'xlsx'}`;
      const filePath = path.join(reportDir, fileName);
      const publicPath = `/reports/${fileName}`;

      // Get report name based on type and date range
      const reportName = await this.getReportName(type, employeeId, dateRange);

      // Generate data for the report, filtered by date range
      const reportData = await this.getReportData(type, dateRange, employeeId);

      // Log data for debugging
      logger.info(`Generated report data: ${reportData.length} items for type ${type}`);

      // Generate the file based on format
      if (format === 'PDF') {
        await this.generatePdfReport(filePath, reportName, reportData, type, dateRange);
      } else {
        await this.generateExcelReport(filePath, reportName, reportData, type, dateRange);
      }

      // Get actual file size
      const stats = fs.statSync(filePath);
      const fileSize = (stats.size / (1024 * 1024)).toFixed(2) + ' MB';

      // Create the report record in database
      const reportData2: Partial<IReport> = {
        name: reportName,
        format,
        size: fileSize,
        type,
        filePath: publicPath,
        generatedBy: new mongoose.Types.ObjectId(userId),
        dateRange,
        downloadCount: 0
      };

      const report = await this.model.create(reportData2);
      return report;
    } catch (error) {
      logger.error('Error generating report:', error);
      throw error;
    }
  }

  /**
   * Generate a PDF report using PDFKit
   */
  private async generatePdfReport(
    filePath: string,
    reportName: string,
    data: any[],
    type: IReport['type'],
    dateRange?: { start: Date; end: Date }
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        logger.info(`Starting PDF generation for ${type} with ${data.length} items`);

        // Create a new PDF document
        const doc = new PDFDocument({
          margin: 50,
          size: 'A4',
          info: {
            Title: reportName,
            Author: 'Pharmacie Val d\'Oise',
            Subject: 'Rapport généré automatiquement',
            Keywords: 'pharmacie, rapport, données, analyse'
          },
          autoFirstPage: false // We'll add the first page manually for better control
        });

        // Define a professional color palette
        const colors = {
          primary: '#0F4C81',         // Deep blue - primary brand color
          secondary: '#E3F2FD',       // Light blue - secondary color
          accent: '#00ACC1',          // Teal accent - for highlights
          text: '#263238',            // Dark gray - main text color
          lightText: '#546E7A',       // Medium gray - secondary text
          border: '#CFD8DC',          // Light gray - for borders
          tableHeader: '#0F4C81',     // Deep blue for table headers
          tableStripe: '#F5F7FA',     // Very light gray for table stripes
          success: '#4CAF50',         // Green for positive values
          warning: '#FFC107',         // Amber for warnings
          error: '#F44336'            // Red for errors/negative values
        };

        // Define fonts - use standard fonts that look professional
        const fonts = {
          title: 'Helvetica-Bold',
          subtitle: 'Helvetica',
          body: 'Helvetica',
          italic: 'Helvetica-Oblique',
          bold: 'Helvetica-Bold'
        };

        // Pipe the PDF output to a file
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Add page numbers and professional footer to all pages
        let pageCount = 0;
        doc.on('pageAdded', () => {
          pageCount++;
          const oldBottom = doc.page.margins.bottom;
          doc.page.margins.bottom = 0;

          // Add a gradient footer bar
          doc.rect(0, doc.page.height - 45, doc.page.width, 45)
            .fill(colors.secondary);

          // Add a colored line at bottom of page
          doc.moveTo(30, doc.page.height - 45)
            .lineTo(doc.page.width - 30, doc.page.height - 45)
            .lineWidth(1)
            .stroke(colors.primary);

          // Add page number with subtle background
          doc.circle(doc.page.width / 2, doc.page.height - 25, 12)
            .fillAndStroke(colors.primary, colors.primary);
          doc.fontSize(8)
            .fillColor('white')
            .text(
              pageCount.toString(),
              doc.page.width / 2 - 3,
              doc.page.height - 28
            );

          // Add professional footer text
          const footerText = 'Pharmacie Val d\'Oise - Document confidentiel';
          const footerDate = new Date().toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });

          // Left footer
          doc.fontSize(8)
            .font(fonts.body)
            .fillColor(colors.lightText)
            .text(
              footerText,
              50,
              doc.page.height - 25,
              { width: 200 }
            );

          // Right footer
          doc.text(
            footerDate,
            doc.page.width - 150,
            doc.page.height - 25,
            { width: 100, align: 'right' }
          );

          // Reset margins
          doc.page.margins.bottom = oldBottom;
        });

        // Create a professional cover page
        logger.info('Adding cover page...');
        this.addCoverPage(doc, reportName, colors as any, fonts as any, dateRange);

        // Add a new page for the report content with a professional header
        logger.info('Adding content page...');
        doc.addPage();

        // Add header to content page
        logger.info('Adding header to content page...');
        this.addHeader(doc, reportName, colors as any, fonts as any, dateRange);

        // Explicitly set Y position after header to ensure content starts at the right place
        doc.y = 100; // Start content below the header
        logger.info(`Content will start at Y position: ${doc.y}`);

        // Add report title with professional spacing and typography
        doc.fontSize(16).font(fonts.title).fillColor(colors.primary)
          .text('Détails du rapport', 50, doc.y, { align: 'left' });

        // Add visual separator
        const titleY = doc.y;
        doc.moveTo(50, titleY + 20)
          .lineTo(120, titleY + 20)
          .lineWidth(3)
          .stroke(colors.accent);

        // Move Y position after the separator
        doc.y = titleY + 35;

        // Add date range with improved formatting
        if (dateRange) {
          const startDate = dateRange.start.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          const endDate = dateRange.end.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });

          doc.fontSize(10).font(fonts.body).fillColor(colors.lightText)
            .text('Période du rapport: ', 50, doc.y, { continued: true })
            .font(fonts.bold).fillColor(colors.text)
            .text(`${startDate} au ${endDate}`);

          doc.y += 15;
        }

        // Add generation timestamp with icon-like element
        const now = new Date();
        const formattedDate = now.toLocaleDateString('fr-FR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        const formattedTime = now.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        });

        // Add a clock icon effect
        const clockY = doc.y + 6;
        doc.circle(54, clockY, 3)
          .fillAndStroke(colors.accent, colors.accent);

        doc.fontSize(9).font(fonts.italic).fillColor(colors.lightText)
          .text(`Généré le ${formattedDate} à ${formattedTime}`, 65, doc.y);

        doc.y += 30; // Add space before content

        // Add content box with subtle border and background
        const contentStartY = doc.y;
        const contentWidth = doc.page.width - 100;
        const contentEstimatedHeight = data.length > 0 ? Math.min(30 + (data.length * 25), 400) : 100;

        // Add subtle background for content area - ensure it's within page bounds
        doc.rect(40, contentStartY - 10, contentWidth, contentEstimatedHeight)
          .fill('#FAFAFA');

        // Check if data is available with improved empty state design
        if (data.length === 0) {
          // Create a visually appealing "no data" message
          const noDataY = contentStartY + 30;

          // Add icon-like element
          doc.circle(doc.page.width / 2, noDataY, 15)
            .lineWidth(2)
            .fillAndStroke('#F5F5F5', colors.lightText);

          // Add an "!" symbol
          doc.fontSize(20).font(fonts.bold).fillColor(colors.lightText)
            .text('!', doc.page.width / 2 - 3, noDataY - 9);

          // Position the text properly
          doc.y = noDataY + 25;

          // Add message with better typography
          doc.fontSize(14).font(fonts.italic).fillColor(colors.lightText)
            .text('Aucune donnée disponible pour cette période.', { align: 'center' });

          doc.y += 20;
          doc.fontSize(10).fillColor(colors.lightText)
            .text('Veuillez modifier les filtres ou sélectionner une autre période.', { align: 'center' });
        } else {
          // Set Y position for table content
          doc.y = contentStartY + 10;
          logger.info(`Adding data table at Y position: ${doc.y}`);
          // Add table with enhanced styling
          this.addDataTable(doc, data, type, colors, fonts);
          logger.info(`Table complete, Y position now: ${doc.y}`);
        }

        // Add summary section with enhanced design if data exists
        if (data.length > 0) {
          // Ensure we're not too close to the bottom of the page
          if (doc.y > doc.page.height - 200) {
            logger.info('Adding new page for summary section');
            doc.addPage();
            this.addHeader(doc, reportName, colors as any, fonts as any, dateRange);
            doc.y = 100;
          }
          logger.info(`Adding summary section at Y position: ${doc.y}`);
          this.addSummarySection(doc, data, type, colors as any, fonts as any, dateRange);
        }

        // Finalize the PDF
        logger.info('Finalizing PDF document...');
        doc.end();

        // Wait for the stream to finish
        stream.on('finish', () => {
          resolve();
        });

        stream.on('error', (err) => {
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Add professional cover page to PDF
   */
  private addCoverPage(
    doc: PDFKit.PDFDocument,
    reportName: string,
    colors: any,
    fonts: any,
    dateRange?: { start: Date; end: Date }
  ): void {
    // Create a new first page
    doc.addPage();

    // Add gradient background effect
    doc.rect(0, 0, doc.page.width, doc.page.height)
      .fill('#FAFBFC');

    // Add top color band
    doc.rect(0, 0, doc.page.width, 180)
      .fill(colors.primary);

    // Add subtle design elements - left side decoration
    doc.rect(0, 180, 15, doc.page.height - 180)
      .fill(colors.primary);

    // Right side decoration
    doc.rect(doc.page.width - 15, 180, 15, doc.page.height - 180)
      .fill(colors.accent);

    // Add pharmacy logo/name with modern typography
    doc.fontSize(28).font(fonts.title).fillColor('white')
      .text('PHARMACIE', doc.page.width / 2 - 110, 60);

    doc.fontSize(40).font(fonts.title).fillColor('white')
      .text('VAL D\'OISE', doc.page.width / 2 - 110, 90);

    // Add modern separator with gradient effect
    const gradientWidth = doc.page.width - 120;
    doc.rect(60, 150, gradientWidth / 3, 3).fill('white');
    doc.rect(60 + gradientWidth / 3, 150, gradientWidth / 3, 3).fill(colors.secondary);
    doc.rect(60 + (gradientWidth * 2 / 3), 150, gradientWidth / 3, 3).fill(colors.accent);

    // Add document type badge
    const badgeY = 200;
    doc.roundedRect(60, badgeY, 120, 30, 5)
      .fill(colors.accent);
    doc.fontSize(12).font(fonts.bold).fillColor('white')
      .text('RAPPORT OFFICIEL', 70, badgeY + 9);

    // Add report title with visual hierarchy
    const titleY = 260;
    doc.fontSize(26).font(fonts.title).fillColor(colors.primary)
      .text('RAPPORT', 60, titleY);

    // Add report subtitle with dynamic sizing based on length
    const fontSize = reportName.length > 40 ? 18 : 22;
    doc.fontSize(fontSize).font(fonts.title).fillColor(colors.text)
      .text(reportName, 60, titleY + 40, { width: doc.page.width - 120 });

    // Add date range with improved design
    if (dateRange) {
      const startDate = dateRange.start.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const endDate = dateRange.end.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const dateRangeY = titleY + 90;
      // Add date icon
      doc.circle(67, dateRangeY + 7, 5)
        .lineWidth(1.5)
        .fillAndStroke('#FFFFFF', colors.accent);

      // Add date lines
      doc.moveTo(65, dateRangeY + 4).lineTo(69, dateRangeY + 4).stroke();
      doc.moveTo(67, dateRangeY + 2).lineTo(67, dateRangeY + 7).stroke();

      doc.fontSize(14).font(fonts.bold).fillColor(colors.lightText)
        .text('Période du rapport:', 80, dateRangeY);

      doc.fontSize(14).font(fonts.body).fillColor(colors.text)
        .text(`${startDate} au ${endDate}`, 80, dateRangeY + 20);
    }

    // Add generation info with icon
    const now = new Date();
    const generationDate = now.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const generationTime = now.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const genInfoY = titleY + (dateRange ? 140 : 90);

    // Add clock icon
    doc.circle(67, genInfoY + 7, 5)
      .lineWidth(1.5)
      .fillAndStroke('#FFFFFF', colors.accent);

    // Add clock hands (simplified)
    doc.moveTo(67, genInfoY + 7).lineTo(67, genInfoY + 4).stroke();
    doc.moveTo(67, genInfoY + 7).lineTo(70, genInfoY + 7).stroke();

    doc.fontSize(12).font(fonts.italic).fillColor(colors.lightText)
      .text(`Généré le ${generationDate}`, 80, genInfoY);

    doc.fontSize(12).font(fonts.italic).fillColor(colors.lightText)
      .text(`à ${generationTime}`, 80, genInfoY + 16);

    // Add decorative elements - horizontal bars at bottom
    const barY = doc.page.height - 150;
    doc.rect(60, barY, doc.page.width - 120, 2).fill(colors.border);
    doc.rect(60, barY + 60, doc.page.width - 120, 1).fill(colors.border);

    // Add company information with professional layout
    const addressY = barY + 15;

    doc.fontSize(14).font(fonts.bold).fillColor(colors.primary)
      .text('Pharmacie Val d\'Oise', 60, addressY);

    doc.fontSize(10).font(fonts.body).fillColor(colors.lightText)
      .text('Abidjan Cocody Bessikoi', 60, addressY + 20)
      .text('Centre commercial KOKOH Mall', 60, addressY + 32)
      .text('à 400 mètres du CHU d\'Angré', 60, addressY + 44);

    // Add contact info with icons
    const contactY = addressY;
    const contactX = 350;

    // Phone icon (simplified)
    doc.roundedRect(contactX, contactY, 14, 14, 2)
      .lineWidth(1)
      .fillAndStroke('#FFFFFF', colors.accent);

    doc.fontSize(10).font(fonts.body).fillColor(colors.text)
      .text('Tél: +225 07 00 00 37 37', contactX + 20, contactY + 3);

    // Email icon (simplified)
    doc.moveTo(contactX, contactY + 30)
      .lineTo(contactX + 14, contactY + 24)
      .lineTo(contactX + 14, contactY + 36)
      .lineTo(contactX, contactY + 30)
      .lineWidth(1)
      .fillAndStroke('#FFFFFF', colors.accent);

    doc.fontSize(10).font(fonts.body).fillColor(colors.text)
      .text('contact@pharmacievaldoise.com', contactX + 20, contactY + 27);

    // Add document type and confidentiality notice
    doc.fontSize(8).font(fonts.italic).fillColor(colors.lightText)
      .text('Document confidentiel - Usage interne uniquement', 60, doc.page.height - 50);
  }

  /**
   * Add professional header to each content page
   */
  private addHeader(
    doc: PDFKit.PDFDocument,
    reportName: string,
    colors: any,
    fonts: any,
    dateRange?: { start: Date; end: Date }
  ): void {
    // Add a modern header with color band and shadow effect
    doc.rect(0, 0, doc.page.width, 5)
      .fill(colors.accent);

    // Add main header background with subtle gradient
    doc.rect(0, 5, doc.page.width, 60)
      .fill(colors.primary);

    // Add stylish visual element
    doc.rect(0, 65, 15, 15)
      .fill(colors.accent);

    // Add pharmacy logo/name
    doc.fontSize(14).font(fonts.title).fillColor('white')
      .text('PHARMACIE VAL D\'OISE', 50, 22);

    // Add vertical separator
    doc.rect(230, 20, 1, 30)
      .fill('rgba(255, 255, 255, 0.4)');

    // Add report title - truncate if too long for header
    let displayTitle = reportName;
    if (reportName.length > 40) {
      displayTitle = reportName.substring(0, 37) + '...';
    }

    doc.fontSize(11).font(fonts.subtitle).fillColor('white')
      .text(displayTitle, 250, 22, { width: 300 });

    // Add date range if provided with professional formatting
    if (dateRange) {
      const start = dateRange.start.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      const end = dateRange.end.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

      doc.fontSize(9).font(fonts.body).fillColor('rgba(255, 255, 255, 0.8)')
        .text(`Période: ${start} - ${end}`, 250, 40);
    }
  }

  /**
   * Add professional data table to PDF
   */
  private addDataTable(
    doc: PDFKit.PDFDocument,
    data: any[],
    type: IReport['type'],
    colors: any,
    fonts: any
  ): void {
    // Get headings for the table
    const headings = this.getReportHeadings(type);
    const colCount = headings.length;

    // Log data being rendered
    logger.info(`Rendering ${data.length} rows for ${type} report`);

    // Calculate table position - ensure we have a valid Y position
    let yPos = doc.y || 200; // Fallback to 200 if doc.y is undefined
    const xPos = 50;

    // Calculate table width and column widths with professional proportions
    const tableWidth = 500;
    let colWidths: number[] = [];

    // Set specific column widths based on content type for better readability
    switch (type) {
      case 'employees':
        colWidths = [100, 100, 140, 80, 80]; // Nom, Prénom, Email, Poste, Date
        break;
      case 'clients':
        colWidths = [100, 100, 120, 80, 100]; // Nom, Prénom, Email, Téléphone, Visite
        break;
      case 'pharmacy-reviews':
        colWidths = [80, 50, 280, 90]; // Date, Note, Commentaire, Client
        break;
      case 'employee-reviews':
      case 'specific-employee-reviews':
        colWidths = [100, 80, 50, 180, 90]; // Employé, Date, Note, Commentaire, Client
        break;
      case 'suggestions':
        colWidths = [80, 280, 90, 50]; // Date, Suggestion, Client, Statut
        break;
      default:
        // Equal width for all columns if type is not recognized
        colWidths = Array(colCount).fill(Math.floor(tableWidth / colCount));
    }

    // Adjust column widths if they don't match the expected column count
    if (colWidths.length !== colCount) {
      colWidths = Array(colCount).fill(Math.floor(tableWidth / colCount));
    }

    // Add some vertical space before the table
    doc.moveDown(0.5);
    yPos = doc.y;

    // Create a professional table container with subtle shadow
    // Shadow effect (layered rectangles with decreasing opacity)
    doc.rect(xPos + 4, yPos + 4, tableWidth, data.length * 30 + 40)
      .fill('rgba(0, 0, 0, 0.03)');
    doc.rect(xPos + 2, yPos + 2, tableWidth, data.length * 30 + 40)
      .fill('rgba(0, 0, 0, 0.05)');

    // Table border
    doc.roundedRect(xPos - 1, yPos - 1, tableWidth + 2, data.length * 30 + 42, 3)
      .lineWidth(0.75)
      .stroke(colors.border);

    // Draw modern table header with gradient effect
    doc.rect(xPos, yPos, tableWidth, 36)
      .fill(colors.tableHeader);

    // Add subtle highlight to header
    doc.rect(xPos, yPos, tableWidth, 2)
      .fill(colors.accent);

    // Draw table headers with improved typography
    doc.fillColor('white').fontSize(10).font(fonts.bold);
    headings.forEach((heading, i) => {
      let xOffset = xPos;
      for (let j = 0; j < i; j++) {
        xOffset += colWidths[j];
      }

      // Add slight vertical centering adjustment
      const headerY = yPos + 13;

      doc.text(heading, xOffset + 5, headerY, {
        width: colWidths[i] - 10,
        align: 'center'
      });
    });

    yPos += 36; // Increased header height

    // Draw table rows with improved styling
    doc.font(fonts.body).fontSize(9).fillColor(colors.text);

    if (data.length === 0) {
      // This should never happen as we check for data earlier, but just in case
      doc.moveDown(2);
      doc.fontSize(12).font(fonts.italic).fillColor(colors.lightText)
        .text('Aucune donnée disponible pour ce rapport.', { align: 'center' });
      return;
    }

    data.forEach((row, rowIndex) => {
      // Get row data formatted for this report type
      const rowData = this.formatRowData(row, type);

      // Calculate required row height based on content with better algorithm
      let rowHeight = 28; // Increased minimum height for better readability
      const maxContentHeight = rowData.map((cell, i) => {
        const cellText = String(cell || '');
        const cellWidth = colWidths[i] - 14; // 7px padding on each side for more breathing room

        // Better text height estimation
        const linesEstimate = Math.ceil(cellText.length / (cellWidth / 4.5));
        const textHeight = linesEstimate * 12;

        return Math.max(textHeight, 24); // Increased minimum
      });

      rowHeight = Math.max(...maxContentHeight, rowHeight);

      // Check if we need a new page
      if (yPos + rowHeight > doc.page.height - 100) {
        doc.addPage();

        // Add professional header to the new page
        this.addHeader(doc, doc.info.Title as string, colors as any, fonts as any);

        // Reset y position
        yPos = 100; // Start table content below header
        doc.y = yPos; // Also update doc.y

        // Add table header on new page
        doc.rect(xPos, yPos, tableWidth, 36)
          .fill(colors.tableHeader);

        // Add subtle highlight to header
        doc.rect(xPos, yPos, tableWidth, 2)
          .fill(colors.accent);

        // Draw headers on new page
        doc.fillColor('white').fontSize(10).font(fonts.bold);
        headings.forEach((heading, i) => {
          let xOffset = xPos;
          for (let j = 0; j < i; j++) {
            xOffset += colWidths[j];
          }
          doc.text(heading, xOffset + 5, yPos + 13, {
            width: colWidths[i] - 10,
            align: 'center'
          });
        });

        yPos += 36;
      }

      // Draw alternating row background with more subtle colors
      const backgroundColor = rowIndex % 2 === 0 ? 'white' : colors.tableStripe;
      doc.rect(xPos, yPos, tableWidth, rowHeight)
        .fill(backgroundColor);

      // Draw cell data with improved typography and spacing
      doc.fillColor(colors.text);
      rowData.forEach((cell, i) => {
        let xOffset = xPos;
        for (let j = 0; j < i; j++) {
          xOffset += colWidths[j];
        }

        const cellText = String(cell || '');

        // Determine alignment based on content
        let align: 'left' | 'center' | 'right' = 'left';

        // Center for numbers, ratings and short content
        if (cellText.length < 5 || /^\d+(\.\d+)?$/.test(cellText) ||
          (i === 2 && (type === 'pharmacy-reviews' || type === 'employee-reviews'))) {
          align = 'center';
        }

        // Special case for status column in suggestions
        if (type === 'suggestions' && i === 3) {
          align = 'center';

          // Add a status badge-like appearance if it's the status column
          const statusBgColor = cellText === 'Traité' ? colors.success : colors.accent;
          const cellCenter = xOffset + colWidths[i] / 2;
          const badgeWidth = 60;

          // Draw status badge
          doc.roundedRect(cellCenter - badgeWidth / 2, yPos + (rowHeight / 2) - 8,
            badgeWidth, 16, 8)
            .fill(statusBgColor);

          // Draw status text in white
          doc.fillColor('white')
            .text(cellText, xOffset + 5, yPos + (rowHeight / 2) - 4, {
              width: colWidths[i] - 10,
              align: 'center'
            });

          // Reset fill color for next cells
          doc.fillColor(colors.text);
          return;
        }

        // Regular cell text
        doc.text(cellText, xOffset + 7, yPos + 7, {
          width: colWidths[i] - 14,
          align,
          lineBreak: true,
          height: rowHeight - 14 // Allow text to wrap within the cell with better padding
        });
      });

      // Draw horizontal divider between rows - more subtle than full grid
      doc.lineWidth(0.2).strokeColor(colors.border);
      doc.moveTo(xPos, yPos + rowHeight)
        .lineTo(xPos + tableWidth, yPos + rowHeight)
        .stroke();

      // Draw column separators - subtle vertical lines
      let xLine = xPos;
      for (let i = 1; i < colCount; i++) {
        xLine += colWidths[i - 1];
        doc.moveTo(xLine, yPos)
          .lineTo(xLine, yPos + rowHeight)
          .stroke();
      }

      yPos += rowHeight;
    });

    // Update doc.y to the correct position after the table
    doc.y = yPos + 20; // Add some space after the table
  }

  /**
   * Add professional summary section to PDF
   */
  private addSummarySection(
    doc: PDFKit.PDFDocument,
    data: any[],
    type: IReport['type'],
    colors: any,
    fonts: any,
    dateRange?: { start: Date; end: Date }
  ): void {
    // Ensure we have a valid Y position and add some gap after previous content
    const summaryStartY = (doc.y || 300) + 30;
    doc.y = summaryStartY;

    // Add container for summary section with subtle styling
    const summaryWidth = doc.page.width - 100;
    const estimatedHeight = 130; // Estimate height for the container

    // Add subtle background and border for summary section
    doc.roundedRect(40, summaryStartY, summaryWidth, estimatedHeight, 4)
      .lineWidth(0.5)
      .fillAndStroke('#F9FAFC', colors.border);

    // Add summary title with accent bar
    doc.rect(40, summaryStartY, 4, 24)
      .fill(colors.accent);

    doc.fontSize(16).font(fonts.title).fillColor(colors.primary)
      .text('RÉSUMÉ', 55, summaryStartY + 6);

    doc.moveTo(55, summaryStartY + 26)
      .lineTo(150, summaryStartY + 26)
      .lineWidth(1)
      .stroke(colors.border);

    // Start content a bit below the title
    const contentY = summaryStartY + 40;
    let currentY = contentY;

    // Add date range info with icon if provided
    if (dateRange) {
      const startDate = dateRange.start.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      const endDate = dateRange.end.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      // Add calendar icon
      doc.circle(55, currentY + 5, 4)
        .fill(colors.accent);

      doc.fontSize(10).font(fonts.bold).fillColor(colors.text)
        .text(`Période analysée: `, 65, currentY, { continued: true })
        .font(fonts.body)
        .text(`${startDate} au ${endDate}`);

      currentY += 20; // Move down after date range
    }

    // Create a two-column layout for summary stats
    const colWidth = (summaryWidth - 40) / 2;
    const col1X = 60;
    const col2X = col1X + colWidth + 20;

    // Add different summary stats based on report type with improved styling
    doc.fontSize(10).font(fonts.body).fillColor(colors.text);

    switch (type) {
      case 'employees':
        // Column 1
        this.drawSummaryStat(doc, col1X, currentY,
          'Nombre total d\'employés', data.length.toString(),
          colors.primary, fonts);

        // Column 2 - Add hire date range if available
        let earliestDate = new Date();
        let latestDate = new Date(2000, 0, 1);

        data.forEach(emp => {
          if (emp.hireDate) {
            const hireDate = new Date(emp.hireDate);
            if (hireDate < earliestDate) earliestDate = hireDate;
            if (hireDate > latestDate) latestDate = hireDate;
          }
        });

        if (latestDate > new Date(2000, 0, 1)) {
          const earliestFormatted = earliestDate.toLocaleDateString('fr-FR', {
            month: 'short',
            year: 'numeric'
          });
          const latestFormatted = latestDate.toLocaleDateString('fr-FR', {
            month: 'short',
            year: 'numeric'
          });

          this.drawSummaryStat(doc, col2X, currentY,
            'Période d\'embauche', `${earliestFormatted} - ${latestFormatted}`,
            colors.accent, fonts);
        }
        break;

      case 'clients':
        // Column 1
        this.drawSummaryStat(doc, col1X, currentY,
          'Nombre total de clients', data.length.toString(),
          colors.primary, fonts);

        // Column 2 - Get active clients (visited in last 3 months)
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        let activeClients = 0;
        data.forEach(client => {
          if (client.lastVisit) {
            const visitDate = new Date(client.lastVisit);
            if (visitDate >= threeMonthsAgo) activeClients++;
          }
        });

        this.drawSummaryStat(doc, col2X, currentY,
          'Clients actifs (3 mois)', activeClients.toString(),
          colors.accent, fonts);
        break;

      case 'pharmacy-reviews':
        const avgRating = this.calculateAverageRating(data);

        // Column 1
        this.drawSummaryStat(doc, col1X, currentY,
          'Nombre total d\'avis', data.length.toString(),
          colors.primary, fonts);

        // Move to next row
        currentY += 30;

        // Get positive ratings (4-5 stars)
        const positiveRatings = data.filter(item => {
          const rating = parseFloat(item.rating);
          return rating >= 4;
        }).length;

        // Calculate satisfaction rate
        const satisfactionRate = Math.round((positiveRatings / data.length) * 100);

        // Column 1, row 2
        this.drawSummaryStat(doc, col1X, currentY,
          'Note moyenne', `${avgRating}/5`,
          colors.accent, fonts);

        // Column 2, row 2
        this.drawSummaryStat(doc, col2X, currentY,
          'Taux de satisfaction', `${satisfactionRate}%`,
          satisfactionRate >= 75 ? colors.success : colors.warning, fonts);
        break;

      case 'employee-reviews':
      case 'specific-employee-reviews':
        const avgEmpRating = this.calculateAverageRating(data);

        // Column 1
        this.drawSummaryStat(doc, col1X, currentY,
          'Nombre total d\'avis', data.length.toString(),
          colors.primary, fonts);

        // Column 2
        this.drawSummaryStat(doc, col2X, currentY,
          'Note moyenne', `${avgEmpRating}/5`,
          parseFloat(avgEmpRating) >= 4 ? colors.success :
            (parseFloat(avgEmpRating) >= 3 ? colors.warning : colors.error),
          fonts);

        // For specific employee reviews, add more detailed stats
        if (type === 'specific-employee-reviews' && data.length > 0) {
          // Get employee name
          const employeeName = data[0].employee || '';

          currentY += 30;

          // Count comments
          const commentsCount = data.filter(item => item.comment && item.comment !== 'Aucun commentaire').length;

          // Draw stats
          this.drawSummaryStat(doc, col1X, currentY,
            'Employé évalué', employeeName,
            colors.text, fonts);

          this.drawSummaryStat(doc, col2X, currentY,
            'Avis avec commentaires', `${commentsCount}/${data.length}`,
            colors.accent, fonts);
        }
        break;

      case 'suggestions':
        // Column 1
        this.drawSummaryStat(doc, col1X, currentY,
          'Nombre total de suggestions', data.length.toString(),
          colors.primary, fonts);

        // Column 2 - Count processed vs new suggestions
        const processedSuggestions = data.filter(item => item.status === 'Traité').length;

        this.drawSummaryStat(doc, col2X, currentY,
          'Suggestions traitées', `${processedSuggestions}/${data.length}`,
          colors.accent, fonts);
        break;
    }

    // Add confidentiality notice with enhanced styling
    const noticeY = summaryStartY + estimatedHeight - 30;

    // Add document security icon
    doc.rect(50, noticeY, 12, 15)
      .lineWidth(0.5)
      .stroke(colors.lightText);

    // Add lock icon inside document
    doc.circle(56, noticeY + 7, 2)
      .fill(colors.lightText);

    doc.moveTo(56, noticeY + 7)
      .lineTo(56, noticeY + 10)
      .stroke(colors.lightText);

    doc.fontSize(8).font(fonts.italic).fillColor(colors.lightText)
      .text('DOCUMENT CONFIDENTIEL - Réservé à un usage interne. Ne pas diffuser sans autorisation.',
        70, noticeY + 4);
  }

  /**
   * Helper to draw a summary statistic with consistent styling
   */
  private drawSummaryStat(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    label: string,
    value: string,
    valueColor: string,
    fonts: any
  ): void {
    // Draw label
    doc.fontSize(9).font(fonts.body).fillColor('#6B7280')
      .text(label, x, y);

    // Draw value with emphasis
    doc.fontSize(16).font(fonts.bold).fillColor(valueColor)
      .text(value, x, y + 12);
  }

  /**
   * Calculate average rating from data array
   */
  private calculateAverageRating(data: any[]): string {
    if (!data || data.length === 0) return '0';

    let sum = 0;
    let count = 0;

    data.forEach(item => {
      const rating = parseFloat(item.rating);
      if (!isNaN(rating)) {
        sum += rating;
        count++;
      }
    });

    return count > 0 ? (sum / count).toFixed(1) : '0';
  }

  /**
   * Generate an Excel report using ExcelJS
   */
  private async generateExcelReport(
    filePath: string,
    reportName: string,
    data: any[],
    type: IReport['type'],
    dateRange?: { start: Date; end: Date }
  ): Promise<void> {
    try {
      // Create a new workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(reportName.substring(0, 31)); // Excel has 31 char limit for sheet names

      // Add title
      worksheet.mergeCells('A1:F1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = reportName;
      titleCell.font = { size: 16, bold: true };
      titleCell.alignment = { horizontal: 'center' };

      // Add date range if provided - always include this section with clear message
      worksheet.mergeCells('A2:F2');
      const dateRangeCell = worksheet.getCell('A2');

      if (dateRange) {
        const startDate = dateRange.start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
        const endDate = dateRange.end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
        dateRangeCell.value = `Période du rapport: ${startDate} au ${endDate}`;

        // Highlight the date range with a color fill
        dateRangeCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE8F4F4' } // Light cyan background
        };
      } else {
        dateRangeCell.value = 'Période: Toutes les données disponibles';
      }

      dateRangeCell.font = { size: 12, bold: true };
      dateRangeCell.alignment = { horizontal: 'center' };

      // Add generation date
      worksheet.mergeCells('A3:F3');
      const genDateCell = worksheet.getCell('A3');
      genDateCell.value = `Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`;
      genDateCell.font = { size: 10 };
      genDateCell.alignment = { horizontal: 'right' };

      // Add some space
      worksheet.addRow([]);

      // Add headers
      const headings = this.getReportHeadings(type);
      const headerRow = worksheet.addRow(headings);
      headerRow.font = { bold: true };

      // Style header row
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1C7B80' } // Primary color
        };
        cell.font = {
          bold: true,
          color: { argb: 'FFFFFFFF' } // White text
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle'
        };
      });

      // Add data rows
      for (const row of data) {
        const rowData = this.formatRowData(row, type);
        const excelRow = worksheet.addRow(rowData);

        // Style data rows
        excelRow.eachCell((cell, colNumber) => {
          // Add borders
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };

          // Align based on content
          if (typeof cell.value === 'number' || (typeof cell.value === 'string' && cell.value.length < 5)) {
            cell.alignment = { horizontal: 'center' };
          } else {
            cell.alignment = { horizontal: 'left', wrapText: true };
          }
        });
      }

      // Set column widths based on content type
      const columnWidths: Record<string, number[]> = {
        'employees': [20, 20, 35, 20, 20],
        'clients': [20, 20, 35, 20, 20],
        'pharmacy-reviews': [20, 10, 50, 20],
        'employee-reviews': [20, 20, 10, 40, 20],
        'specific-employee-reviews': [20, 20, 10, 40, 20],
        'suggestions': [20, 50, 20, 15]
      };

      // Apply column widths if available for this report type
      if (columnWidths[type] && worksheet.columns) {
        worksheet.columns.forEach((column, index) => {
          if (column && columnWidths[type][index]) {
            column.width = columnWidths[type][index];
          } else if (column) {
            // Default width for columns without specified width
            column.width = 20;
          }
        });
      }

      // Add footer
      const lastRow = worksheet.lastRow?.number ? worksheet.lastRow.number + 2 : 10;
      worksheet.mergeCells(`A${lastRow}:F${lastRow}`);
      const footerCell = worksheet.getCell(`A${lastRow}`);
      footerCell.value = 'Pharmacie Val d\'Oise - Rapport confidentiel';
      footerCell.font = { size: 8, italic: true };
      footerCell.alignment = { horizontal: 'center' };

      // Write the file
      await workbook.xlsx.writeFile(filePath);
    } catch (error) {
      logger.error('Error generating Excel report:', error);
      throw error;
    }
  }

  /**
   * Get headings for report based on type
   */
  private getReportHeadings(type: IReport['type']): string[] {
    switch (type) {
      case 'employees':
        return ['Nom', 'Prénom', 'Email', 'Poste', 'Date d\'embauche'];
      case 'clients':
        return ['Nom', 'Prénom', 'Email', 'Téléphone', 'Dernière visite'];
      case 'pharmacy-reviews':
        return ['Date', 'Note', 'Commentaire', 'Client'];
      case 'employee-reviews':
      case 'specific-employee-reviews':
        return ['Employé', 'Date', 'Note', 'Commentaire', 'Client'];
      case 'suggestions':
        return ['Date', 'Suggestion', 'Client', 'Statut'];
      default:
        return ['Nom', 'Description', 'Date'];
    }
  }

  /**
   * Format row data for table display
   */
  private formatRowData(row: any, type: IReport['type']): any[] {
    switch (type) {
      case 'employees':
        // Log what we're getting for debugging
        logger.debug(`Formatting employee row: ${JSON.stringify(row)}`);
        return [
          row.lastName || '-',
          row.firstName || '-',
          row.email || '-',
          row.position || '-',
          row.hireDate || '-'
        ];
      case 'clients':
        return [
          row.lastName || '-',
          row.firstName || '-',
          row.email || '-',
          row.phone || '-',
          row.lastVisit || '-'
        ];
      case 'pharmacy-reviews':
        return [
          row.date || '-',
          row.rating || '-',
          row.comment || '-',
          row.client || '-'
        ];
      case 'employee-reviews':
      case 'specific-employee-reviews':
        // Format employee name properly
        let employeeDisplay = '-';
        if (row.employee) {
          if (typeof row.employee === 'string') {
            employeeDisplay = row.employee;
          } else if (row.employee.firstName || row.employee.lastName) {
            employeeDisplay = `${row.employee.lastName || ''} ${row.employee.firstName || ''}`.trim();
          }
        }
        return [
          employeeDisplay,
          row.date || '-',
          row.rating || '-',
          row.comment || '-',
          row.client || '-'
        ];
      case 'suggestions':
        // Format suggestions data for the report
        return [
          row.date || '-',
          // For suggestion text, truncate if too long for better readability in reports
          (row.text && row.text.length > 100) ? `${row.text.substring(0, 97)}...` : (row.text || '-'),
          row.client || '-',
          row.status || '-'
        ];
      default:
        return [
          row.name || '-',
          row.description || '-',
          row.date || '-'
        ];
    }
  }

  /**
   * Get sample data for report based on type
   */
  private async getReportData(type: IReport['type'], dateRange?: { start: Date; end: Date }, employeeId?: string): Promise<any[]> {
    // In a production environment, we only return real data from the database

    switch (type) {
      case 'employees': {
        // Try to get real employee data
        try {
          logger.info('Fetching employee data for report');
          const employees = await userService.getAllEmployees();

          logger.info(`Retrieved ${employees?.length || 0} employees from database`);

          if (employees && employees.length > 0) {
            // Map the employee data to the format expected by the report
            const formattedEmployees = employees.map(emp => {
              // Use position entity title if available, fallback to deprecated currentPosition
              const positionTitle = (emp.position as any)?.title || emp.currentPosition || 'Employé';

              const formattedEmp = {
                id: emp._id?.toString() || '',
                firstName: emp.firstName || '',
                lastName: emp.lastName || '',
                email: emp.email || '',
                position: positionTitle,
                hireDate: emp.createdAt ? new Date(emp.createdAt).toLocaleDateString('fr-FR') : ''
              };

              // Log each employee for debugging
              logger.debug(`Formatted employee for report: ${JSON.stringify(formattedEmp)}`);

              return formattedEmp;
            });

            // Filter by date range if provided (using createdAt/hireDate)
            let filteredEmployees = formattedEmployees;
            if (dateRange) {
              filteredEmployees = formattedEmployees.filter(emp => {
                if (!emp.hireDate) return false;
                const hireDate = new Date(emp.hireDate.split('/').reverse().join('-'));
                return hireDate >= dateRange.start && hireDate <= dateRange.end;
              });
              logger.info(`Filtered employees by date range: ${filteredEmployees.length} of ${formattedEmployees.length}`);
            }

            logger.info(`Returning ${filteredEmployees.length} formatted employees for report`);
            return filteredEmployees;
          } else {
            logger.warn('No employees found in database, returning empty dataset');
            return [];
          }
        } catch (error) {
          logger.error('Error getting employee data:', error);
          return [];
        }
      }

      case 'clients': {
        // Use the built-in client list method from feedback session service
        try {
          logger.info('Fetching real client data from feedback sessions');

          // Get all clients - use a large limit to get all clients
          const { clients: feedbackClients, total } = await feedbackSessionService.getClientsList(1, 1000);

          logger.info(`Retrieved ${feedbackClients.length} clients from feedback sessions (total: ${total})`);

          if (feedbackClients && feedbackClients.length > 0) {
            // Format the client data for the report with date filtering
            let formattedClients = feedbackClients.map(client => {
              // Format the last visit date
              let lastVisit = '-';
              let lastVisitDate = null;

              if (client.lastVisit) {
                try {
                  const visitDate = new Date(client.lastVisit);
                  lastVisit = visitDate.toLocaleDateString('fr-FR');
                  lastVisitDate = visitDate;
                } catch (e) {
                  // Invalid date
                }
              }

              // Create client object with all needed data
              return {
                id: client.id || client.sessionId || '',
                firstName: client.firstName || '-',
                lastName: client.lastName || '-',
                email: client.email || '-',
                phone: client.phone || '-',
                lastVisit,
                _lastVisitDate: lastVisitDate // Temporary field for filtering
              };
            });

            // Filter out incomplete client records
            formattedClients = formattedClients.filter(client => {
              // Check if all fields except lastVisit are empty/default
              const hasOnlyLastVisit =
                client.firstName === '-' &&
                client.lastName === '-' &&
                client.email === '-' &&
                client.phone === '-' &&
                client.lastVisit !== '-';

              // Keep clients that have more than just lastVisit filled
              return !hasOnlyLastVisit;
            });

            // Apply date range filter if provided
            if (dateRange && dateRange.start && dateRange.end) {
              formattedClients = formattedClients.filter(client => {
                if (!client._lastVisitDate) return false;
                return client._lastVisitDate >= dateRange.start && client._lastVisitDate <= dateRange.end;
              });
              logger.info(`Filtered clients by date range: ${formattedClients.length} clients match the criteria`);
            }

            // Clean up the formatted client objects to remove temporary fields
            const finalClients = formattedClients.map(({ _lastVisitDate, ...client }) => client);

            logger.info(`Returning ${finalClients.length} formatted clients for report`);
            return finalClients;
          } else {
            logger.warn('No clients found in feedback sessions, returning empty dataset');
            return [];
          }
        } catch (error) {
          logger.error('Error getting client data from feedback sessions:', error);
          return [];
        }
      }

      case 'pharmacy-reviews': {
        // Try to get real feedback data
        try {
          // Use the getPharmacyRatings method instead of the non-existent getSessions method
          const timeFilter = 'all'; // Default to all time periods
          const ratingFilter = 'all'; // Default to all ratings

          // Adjust time filter based on date range if provided
          let adjustedTimeFilter = timeFilter;
          if (dateRange) {
            const now = new Date();
            const diffDays = Math.floor((now.getTime() - dateRange.start.getTime()) / (1000 * 3600 * 24));

            if (diffDays <= 30) {
              adjustedTimeFilter = '30days';
            } else if (diffDays <= 90) {
              adjustedTimeFilter = 'quarter';
            } else if (diffDays <= 180) {
              adjustedTimeFilter = 'semester';
            } else if (diffDays <= 365) {
              adjustedTimeFilter = 'year';
            }
            // For custom date ranges outside the predefined filters, we'll still use 'all'
          }

          const limit = 1000; // Get a large number of ratings to ensure comprehensive data
          const page = 1;

          const { ratings, total } = await feedbackSessionService.getPharmacyRatings(
            adjustedTimeFilter,
            page,
            limit,
            ratingFilter
          );

          if (ratings && ratings.length > 0) {
            // Format the ratings for the report
            const formattedRatings = ratings.map(rating => {
              // Convert date if needed
              let formattedDate = '';
              if (rating.date) {
                try {
                  formattedDate = new Date(rating.date).toLocaleDateString('fr-FR');
                } catch (e) {
                  formattedDate = '-';
                }
              }

              return {
                id: rating.id || rating.sessionId || '',
                date: formattedDate,
                rating: rating.rating?.toString() || 'N/A',
                comment: rating.comment || 'Aucun commentaire',
                client: rating.client?.name || 'Client anonyme'
              };
            });

            // Filter by date range if provided and if we couldn't use a predefined filter
            let filteredRatings = formattedRatings;
            if (dateRange && adjustedTimeFilter === 'all') {
              filteredRatings = formattedRatings.filter(rating => {
                if (!rating.date || rating.date === '-') return false;

                const ratingDate = new Date(rating.date.split('/').reverse().join('-'));
                return ratingDate >= dateRange.start && ratingDate <= dateRange.end;
              });

              logger.info(`Filtered pharmacy ratings by custom date range: ${filteredRatings.length} of ${formattedRatings.length}`);
            }

            return filteredRatings;
          }

          logger.warn('No pharmacy reviews found, returning empty dataset');
          return [];
        } catch (error) {
          logger.error('Error getting real feedback data:', error);
          return [];
        }
      }

      case 'employee-reviews':
      case 'specific-employee-reviews': {
        // Try to get real employee review data
        try {
          // Use the getEmployeeRatings method instead of the non-existent getSessions method
          const limit = 1000; // Get a large number of ratings
          const page = 1;

          // Use employee ID if this is a specific employee report
          const targetEmployeeId = type === 'specific-employee-reviews' ? employeeId : undefined;

          const { ratings, total } = await feedbackSessionService.getEmployeeRatings(
            targetEmployeeId,
            page,
            limit
          );

          if (ratings && ratings.length > 0) {
            // Format the ratings for the report
            const formattedRatings = ratings.map(rating => {
              // Convert date if needed
              let formattedDate = '';
              if (rating.date) {
                try {
                  formattedDate = new Date(rating.date).toLocaleDateString('fr-FR');
                } catch (e) {
                  formattedDate = '-';
                }
              }

              // Use the pre-formatted employeeName if available, otherwise format it here
              let employeeName;
              if (rating.employeeName) {
                employeeName = rating.employeeName;
              } else if (rating.employee) {
                employeeName = `${rating.employee.lastName || ''} ${rating.employee.firstName || ''}`.trim();
              } else {
                employeeName = 'N/A';
              }

              return {
                id: rating.id || rating.sessionId || '',
                employee: employeeName,
                date: formattedDate,
                rating: rating.rating?.toString() || 'N/A',
                comment: rating.comment || 'Aucun commentaire',
                client: rating.clientName || 'Client anonyme'
              };
            });

            // Filter by date range if provided
            let filteredRatings = formattedRatings;
            if (dateRange && dateRange.start && dateRange.end) {
              filteredRatings = formattedRatings.filter(rating => {
                if (!rating.date || rating.date === '-') return false;

                const ratingDate = new Date(rating.date.split('/').reverse().join('-'));
                return ratingDate >= dateRange.start && ratingDate <= dateRange.end;
              });

              logger.info(`Filtered employee ratings by date range: ${filteredRatings.length} of ${formattedRatings.length}`);
            }

            return filteredRatings;
          }

          logger.warn('No employee reviews found, returning empty dataset');
          return [];
        } catch (error) {
          logger.error('Error getting real employee review data:', error);
          return [];
        }
      }

      case 'suggestions': {
        try {
          logger.info('Fetching suggestions data for report');

          // Use our new getSuggestions method with a large limit to get all suggestions
          const limit = 1000; // Get a large number of suggestions
          const page = 1;

          const { suggestions, total } = await feedbackSessionService.getSuggestions(
            page,
            limit,
            dateRange
          );

          if (suggestions && suggestions.length > 0) {
            // Format the suggestions for the report
            const formattedSuggestions = suggestions.map(suggestion => {
              // Convert date if needed
              let formattedDate = '';
              if (suggestion.date) {
                try {
                  formattedDate = new Date(suggestion.date).toLocaleDateString('fr-FR');
                } catch (e) {
                  formattedDate = '-';
                }
              }

              return {
                id: suggestion.id || suggestion.sessionId || '',
                date: formattedDate,
                text: suggestion.text || 'Aucune suggestion fournie',
                client: suggestion.client || 'Client anonyme',
                status: suggestion.status || 'Nouveau'
              };
            });

            logger.info(`Found ${formattedSuggestions.length} suggestions for report`);
            return formattedSuggestions;
          }

          logger.warn('No suggestions found, returning empty dataset');
          return [];
        } catch (error) {
          logger.error('Error getting suggestions data for report:', error);
          return [];
        }
      }

      default:
        logger.warn(`Unknown report type: ${type}, returning empty dataset`);
        return [];
    }
  }

  /**
   * Increment download count for a report
   */
  async incrementDownloadCount(reportId: string) {
    const report = await this.model.findById(reportId);
    if (report) {
      await report.incrementDownloadCount();
    }
    return report;
  }

  /**
 * Get a report by ID
 */
  async getReportById(reportId: string) {
    try {
      const report = await this.model.findById(reportId);
      return report;
    } catch (error) {
      logger.error('Error getting report by ID:', error);
      return null;
    }
  }

  /**
   * Get all available report types
   */
  getAvailableReportTypes() {
    return [
      {
        id: "employees",
        name: "Liste des employés",
        description: "Exportation complète des données des employés",
        iconType: "employees",
        formats: ["PDF", "EXCEL"]
      },
      {
        id: "clients",
        name: "Liste des clients",
        description: "Exportation complète des données clients",
        iconType: "clients",
        formats: ["PDF", "EXCEL"]
      },
      {
        id: "pharmacy-reviews",
        name: "Avis clients pour la pharmacie",
        description: "Tous les avis clients concernant la pharmacie",
        iconType: "pharmacy-reviews",
        formats: ["PDF", "EXCEL"]
      },
      {
        id: "employee-reviews",
        name: "Avis clients pour tous les employés",
        description: "Tous les avis clients concernant les employés",
        iconType: "employee-reviews",
        formats: ["PDF", "EXCEL"]
      },
      {
        id: "specific-employee-reviews",
        name: "Avis clients pour un employé spécifique",
        description: "Avis clients pour un employé en particulier",
        iconType: "specific-employee-reviews",
        formats: ["PDF", "EXCEL"],
        requiresEmployeeSelection: true
      },
      {
        id: "suggestions",
        name: "Liste des suggestions des clients",
        description: "Toutes les suggestions faites par les clients",
        iconType: "suggestions",
        formats: ["PDF", "EXCEL"]
      },
    ];
  }

  /**
   * Get a formatted report name based on type and date range
   */
  async getReportName(type: IReport['type'], employeeId?: string, dateRange?: { start: Date; end: Date }) {
    const date = new Date();
    const formattedDate = `${date.toLocaleString('fr-FR', { month: 'long' })} ${date.getFullYear()}`;

    // Format date range if provided
    let dateRangePart = '';
    if (dateRange && dateRange.start && dateRange.end) {
      const start = dateRange.start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
      const end = dateRange.end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
      dateRangePart = ` (${start} - ${end})`;
    }

    let name = '';
    switch (type) {
      case 'employees':
        name = `Liste des employés${dateRangePart} - ${formattedDate}`;
        break;
      case 'clients':
        name = `Liste des clients${dateRangePart} - ${formattedDate}`;
        break;
      case 'pharmacy-reviews':
        name = `Avis clients pour la pharmacie${dateRangePart} - ${formattedDate}`;
        break;
      case 'employee-reviews':
        name = `Avis clients pour tous les employés${dateRangePart} - ${formattedDate}`;
        break;
      case 'specific-employee-reviews':
        // Fetch employee name to include in report title
        let employeeName = "";
        if (employeeId) {
          try {
            const employee = await userService.findById(employeeId);
            if (employee) {
              employeeName = `${employee.lastName} ${employee.firstName}`;
            }
          } catch (err) {
            logger.error('Error getting employee name for report title:', err);
          }
        }
        name = `Avis clients pour l'employé ${employeeName || employeeId || ""}${dateRangePart} - ${formattedDate}`;
        break;
      case 'suggestions':
        name = `Suggestions des clients${dateRangePart} - ${formattedDate}`;
        break;
      default:
        name = `Rapport${dateRangePart} - ${formattedDate}`;
    }

    return name;
  }

  /**
   * Generate a report for a given period
   */
  async generateReportForPeriod(periodType: string) {
    // Calculate date range based on period type
    const dateRange = this.getDateRangeForPeriod(periodType);

    // Generate reports for different types
    const reportTypes: IReport['type'][] = [
      'employees',
      'pharmacy-reviews',
      'employee-reviews'
    ];

    const reports = [];

    // Use admin user ID (in a real app, you would get this from your settings)
    const adminUserId = "655b37138a9d65c65c888888"; // Mock admin ID

    for (const type of reportTypes) {
      const report = await this.generateReport(
        type,
        'PDF',
        adminUserId,
        dateRange
      );
      reports.push(report);
    }

    return reports;
  }

  /**
   * Get date range for a period type
   */
  getDateRangeForPeriod(periodType: string): { start: Date; end: Date } {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (periodType) {
      case 'current-month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last-month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'current-quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), currentQuarter * 3, 1);
        end = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
        break;
      case 'last-quarter':
        const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
        const year = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
        const quarter = lastQuarter < 0 ? 3 : lastQuarter;
        start = new Date(year, quarter * 3, 1);
        end = new Date(year, (quarter + 1) * 3, 0);
        break;
      case 'current-year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      case 'last-year':
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31);
        break;
      default:
        // Default to current month
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    return { start, end };
  }
}

// Export singleton instance
export const reportService = ReportService.getInstance(); 
/*************************************************************************
 * Mock PDF Signing Server
 *
 * - Accepts PDF uploads (max 10MB, only PDF files)
 * - Rejects password-protected (encrypted) PDFs
 * - Stamps each page with a signature block on bottom-right
 * - Returns signed PDF for download
 * - Cleans up temporary files after use
 * - CORS enabled for frontend compatibility
 ************************************************************************/

const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");

const app = express();

// --- Multer setup for file uploads ---
// Store files in 'uploads/', limit to 10MB, accept PDFs only
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files are allowed."));
  },
});

// Enable CORS for cross-origin requests (from frontend)
app.use(cors());

// Helper to delete files safely, ignore errors
function cleanupFile(filepath) {
  fs.unlink(filepath, () => {});
}

/**
 * Signs the PDF by stamping every page's bottom-right corner with:
 * - "Signed by Mock Server"
 * - Current date/time with timezone
 * - Location info (customizable)
 *
 * Returns the path to the signed PDF file.
 */
async function signPdf(inputPath, originalName) {
  const data = fs.readFileSync(inputPath);
  const pdfDoc = await PDFDocument.load(data);

  if (pdfDoc.isEncrypted) {
    throw new Error("PDF is password protected");
  }

  // Prepare signature text
  const now = new Date();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const locale = "en-IN";
  const datetimeStr = now.toLocaleString(locale, { hour12: false, timeZone: timezone });

  const signatureText = "Signed by Mock Server";
  const datetimeText = `${datetimeStr} (${timezone})`;
  const locationText = "Location: Dublin, Ireland"; // Customize as needed

  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontSize = 13;
  const margin = 18;

  pdfDoc.getPages().forEach((page) => {
    const { width } = page.getSize();

    // Calculate widest signature line for alignment
    const maxWidth = Math.max(
      font.widthOfTextAtSize(signatureText, fontSize),
      font.widthOfTextAtSize(datetimeText, fontSize),
      font.widthOfTextAtSize(locationText, fontSize)
    );

    const x = width - margin - maxWidth;
    const yPositions = [44, 30, 16]; // Top to bottom for 3 lines

    page.drawText(signatureText, { x, y: yPositions[0], size: fontSize, font, color: rgb(0.12, 0.55, 0.11), opacity: 0.98 });
    page.drawText(datetimeText, { x, y: yPositions[1], size: fontSize, font, color: rgb(0.12, 0.55, 0.11), opacity: 0.98 });
    page.drawText(locationText, { x, y: yPositions[2], size: fontSize, font, color: rgb(0.12, 0.55, 0.11), opacity: 0.98 });
  });

  const signedBytes = await pdfDoc.save();
  const safeName = originalName.replace(/[^a-zA-Z0-9.]/g, "_");
  const signedPath = path.join("uploads", `signed-${Date.now()}-${safeName}`);

  fs.writeFileSync(signedPath, signedBytes);
  return signedPath;
}

// --- Route to receive PDF upload and return signed PDF ---
app.post(
  "/sign",

  // Handle file upload and multer errors
  (req, res, next) => {
    upload.single("pdf")(req, res, (err) => {
      if (err) {
        // File size exceeded
        if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ error: "File size exceeds 10MB limit." });
        }
        // Other multer/file filter errors
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },

  // Main processing handler
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    // Validate extension as extra safety
    if (path.extname(req.file.originalname).toLowerCase() !== ".pdf") {
      cleanupFile(req.file.path);
      return res.status(400).json({ error: "Only PDF files are allowed." });
    }

    try {
      const signedPath = await signPdf(req.file.path, req.file.originalname);

      // Send signed PDF as downloadable file
      res.download(signedPath, `signed-${req.file.originalname}`, (err) => {
        cleanupFile(req.file.path);
        cleanupFile(signedPath);
        if (err) console.error("Error sending signed PDF:", err);
      });
    } catch (error) {
      cleanupFile(req.file.path);

      if (error.message.toLowerCase().includes("password")) {
        return res.status(415).json({ error: "PDF is password protected. Please remove the password and try again." });
      }

      console.error("Unexpected signing error:", error);
      res.status(500).json({ error: "Signing failed: " + error.message });
    }
  }
);

// Global error handler (last resort)
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Unexpected server error." });
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`PDF Signing Server running at http://localhost:${PORT}`);
});

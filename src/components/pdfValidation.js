import { PDFDocument } from "pdf-lib";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const isPdf = (file) => file.type === "application/pdf";

export async function validateFile(file) {
  if (!file) return { valid: false, message: "No file provided." };

  if (!isPdf(file)) {
    return { valid: false, message: "Only PDF files are allowed." };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, message: "File size exceeds 10 MB limit." };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    await PDFDocument.load(arrayBuffer);
  } catch (err) {
    if (err.message && (err.message.toLowerCase().includes("encrypted") || err.message.toLowerCase().includes("password"))) {
      return { valid: false, message: "File is password protected. Remove the password and try again." };
    }
    return { valid: false, message: `Unable to read PDF: ${err.message}` };
  }

  return { valid: true, message: "" };
}

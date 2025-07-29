// src/App.js
import React, { useState, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { PDFDocument } from "pdf-lib";
import LoaderOverlay from "./LoaderOverlay";
import { FiUploadCloud } from "react-icons/fi";
import "../styles/MainPage.css"; // Import your styles

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const SIGN_ENDPOINT = "http://localhost:4000/sign";

const STEPS = ["Upload", "Preview", "Sign", "Done"];

const isPdf = (file) => file.type === "application/pdf";

export default function MainPage() {
  // --- step state ---
  // currentStep is one of 'upload', 'preview', 'signing', 'done'
  const [currentStep, setCurrentStep] = useState("upload");

  const [file, setFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [signedUrl, setSignedUrl] = useState(null);

  const [uploading, setUploading] = useState(false); // flag for initial file upload
  const [loadingMessage, setLoadingMessage] = useState(""); // loader overlay message during signing
  const [fileValidationMessage, setFileValidationMessage] = useState("");


  // Cleanup object URLs on unmount or change
  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
      if (signedUrl) URL.revokeObjectURL(signedUrl);
    };
  }, [filePreviewUrl, signedUrl]);

  // Create preview URL for selected file
  useEffect(() => {
    if (!file) {
      setFilePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setFilePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Validate the file on selection
  async function validateFile(pickedFile) {
    if (!pickedFile) return false;

    if (!isPdf(pickedFile)) {
      const msg = "Only PDF files are allowed.";
      setFileValidationMessage(msg);
      toast.error(msg);
      return false;
    }

    if (pickedFile.size > MAX_FILE_SIZE_BYTES) {
      const msg = `File size exceeds ${MAX_FILE_SIZE_MB} MB limit.`;
      setFileValidationMessage(msg);
      toast.error(msg);
      return false;
    }

    try {
      const arrayBuffer = await pickedFile.arrayBuffer();
      await PDFDocument.load(arrayBuffer);
    } catch (err) {
      if (
        err.message &&
        (err.message.toLowerCase().includes("encrypted") ||
          err.message.toLowerCase().includes("password"))
      ) {
        const msg = "File is password protected. Remove the password and try again.";
        setFileValidationMessage(msg);
        toast.warning(msg);
        return false;
      }
      const msg = `Unable to read PDF: ${err.message}`;
      setFileValidationMessage(msg);
      toast.error(msg);
      return false;
    }

    setFileValidationMessage("");
    return true;
  }

  // onDrop handler for react-dropzone
  const onDrop = useCallback(
    async (acceptedFiles, rejectedFiles) => {
      if (loadingMessage || uploading) return;

      if (rejectedFiles.length > 0 || acceptedFiles.length === 0) {
        toast.error("File type or size not supported. Please upload a PDF ≤ 10MB.");
        setFileValidationMessage("");
        return;
      }

      const pickedFile = acceptedFiles[0];

      resetAll();

      setUploading(true);

      const isValid = await validateFile(pickedFile);

      if (!isValid) {
        setUploading(false);
        return;
      }

      setFile(pickedFile);
      setUploading(false);
      setCurrentStep("preview");
    },
    [loadingMessage, uploading]
  );

  // Dropzone setup
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [] },
    multiple: false,
    maxSize: MAX_FILE_SIZE_BYTES,
    onDrop,
    disabled: loadingMessage !== "" || uploading,
  });

  // Reset all app state to initial
  function resetAll() {
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    if (signedUrl) URL.revokeObjectURL(signedUrl);
    setFile(null);
    setFilePreviewUrl(null);
    setSignedUrl(null);
    setUploading(false);
    setLoadingMessage("");
    setFileValidationMessage("");
    setCurrentStep("upload");
  }

  // Helper wrapper to set loading message around async actions
  async function withLoading(message, fn) {
    setLoadingMessage(message);
    try {
      await fn();
    } finally {
      setLoadingMessage("");
    }
  }

  // Handle signing the PDF
  async function handleUpload() {
  if (!file) { toast.error("Please select a valid PDF before signing."); return; }

  setCurrentStep("signing");

  await withLoading("Signing document...", async () => {
    try {
      const formData = new FormData();
      formData.append("pdf", file);

      const response = await fetch(SIGN_ENDPOINT, { method: "POST", body: formData });

      if (!response.ok) {
        // Display toast and go back to preview
        toast.error("Signing failed. Please try again after some time.");
        setCurrentStep("preview");
        return;
      }

      const blob = await response.blob();
      setLoadingMessage("Loading signed document...");
      const url = URL.createObjectURL(blob);
      setSignedUrl(url);
      setCurrentStep("done");
      toast.success("PDF signed successfully!");
    } catch (error) {
      // For network/unknown errors:
      toast.error("Signing failed. Please try again after some time.");
      setCurrentStep("preview");
    }
  });

  setLoadingMessage("");
}


  // Handle server errors during upload/signing
  function handleServerError(response) {
    if (response.status === 413) {
      toast.error(`Upload failed: File exceeds ${MAX_FILE_SIZE_MB} MB.`);
    } else if (response.status === 415) {
      toast.warning("Upload failed: PDF is password protected. Remove password.");
    } else {
      toast.error(`Upload failed: HTTP ${response.status || "Unknown error"}`);
    }
    resetAll();
  }

  // Navigate back through steps
  function handleBack() {
    if (loadingMessage || uploading) return;
    switch (currentStep) {
      case "preview":
        setCurrentStep("upload");
        break;
      case "signing":
        setCurrentStep("preview");
        break;
      case "done":
        setCurrentStep("signing");
        break;
      default:
        break;
    }
  }

  // Download the signed PDF
  function handleDownload() {
    if (!signedUrl || !file) return;
    const a = document.createElement("a");
    a.href = signedUrl;
    a.download = `signed-${file.name}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // Handle iframe errors on PDF load
  function onIframeError() {
    toast.error("Failed to load PDF.");
    resetAll();
  }

  // Step to index mapping
  function stepIdx(step) {
    switch (step) {
      case "upload": return 0;
      case "preview": return 1;
      case "signing": return 2;
      case "done": return 3;
      default: return 0;
    }
  }
  const currentStepIndex = stepIdx(currentStep);
  const isBusy = uploading || loadingMessage !== "";

  return (
    <div className="main-wrapper">
      <div className="container" role="main">
        {/* Title */}
        <h1>PDF Signer</h1>

        {/* Step Progress Bar with Connectors */}
        <nav aria-label="Progress" className="stepper">
          {STEPS.map((label, idx) => (
            <React.Fragment key={label}>
              <div
                className={`step ${
                  idx === currentStepIndex ? "active" : idx < currentStepIndex ? "completed" : ""
                }`}
                role="button"
                tabIndex={0}
                aria-current={idx === currentStepIndex ? "step" : undefined}
                aria-disabled={idx > currentStepIndex}
                onClick={() => {
                  if (idx < currentStepIndex) {
                    if (idx === 0) resetAll();
                    else if (idx === 1) setCurrentStep("preview");
                    else if (idx === 2) setCurrentStep("signing");
                  }
                }}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && idx < currentStepIndex) {
                    if (idx === 0) resetAll();
                    else if (idx === 1) setCurrentStep("preview");
                    else if (idx === 2) setCurrentStep("signing");
                  }
                }}
              >
                <div className="step-circle">{idx + 1}</div>
                <div className="step-label">{label}</div>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`step-connector${idx < currentStepIndex ? " completed" : ""}`}
                  aria-hidden="true"
                ></div>
              )}
            </React.Fragment>
          ))}
        </nav>

        {/* Back Button */}
        {currentStep !== "upload" &&  currentStep !== "done" && (
          <button className="back-button" onClick={handleBack} disabled={isBusy}>
            ← Back
          </button>
        )}

        {/* Upload Step with Instructions */}
        {currentStep === "upload" && (
          <>
            <div className="instructions" aria-live="polite" style={{ marginBottom: "1rem", fontWeight: "600" }}>
              <p><strong>Accepted File Format:</strong> PDF only</p>
              <p><strong>Maximum File Size:</strong> {MAX_FILE_SIZE_MB} MB</p>
              <p><strong>Note:</strong> Password protected or encrypted PDFs are <em>not accepted</em>.</p>
            </div>

            <div
              {...getRootProps()}
              className={`dropzone${isDragActive ? " active" : ""}${isBusy ? " disabled" : ""}`}
              aria-label="Upload PDF zone"
              tabIndex={0}
              aria-disabled={isBusy}
            >
              <input {...getInputProps()} disabled={isBusy} />
              <FiUploadCloud className="upload-icon" aria-hidden="true" />
              <p>{isDragActive ? "Drop the PDF here…" : "Drag & drop a PDF or click to select"}</p>
              <p className="help" aria-live="polite">
                Accepted file type: PDF. Max size: {MAX_FILE_SIZE_MB} MB.<br />
                Password protected PDFs are not supported.
              </p>
            </div>

            {fileValidationMessage && <p className="validation-error">{fileValidationMessage}</p>}
          </>
        )}

        {/* Preview Step */}
        {currentStep === "preview" && file && !uploading && (
          <>
            <p className="file-info" aria-live="polite">
              Selected File: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
            <div className="pdf-preview-container">
              <iframe
                src={`${filePreviewUrl}#toolbar=0`}
                title={`Preview of ${file.name}`}
                aria-label="PDF Preview"
                style={{ width: "100%", height: 400, border: "1px solid #ccc", borderRadius: 6 }}
                onError={onIframeError}
              />
            </div>
            <div className="actions">
              <button onClick={handleUpload} disabled={isBusy}>Sign PDF</button>
              <button onClick={resetAll} disabled={isBusy}>Remove File</button>
            </div>
            {fileValidationMessage && <p className="validation-error">{fileValidationMessage}</p>}
            <p className="help" style={{ marginTop: 16, color: "#666" }}>
              If this isn't the correct file, remove it and select another.
            </p>
          </>
        )}

        {/* Signing Step */}
        {(currentStep === "signing" || loadingMessage !== "") && (
          <LoaderOverlay visible={true} message={loadingMessage || "Signing document..."} />
        )}

        {/* Done Step */}
        {currentStep === "done" && signedUrl && (
          <>
            <div className="pdf-viewer">
              <iframe
                src={`${signedUrl}#toolbar=0`}
                title="Signed PDF Preview"
                aria-label="Signed PDF"
                style={{ width: "100%", height: "80vh", border: "none" }}
                onError={onIframeError}
              />
            </div>
            <div className="actions">
              <button onClick={handleDownload}>Download PDF</button>
              <button onClick={resetAll}>New Upload</button>
            </div>
          </>
        )}

        {/* Toast notifications */}
         <ToastContainer
          position="top-right"
          autoClose={4000}
          newestOnTop
          closeOnClick
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </div>
    </div>
  );
}

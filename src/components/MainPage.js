
import React, { useState, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import LoaderOverlay from "./LoaderOverlay";
import { FiUploadCloud } from "react-icons/fi";
import PdfPreview from "./PdfPreview";
import { validateFile } from "./pdfValidation";
import { signPdfFile } from "../serverCode/pdfService";
import "../styles/MainPage.css";

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const STEPS = ["Upload", "Preview", "Sign", "Done"];

export default function MainPage() {
  const [currentStep, setCurrentStep] = useState("upload");

  const [file, setFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [signedUrl, setSignedUrl] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [fileValidationMessage, setFileValidationMessage] = useState("");

  // Cleanup URLs on change/unmount
  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
      if (signedUrl) URL.revokeObjectURL(signedUrl);
    };
  }, [filePreviewUrl, signedUrl]);

  // Generate preview URL on file change
  useEffect(() => {
    if (!file) {
      setFilePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setFilePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Dropzone onDrop handler
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

      const { valid, message } = await validateFile(pickedFile);

      if (!valid) {
        setFileValidationMessage(message);
        if (message.includes("password")) {
          toast.warning(message);
        } else {
          toast.error(message);
        }
        setUploading(false);
        return;
      }

      setFileValidationMessage("");
      setFile(pickedFile);
      setUploading(false);
      setCurrentStep("preview");
    },
    [loadingMessage, uploading]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [] },
    multiple: false,
    maxSize: MAX_FILE_SIZE_BYTES,
    onDrop,
    disabled: loadingMessage !== "" || uploading,
  });

  // Reset app state
  const resetAll = useCallback(() => {
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    if (signedUrl) URL.revokeObjectURL(signedUrl);
    setFile(null);
    setFilePreviewUrl(null);
    setSignedUrl(null);
    setUploading(false);
    setLoadingMessage("");
    setFileValidationMessage("");
    setCurrentStep("upload");
  }, [filePreviewUrl, signedUrl]);

  // Helper to wrap async actions with loading message
  async function withLoading(message, fn) {
    setLoadingMessage(message);
    try {
      await fn();
    } finally {
      setLoadingMessage("");
    }
  }

  // Handle "Sign PDF" button click
  async function handleUpload() {
    if (!file) {
      toast.error("Please select a valid PDF before signing.");
      return;
    }

    setCurrentStep("signing");

    await withLoading("Signing document...", async () => {
      try {
        const signedBlob = await signPdfFile(file);

        setLoadingMessage("Loading signed document...");
        const url = URL.createObjectURL(signedBlob);
        setSignedUrl(url);
        setCurrentStep("done");
        toast.success("PDF signed successfully!");
      } catch (error) {
        toast.error("Signing failed. Please try again later.");
        setCurrentStep("preview");
      }
    });
  }

  // Back button handler
  function handleBack() {
    if (loadingMessage || uploading) return;
    if (currentStep === "preview") setCurrentStep("upload");
    else if (currentStep === "signing") setCurrentStep("preview");
    else if (currentStep === "done") setCurrentStep("signing");
  }

  // Download signed PDF file
  function handleDownload() {
    if (!signedUrl || !file) return;
    const a = document.createElement("a");
    a.href = signedUrl;
    a.download = `signed-${file.name}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function stepLabelToKey(label) {
    switch (label.toLowerCase()) {
      case "upload":
        return "upload";
      case "preview":
        return "preview";
      case "sign":
        return "signing";
      case "done":
        return "done";
      default:
        return "upload";
    }
  }

  // Helper to get step index from currentStep string
  function stepIdx(step) {
    switch (step) {
      case "upload":
        return 0;
      case "preview":
        return 1;
      case "signing":
        return 2;
      case "done":
        return 3;
      default:
        return 0;
    }
  }
  const currentStepIndex = stepIdx(currentStep);
  const isBusy = uploading || loadingMessage !== "";

  return (
    <div className="main-wrapper">
      <div className="container" role="main">
        <h1>PDF Signer</h1>

        {/* Stepper */}
        <nav aria-label="Progress" className="stepper">
          {STEPS.map((label, idx) => {
            const isActive = idx === currentStepIndex;
            const isCompleted = idx < currentStepIndex;
            const isDone = currentStep === "done";
            const isDisabled = isDone && idx < currentStepIndex;

            return (
              <React.Fragment key={label}>
                <div
                  className={`step ${isActive ? "active" : isCompleted ? "completed" : ""} ${
                    isDisabled ? "disabled" : ""
                  }`}
                  role="button"
                  tabIndex={isDisabled ? -1 : 0}
                  aria-disabled={isDisabled || idx > currentStepIndex}
                  aria-current={isActive ? "step" : undefined}
                  onClick={() => {
                    if (isDisabled) return;
                    if (idx < currentStepIndex) {
                      if (idx === 0) resetAll();
                      else if (idx === 1) setCurrentStep("preview");
                      else if (idx === 2) setCurrentStep("signing");
                    }
                  }}
                  onKeyDown={event => {
                    if (isDisabled) return;
                    if (["Enter", " "].includes(event.key) && idx < currentStepIndex) {
                      if (idx === 0) resetAll();
                      else if (idx === 1) setCurrentStep("preview");
                      else if (idx === 2) setCurrentStep("signing");
                    }
                  }}
                  style={{
                    cursor: isDisabled ? "default" : "pointer",
                    pointerEvents: isDisabled ? "none" : "auto",
                  }}
                >
                  <div className="step-circle">{idx + 1}</div>
                  <div className="step-label">{label}</div>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`step-connector${isCompleted ? " completed" : ""}`} aria-hidden="true" />
                )}
              </React.Fragment>
            );
          })}
        </nav>

        {/* Back button */}
        {currentStep !== "upload" && currentStep !== "done" && (
          <button className="back-button" onClick={handleBack} disabled={isBusy}>
            ← Back
          </button>
        )}

        {/* Upload step */}
        {currentStep === "upload" && (
          <>
            <div className="instructions" aria-live="polite" style={{ marginBottom: "1rem", fontWeight: "600" }}>
              <p>
                <strong>Accepted File Format:</strong> PDF only
              </p>
              <p>
                <strong>Maximum File Size:</strong> {MAX_FILE_SIZE_MB} MB
              </p>
              <p>
                <strong>Note:</strong> Password protected or encrypted PDFs are <em>not accepted</em>.
              </p>
            </div>
            <div
              {...getRootProps()}
              className={`dropzone${isDragActive ? " active" : ""}${isBusy ? " disabled" : ""}`}
              aria-label="Upload PDF zone"
              tabIndex={0}
              aria-disabled={isBusy}
            >
              <input {...getInputProps()} id="file-upload" data-testid="file-upload" disabled={isBusy} />
              <FiUploadCloud className="upload-icon" aria-hidden="true" />
              <p>{isDragActive ? "Drop the PDF here…" : "Drag & drop a PDF or click to select"}</p>
              <p className="help" aria-live="polite">
                Accepted file type: PDF. Max size: {MAX_FILE_SIZE_MB} MB.
                <br />
                Password protected PDFs are not supported.
              </p>
            </div>
            {fileValidationMessage && <p className="validation-error">{fileValidationMessage}</p>}
          </>
        )}

        {/* Preview step */}
        {currentStep === "preview" && file && !uploading && (
          <>
            <p className="file-info" aria-live="polite">
              Selected File: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
            <div className="pdf-preview">
              <PdfPreview url={filePreviewUrl} />
            </div>
            <div className="actions">
              <button onClick={handleUpload} disabled={isBusy}>
                Sign PDF
              </button>
              <button onClick={resetAll} disabled={isBusy}>
                Remove File
              </button>
            </div>
            {fileValidationMessage && <p className="validation-error">{fileValidationMessage}</p>}
            <p className="help" style={{ marginTop: 16, color: "#666" }}>
              If this isn't the correct file, remove it and select another.
            </p>
          </>
        )}

        {/* Signing step */}
        {(currentStep === "signing" || loadingMessage) && (
          <LoaderOverlay visible={true} message={loadingMessage || "Signing document..."} />
        )}

        {/* Done step */}
        {currentStep === "done" && signedUrl && (
          <>
            <div className="pdf-preview">
              <PdfPreview url={signedUrl} />
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

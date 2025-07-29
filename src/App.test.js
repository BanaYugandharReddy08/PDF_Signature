// src/App.test.js
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PDFDocument } from "pdf-lib";
import App from "./App";

// Mock pdf-lib's PDFDocument.load to bypass real parsing in tests
jest.mock("pdf-lib", () => ({
  PDFDocument: {
    load: jest.fn(),
  },
}));

beforeAll(() => {
  global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
  global.URL.revokeObjectURL = jest.fn();
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe("PDF Signing App - Basic Tests", () => {
  beforeEach(() => {
    // Reset the mock before each test
    PDFDocument.load.mockClear();
    // By default, resolve load to simulate a non-protected PDF
    PDFDocument.load.mockResolvedValue({});
  });

  test("renders initial upload UI and instructions", () => {
    render(<App />);
    expect(screen.getByText(/Accepted file type/i)).toBeInTheDocument();
    expect(screen.getByText(/Maximum file size/i)).toBeInTheDocument();
    expect(screen.getByText(/Passworded or encrypted/i)).toBeInTheDocument();
    expect(screen.getByText(/Drag and drop/i)).toBeInTheDocument();
    expect(screen.queryByText(/Selected file/i)).not.toBeInTheDocument();
  });

  test("upload valid PDF shows preview and enables sign button", async () => {
    render(<App />);

    const file = new File(["%PDF-1.4"], "test.pdf", { type: "application/pdf" });

    // Mock PDFDocument.load resolves (no password)
    PDFDocument.load.mockResolvedValueOnce({});

    const input = screen.getByLabelText(/select/i);
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    // Preview appears
    expect(await screen.findByText(/Selected file/i)).toBeInTheDocument();
    expect(screen.getByText("test.pdf")).toBeInTheDocument();

    // Sign button enabled
    expect(screen.getByRole("button", { name: /sign pdf/i })).toBeEnabled();
  });

  test("upload non-PDF file rejects with error toast", async () => {
    render(<App />);

    const file = new File(["content"], "test.txt", { type: "text/plain" });

    // Mock PDFDocument.load throws because load is called only on PDFs, but dropzone blocks anyway
    PDFDocument.load.mockClear();

    const input = screen.getByLabelText(/select/i);
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    expect(await screen.findByText(/Only PDF files allowed/i)).toBeInTheDocument();
    expect(screen.queryByText(/Selected file/i)).not.toBeInTheDocument();
    expect(PDFDocument.load).not.toHaveBeenCalled();
  });

  test("upload PDF larger than max size shows error", async () => {
    render(<App />);

    // Create mock file with size > 10MB
    const largeFile = new File([new ArrayBuffer(11 * 1024 * 1024)], "large.pdf", { type: "application/pdf" });

    PDFDocument.load.mockResolvedValueOnce({});

    const input = screen.getByLabelText(/select/i);
    await act(async () => {
      fireEvent.change(input, { target: { files: [largeFile] } });
    });

    expect(await screen.findByText(/exceeds.*10 MB/i)).toBeInTheDocument();
    expect(screen.queryByText(/Selected file/i)).not.toBeInTheDocument();
  });

  test("upload password protected PDF shows warning and does not preview", async () => {
    render(<App />);
    const file = new File(["encrypted pdf"], "encrypted.pdf", { type: "application/pdf" });

    // Simulate pdf-lib throwing encryption error
    PDFDocument.load.mockRejectedValueOnce(new Error("PDF is encrypted"));

    const input = screen.getByLabelText(/select/i);
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    expect(await screen.findByText(/password.*encrypted/i)).toBeInTheDocument();
    expect(screen.queryByText(/Selected file/i)).not.toBeInTheDocument();
  });

  test("sign button triggers upload and shows loader", async () => {
    // Mock fetch for signing endpoint
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["signed pdf"], { type: "application/pdf" })),
    });

    render(<App />);

    const file = new File(["%PDF-1.4"], "test.pdf", { type: "application/pdf" });
    PDFDocument.load.mockResolvedValueOnce({});

    const input = screen.getByLabelText(/select/i);
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    const signButton = screen.getByRole("button", { name: /sign pdf/i });
    await act(async () => {
      userEvent.click(signButton);
    });

    expect(await screen.findByText(/Uploading file/i)).toBeInTheDocument();

    // Wait for signing completion (loader disappears and signed iframe appears)
    await waitFor(() => {
      expect(screen.queryByText(/Uploading file/i)).not.toBeInTheDocument();
    });

    expect(screen.getByTitle(/Signed PDF/i)).toBeInTheDocument();

    // Clean up mock fetch
    global.fetch.mockRestore();
  });

  test("handles server error responses correctly", async () => {
    // Mock fetch to return error 413 (file size)
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 413,
      json: async () => ({ error: "File too large" }),
    });

    render(<App />);

    const file = new File(["%PDF-1.4"], "test.pdf", { type: "application/pdf" });
    PDFDocument.load.mockResolvedValueOnce({});

    const input = screen.getByLabelText(/select/i);
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    const signButton = screen.getByRole("button", { name: /sign pdf/i });
    await act(async () => {
      userEvent.click(signButton);
    });

    expect(await screen.findByText(/exceeds/i)).toBeInTheDocument();

    global.fetch.mockRestore();
  });

  test("user can remove selected file to choose another", async () => {
    render(<App />);

    const file = new File(["%PDF-1.4"], "test.pdf", { type: "application/pdf" });
    PDFDocument.load.mockResolvedValueOnce({});

    const input = screen.getByLabelText(/select/i);
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    expect(await screen.findByText(/Selected file/i)).toBeInTheDocument();

    const removeButton = screen.getByRole("button", { name: /remove/i });
    userEvent.click(removeButton);

    expect(screen.queryByText(/Selected file/i)).not.toBeInTheDocument();
  });
});

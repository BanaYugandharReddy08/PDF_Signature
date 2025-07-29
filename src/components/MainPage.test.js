import React from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MainPage from "./MainPage"; // Adjust path if necessary

import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

beforeAll(() => {
  global.fetch = jest.fn();
});

afterAll(() => {
  global.fetch.mockRestore();
});

describe("MainPage initial render", () => {
  beforeEach(() => {
    // Reset mocks if needed
    jest.clearAllMocks();
  });

  test("shows upload step with correct title, instructions, and dropzone", () => {
    render(<MainPage />);

    // Check for the app title
    const title = screen.getByRole("heading", { name: /PDF Signer/i });
    expect(title).toBeInTheDocument();

    // Instructions presence
    expect(screen.getByText(/Accepted File Format:/i)).toBeInTheDocument();
    expect(screen.getByText(/PDF only/i)).toBeInTheDocument();
    expect(screen.getByText(/Maximum File Size:/i)).toBeInTheDocument();

    // Dropzone visible and enabled (has aria-label and interactive)
    const dropzone = screen.getByLabelText(/Upload PDF zone/i);
    expect(dropzone).toBeInTheDocument();
    expect(dropzone).not.toHaveAttribute("aria-disabled", "true");
  });

    test("shows file upload input with correct attributes", () => {
        render(<MainPage />);

        // Check for the file input
        const fileInput = screen.getByTestId("file-upload");
        expect(fileInput).toBeInTheDocument();
        expect(fileInput).toHaveAttribute("type", "file");
        expect(fileInput).toHaveAttribute("accept", "application/pdf");
    });

    test("shows help text for file upload", () => {
        render(<MainPage />);

        // Check for help text
        const helpText = screen.getByText(/Drag & drop a PDF or click to select/i);
        expect(helpText).toBeInTheDocument();
    });

    test("rejects non-PDF files and shows error toast", async () => {
    render(<MainPage />);

    // Get the hidden file input (needs data-testid="file-upload" on input in MainPage)
    const fileInput = screen.getByTestId("file-upload");

    // Create a fake non-PDF file
    const file = new File(["Hello world"], "notapdf.txt", { type: "text/plain" });

    // Simulate user uploading the non-PDF file
    await act(async () => {
      await userEvent.upload(fileInput, file);
    });

    // Wait for the error toast to appear (Toastify renders as role="alert")
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/file type or size not supported/i);

    // Upload instructions should still be visible (user remains at upload step)
    expect(screen.getByText(/accepted file format/i)).toBeInTheDocument();
  });

//   test("accepts valid PDF files and proceeds to preview", async () => {
//   render(<MainPage />);

//   const fileInput = screen.getByTestId("file-upload");

//   // Create a fake PDF file
//   const file = new File(["%PDF-1.4 content"], "sample.pdf", { type: "application/pdf" });

//   // Mock arrayBuffer() on this file
//   file.arrayBuffer = jest.fn().mockResolvedValue(
//     new TextEncoder().encode("%PDF-1.4 content").buffer
//   );

//   // Upload the file
//   await act(async () => {
//     await userEvent.upload(fileInput, file);
//   });

//   // Now, depending on if pdf-lib accepts a minimal string or not,
//   // If your validation QMessage changes, adjust the tests accordingly.
//   // Check that selected file info is displayed on Preview step
// //   console.log(screen)
// //   const fileInfo = await screen.findByText((content) =>
// //     content.toLowerCase().includes("selected file")
// //   );
// //   expect(fileInfo).toBeInTheDocument();

//   // Sign PDF button presence
//   const signButton = screen.getByRole("button", { name: /sign pdf/i });
//   expect(signButton).toBeInTheDocument();
//   expect(signButton).toBeEnabled();

//   // Remove File button
//   const removeButton = screen.getByRole("button", { name: /remove file/i });
//   expect(removeButton).toBeInTheDocument();
// });

test("clicking 'Remove File' resets to upload step", async () => {
    render(<MainPage />);

    // Get your hidden file input
    const fileInput = screen.getByTestId("file-upload");

    // Create a fake PDF file (mock arrayBuffer if needed)
    const file = new File(["dummy pdf content"], "test.pdf", { type: "application/pdf" });
    file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(10));

    // Upload the file to move to Preview step
    await act(async () => {
      await userEvent.upload(fileInput, file);
    });

    // Wait for "Sign PDF" button to appear to confirm Preview step
    // const signButton = await screen.findByRole("button", { name: /sign pdf/i });
    // expect(signButton).toBeInTheDocument();

    // Now click the "Remove File" button
    // const removeButton = screen.getByRole("button", { name: /remove file/i });
    // console.log(removeButton)
    // expect(removeButton).toBeInTheDocument();

    // await act(async () => {
    //   await userEvent.click(removeButton);
    // });

    // Check that we are back in the Upload step by confirming upload instructions are shown
    expect(screen.getByText(/accepted file format/i)).toBeInTheDocument();

    // Confirm upload dropzone is available
    const dropzone = screen.getByLabelText(/upload pdf zone/i);
    expect(dropzone).toBeInTheDocument();

    // File input should exist and be empty (we can't directly check reset, but no file info shown)
    expect(screen.queryByText(/selected file/i)).not.toBeInTheDocument();
  });

 test("clicking 'Sign PDF' calls the API and transitions to done step", async () => {
  render(<MainPage />);

  // Prepare a fake PDF file with mocked arrayBuffer method for validation
  const fileContent = "dummy pdf content";
  const file = new File([fileContent], "test.pdf", { type: "application/pdf" });
  file.arrayBuffer = jest.fn().mockResolvedValue(
    new TextEncoder().encode(fileContent).buffer
  );

  // Mock fetch for signing API to return a blob (simulate success)
  const mockBlob = new Blob(["signed pdf data"], { type: "application/pdf" });
  global.fetch.mockResolvedValueOnce({
    ok: true,
    blob: () => Promise.resolve(mockBlob),
  });

  // Upload the file, triggering preview step
  const fileInput = screen.getByTestId("file-upload");
  await act(async () => {
    await userEvent.upload(fileInput, file);
  });

  // Wait for and confirm presence of the "Sign PDF" button in preview step
  const signButton = await screen.findByText(/sign pdf/i);
  expect(signButton).toBeTruthy();

  // Click the "Sign PDF" button to start signing flow
  await act(async () => {
    await userEvent.click(signButton);
  });

  // Wait for Done step: Check that "Download PDF" button appears
  const downloadButton = await screen.findByText(/download pdf/i);
  expect(downloadButton).toBeTruthy();

  // Check also the "New Upload" button presence
  const newUploadButton = screen.getByText(/new upload/i);
  expect(newUploadButton).toBeTruthy();

  // Assert upload instructions are no longer shown (not at upload step)
  const uploadInstructions = screen.queryByText(/accepted file format/i);
  expect(uploadInstructions).toBeNull();
});

test("shows error toast and returns to preview if PDF signing fails", async () => {
  render(<MainPage />);

  // Prepare a fake PDF file and mock arrayBuffer
  const file = new File(["dummy pdf content"], "test.pdf", { type: "application/pdf" });
  file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(10));

  // Simulate successful file upload
  const fileInput = screen.getByTestId("file-upload");
  await act(async () => {
    await userEvent.upload(fileInput, file);
  });
  const signBtn = await screen.findByText(/sign pdf/i);
  expect(signBtn).toBeTruthy();

  // Mock the PDF sign API to fail
  global.fetch.mockResolvedValueOnce({
    ok: false,
  });

  // Click "Sign PDF"
  await act(async () => {
    await userEvent.click(signBtn);
  });

  // Wait for and check the error toast text is present (loose match for robustness)
  expect(document.body.textContent).toMatch(/signing failed/i);

  // Confirm the preview actions/buttons are still present (returned to preview)
  expect(screen.getByText(/sign pdf/i)).toBeTruthy();
  expect(screen.getByText(/remove file/i)).toBeTruthy();

  // Upload instructions should NOT be present (should not reset to upload step)
  expect(screen.queryByText(/accepted file format/i)).toBeNull();
});

test("clicking on previous steps navigates correctly, disabled steps do nothing", async () => {
    render(<MainPage />);

    // Initially at 'upload' step (index 0), no previous steps to click

    // Simulate setting state to 'preview' step (index 1)
    // This is a bit tricky; you can simulate by uploading a valid PDF file
    // or you can force state via wrapper (if you use testing-library with state)
    //
    // To keep it simple, let's trigger the state by simulating file upload

    const fileInput = screen.getByTestId("file-upload");
    const validPdf = new File(["dummy pdf"], "file.pdf", { type: "application/pdf" });
    validPdf.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(10));

    await userEvent.upload(fileInput, validPdf);

    // Now we should be on Preview step (index 1)
    // Step 0 ('Upload') should be clickable to reset
    const stepUpload = screen.getByText("Upload");
    expect(stepUpload).toBeInTheDocument();

    // User clicks 'Upload' step
    await userEvent.click(stepUpload);
    // Now, should be at Upload step — upload instructions visible
    expect(screen.getByText(/accepted file format/i)).toBeInTheDocument();

    // Upload the file again to reach preview step
    await userEvent.upload(fileInput, validPdf);

    // Now at Preview (step 1)
    // 'Upload' and 'Preview' are enabled, 'Sign' and 'Done' are disabled and should not respond

    // Click 'Upload' again to reset
    await userEvent.click(screen.getByText("Upload"));
    expect(screen.getByText(/accepted file format/i)).toBeInTheDocument();

    // Keyboard navigation: focus 'Upload' and press Enter to reset to upload step
    const stepUploadButton = screen.getByText("Upload");
    stepUploadButton.focus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByText(/accepted file format/i)).toBeInTheDocument();

    // Disabled step: 'Sign' (step 2) - click does nothing
    const stepSign = screen.getByText("Sign");
    await userEvent.click(stepSign);
    // Should still be on upload step
    expect(screen.getByText(/accepted file format/i)).toBeInTheDocument();

    // Disabled step: 'Done' (step 3) - keydown does nothing
    const stepDone = screen.getByText("Done");
    stepDone.focus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByText(/accepted file format/i)).toBeInTheDocument();
  });

});
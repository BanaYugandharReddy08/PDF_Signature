import '@testing-library/jest-dom';


jest.mock('react-pdf', () => ({
  Document: ({ children }) => <div data-testid="pdf-document">{children}</div>,
  Page: ({ pageNumber }) => <div data-testid="pdf-page">{`Page ${pageNumber}`}</div>,
  pdfjs: { GlobalWorkerOptions: { workerSrc: '' } },
}));

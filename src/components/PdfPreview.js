import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

function PdfPreview({ url }) {
  const [numPages, setNumPages] = useState(null);

  const onLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  return (
    <div
      className="pdf-viewer"
      style={{
        height: '80vh',
        overflowY: 'auto',
        border: '1px solid #ccc',
        borderRadius: 6,
        padding: 8,
        backgroundColor: '#fff',
        maxWidth: 800,
        margin: 'auto',
      }}
      data-testid="pdf-viewer"
    >
      <Document
        file={url}
        onLoadSuccess={onLoadSuccess}
        loading={<p style={{ textAlign: 'center' }}>Loading PDF...</p>}
        error={<p style={{ textAlign: 'center', color: 'red' }}>Failed to load PDF.</p>}
      >
        {Array.from(new Array(numPages), (el, index) => (
          <div key={`page_${index + 1}`} style={{ marginBottom: 10 }}>
            <Page
              pageNumber={index + 1}
              width={Math.min(window.innerWidth * 0.95, 780)}
            />
            <p style={{ textAlign: 'center', marginTop: 4 }}>
              Page {index + 1} of {numPages}
            </p>
          </div>
        ))}
      </Document>
    </div>
  );
}

export default PdfPreview;

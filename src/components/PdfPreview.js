import PDFViewer from 'pdf-viewer-reactjs';

function PdfPreview({ url }) {
  return (
    <PDFViewer
      document={{
        url: url // This can be a Blob URL or a remote URL
      }}
      hideZoom={true}
      hideRotation={true}
      hideNavbar={false}
      css="custom-pdf-viewer"
    />
  );
}

export default PdfPreview;

// src/components/History.js
import React, { useState, useEffect } from "react";
import "../styles/HistoryPage.css"; // Import your styles

export default function HistoryPage({ history, onView, onDelete, onClear }) {
  const [selectedPreview, setSelectedPreview] = useState(null);

  // Close preview handler
  const closePreview = () => setSelectedPreview(null);

  // Format date for display
  const formatDate = (iso) => new Date(iso).toLocaleString();

  return (
    <div className="history-container" role="region" aria-label="Upload history">
      <h2>Signed Documents History</h2>
      {history.length === 0 ? (
        <p>No signed documents yet.</p>
      ) : (
        <>
          <button type="button" onClick={onClear} className="clear-history-btn">
            Clear History
          </button>

          <table className="history-table">
            <thead>
              <tr>
                <th>Filename</th>
                <th>Date Signed</th>
                <th>View</th>
                <th>Download</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {history.map(({ id, name, date, url }) => (
                <tr key={id}>
                  <td>{name}</td>
                  <td>{formatDate(date)}</td>
                  <td>
                    <button type="button" onClick={() => { setSelectedPreview(url); onView(id); }}>
                      View
                    </button>
                  </td>
                  <td>
                    <a href={url} download={name}>
                      Download
                    </a>
                  </td>
                  <td>
                    <button type="button" onClick={() => onDelete(id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Preview Modal */}
      {selectedPreview && (
        <div className="history-preview-overlay" role="dialog" aria-modal="true">
          <div className="history-preview-content">
            <button
              type="button"
              className="close-preview-btn"
              onClick={closePreview}
              aria-label="Close Preview"
            >
              Close ×
            </button>
            <iframe
              src={selectedPreview}
              title="Signed PDF Preview"
              width="100%"
              height="600px"
              frameBorder="0"
            ></iframe>
          </div>
        </div>
      )}
    </div>
  );
}

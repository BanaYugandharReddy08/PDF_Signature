// src/components/LoaderOverlay.js
import React from "react";

function LoaderOverlay({ visible, message }) {
  if (!visible) return null;
  return (
    <div
      className="loader-overlay"
      role="alert"
      aria-live="assertive"
      aria-modal="true"
      tabIndex={-1}
    >
      <div className="loader-modal">
        <svg
          className="loader-spinner"
          width={48}
          height={48}
          viewBox="0 0 40 40"
          aria-hidden="true"
          focusable="false"
        >
          <circle
            className="loader-path"
            cx={20}
            cy={20}
            r={16}
            fill="none"
            stroke="#1976d2"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={80}
            strokeDashoffset={60}
          >
            {/* <!-- <animateTransform
              attributeName="transform"
              type="rotate"
              begin="0s"
              dur="1s"
              from="0 20 20"
              to="360 20 20"
              repeatCount="indefinite"
            /> --> */}
          </circle>
        </svg>
        <div className="loader-text">{message}</div>
      </div>
    </div>
  );
}

export default LoaderOverlay;

import * as React from "react";
import { Modal } from "./Modal.js";

interface ErrorPopupProps {
  error: string;
  onClose: () => void;
}

export function ErrorPopup({ error, onClose }: ErrorPopupProps) {
  return (
    <Modal onClose={onClose} className="max-w-md">
      <div className="p-6">
        <div className="flex items-center mb-4">
          <div className="text-red-500 text-2xl mr-3">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900">Error</h2>
        </div>

        <p className="text-gray-700 mb-6 leading-relaxed">{error}</p>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

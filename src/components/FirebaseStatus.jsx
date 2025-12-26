"use client"

import { useState } from "react"

export const FirebaseStatus = ({ onRetry }) => {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md">
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-red-800 mb-1">Firebase Not Connected</h3>
            <p className="text-xs text-red-700 mb-2">
              Firestore database is not enabled. The app is running in local mode - hazards will not sync between
              devices.
            </p>
            <div className="text-xs text-red-600 mb-2">
              <strong>To enable cloud sync:</strong>
              <ol className="list-decimal ml-4 mt-1 space-y-1">
                <li>
                  Visit{" "}
                  <a href="https://console.firebase.google.com/" target="_blank" className="underline" rel="noreferrer">
                    Firebase Console
                  </a>
                </li>
                <li>
                  Select project: <strong>roadguard-control</strong>
                </li>
                <li>Click "Firestore Database" → "Create Database"</li>
                <li>Choose "Start in test mode"</li>
              </ol>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onRetry}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded"
              >
                Retry Connection
              </button>
              <button
                onClick={() => setIsVisible(false)}
                className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-medium rounded"
              >
                Continue Offline
              </button>
            </div>
          </div>
          <button onClick={() => setIsVisible(false)} className="flex-shrink-0 text-red-400 hover:text-red-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

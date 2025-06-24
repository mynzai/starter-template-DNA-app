'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div className=\"min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100\">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className=\"text-center p-8 max-w-md mx-auto\"
      >
        {/* Offline Icon */}
        <motion.div
          animate={{ 
            rotate: [0, 10, -10, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3
          }}
          className=\"w-24 h-24 mx-auto mb-6 text-gray-400\"
        >
          <svg fill=\"currentColor\" viewBox=\"0 0 24 24\">
            <path d=\"M23.64 7c-.45-.34-4.93-4-11.64-4C5.28 3 .81 6.66.36 7L12 21.5 23.64 7zM3.53 10.95l8.47 8.47 8.47-8.47c-.81-.62-2.91-2.06-8.47-2.06s-7.66 1.44-8.47 2.06z\"/>
            <path d=\"M1 1l22 22\" stroke=\"currentColor\" strokeWidth=\"2\" strokeLinecap=\"round\"/>
          </svg>
        </motion.div>

        {/* Title */}
        <h1 className=\"text-3xl font-bold text-gray-800 mb-4\">
          You're Offline
        </h1>

        {/* Description */}
        <p className=\"text-gray-600 mb-8 leading-relaxed\">
          Don't worry! This PWA works offline. You can still browse cached content 
          and your data will sync when you're back online.
        </p>

        {/* Available Actions */}
        <div className=\"space-y-4\">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link
              href=\"/\"
              className=\"block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors\"
            >
              Go to Home
            </Link>
          </motion.div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => window.location.reload()}
            className=\"block w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-6 rounded-lg transition-colors\"
          >
            Try Again
          </motion.button>
        </div>

        {/* Network Status */}
        <div className=\"mt-8 p-4 bg-white rounded-lg shadow-sm\">
          <h3 className=\"font-semibold text-gray-800 mb-2\">Network Status</h3>
          <div className=\"flex items-center justify-between text-sm\">
            <span className=\"text-gray-600\">Connection:</span>
            <span className=\"flex items-center gap-2 text-red-600\">
              <div className=\"w-2 h-2 bg-red-500 rounded-full\"></div>
              Offline
            </span>
          </div>
          {typeof window !== 'undefined' && 'connection' in navigator && (
            <div className=\"flex items-center justify-between text-sm mt-1\">
              <span className=\"text-gray-600\">Last seen:</span>
              <span className=\"text-gray-800\">
                {new Date().toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>

        {/* Cached Content Available */}
        <div className=\"mt-4 p-4 bg-green-50 rounded-lg border border-green-200\">
          <h4 className=\"font-medium text-green-800 mb-2\">Available Offline</h4>
          <ul className=\"text-sm text-green-700 space-y-1\">
            <li>• Previously visited pages</li>
            <li>• Cached images and assets</li>
            <li>• Saved documents</li>
            <li>• App functionality</li>
          </ul>
        </div>

        {/* Service Worker Status */}
        <div className=\"mt-6 text-xs text-gray-500\">
          Service Worker is managing this offline experience
        </div>
      </motion.div>
    </div>
  );
}
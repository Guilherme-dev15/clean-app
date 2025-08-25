// src/components/common/LoadingSpinner.tsx
import React from 'react';

export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      <p className="ml-4 text-green-700 text-lg">Carregando Firebase...</p>
    </div>
  );
}
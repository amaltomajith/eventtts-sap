'use client';

import { useEffect } from 'react';

export default function Debug() {
  useEffect(() => {
    // Log when the component mounts
    console.log('Debug component mounted');
    
    // Log environment variables (without sensitive data)
    console.log('Environment:', {
      nodeEnv: process.env.NODE_ENV,
      publicUrl: process.env.NEXT_PUBLIC_URL,
      // Add other non-sensitive env vars as needed
    });
    
    // Log any existing errors in the console
    const originalConsoleError = console.error;
    console.error = function(...args) {
      originalConsoleError.apply(console, args);
      // You could also send these errors to an error tracking service
    };
    
    return () => {
      // Cleanup
      console.error = originalConsoleError;
    };
  }, []);

  return null; // This component doesn't render anything
}

// Environment configuration
export const config = {
  // API Configuration
  api: {
    // For development, use relative URLs so Vite can proxy them
    // For production, use full URLs
    baseUrl: import.meta.env.VITE_API_BASE_URL || '',
    endpoints: {
      turn: '/api/turn',
      state: '/api/state',
    }
  },
  
  // App Configuration
  app: {
    title: import.meta.env.VITE_APP_TITLE || 'GreenCut Sim',
    version: import.meta.env.VITE_APP_VERSION || '2.0.0',
    description: 'Strategy Simulation Dashboard'
  },
  
  // Development Configuration
  dev: {
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
    mode: import.meta.env.MODE
  }
} as const;

// Type-safe config access
export type Config = typeof config;

export const environment = {
  production: false,
  version: '0.1.0',
  name: 'DNA CLI Development',
  debug: true,
  apiUrl: 'https://api.dna-templates.dev',
  registryUrl: 'https://registry.dna-templates.dev',
  updateCheckInterval: 24 * 60 * 60 * 1000, // 24 hours
  maxConcurrentDownloads: 3,
  defaultTimeout: 30000, // 30 seconds
  telemetryEnabled: false,
};
export const environment = {
  production: true,
  version: '0.1.0',
  name: 'DNA CLI',
  debug: false,
  apiUrl: 'https://api.dna-templates.com',
  registryUrl: 'https://registry.dna-templates.com',
  updateCheckInterval: 24 * 60 * 60 * 1000, // 24 hours
  maxConcurrentDownloads: 5,
  defaultTimeout: 60000, // 60 seconds
  telemetryEnabled: true,
};
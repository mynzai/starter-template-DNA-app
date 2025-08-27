"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.environment = void 0;
exports.environment = {
    production: true,
    version: '0.3.31',
    name: 'DNA CLI',
    debug: false,
    apiUrl: 'https://api.dna-templates.com',
    registryUrl: 'https://registry.dna-templates.com',
    updateCheckInterval: 24 * 60 * 60 * 1000, // 24 hours
    maxConcurrentDownloads: 3,
    defaultTimeout: 30000, // 30 seconds
    telemetryEnabled: false,
};

"use strict";
/**
 * @fileoverview Feature flags for progressive CLI command rollout
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDisabledFeatures = exports.getEnabledFeatures = exports.isFeatureEnabled = exports.getFeatureFlags = exports.FEATURES = exports.RELEASE_PHASES = void 0;
exports.RELEASE_PHASES = {
    community: {
        TEST_COMMAND: true,
        GIT_AUTOMATION: true,
        TRACK_COMMAND: true,
        QUALITY_VALIDATION: true,
        HEALTH_MONITORING: true,
        COMPATIBILITY_ANALYSIS: true,
        ENHANCED_COMMANDS: true,
        ECOSYSTEM_UPDATE: true,
        ADVANCED_FEATURES: true
    },
    v0_2_0: {
        TEST_COMMAND: true,
        GIT_AUTOMATION: true,
        TRACK_COMMAND: false,
        QUALITY_VALIDATION: false,
        HEALTH_MONITORING: false,
        COMPATIBILITY_ANALYSIS: false,
        ENHANCED_COMMANDS: false,
        ECOSYSTEM_UPDATE: false,
        ADVANCED_FEATURES: false
    },
    v0_3_0: {
        TEST_COMMAND: true,
        GIT_AUTOMATION: true,
        TRACK_COMMAND: true,
        QUALITY_VALIDATION: true,
        HEALTH_MONITORING: false,
        COMPATIBILITY_ANALYSIS: false,
        ENHANCED_COMMANDS: true,
        ECOSYSTEM_UPDATE: false,
        ADVANCED_FEATURES: false
    },
    v0_4_0: {
        TEST_COMMAND: true,
        GIT_AUTOMATION: true,
        TRACK_COMMAND: true,
        QUALITY_VALIDATION: true,
        HEALTH_MONITORING: true,
        COMPATIBILITY_ANALYSIS: true,
        ENHANCED_COMMANDS: true,
        ECOSYSTEM_UPDATE: false,
        ADVANCED_FEATURES: false
    },
    v0_5_0: {
        TEST_COMMAND: true,
        GIT_AUTOMATION: true,
        TRACK_COMMAND: true,
        QUALITY_VALIDATION: true,
        HEALTH_MONITORING: true,
        COMPATIBILITY_ANALYSIS: true,
        ENHANCED_COMMANDS: true,
        ECOSYSTEM_UPDATE: true,
        ADVANCED_FEATURES: false
    },
    v1_0_0: {
        TEST_COMMAND: true,
        GIT_AUTOMATION: true,
        TRACK_COMMAND: true,
        QUALITY_VALIDATION: true,
        HEALTH_MONITORING: true,
        COMPATIBILITY_ANALYSIS: true,
        ENHANCED_COMMANDS: true,
        ECOSYSTEM_UPDATE: true,
        ADVANCED_FEATURES: true
    }
};
// Default to clean community release configuration for v0.3.32
const DEFAULT_VERSION = process.env.DNA_CLI_VERSION || 'community';
const DEFAULT_CONFIG = exports.RELEASE_PHASES[DEFAULT_VERSION] || exports.RELEASE_PHASES.community;
exports.FEATURES = {
    TEST_COMMAND: process.env.ENABLE_TEST !== 'false' ? (process.env.ENABLE_TEST === 'true' || DEFAULT_CONFIG.TEST_COMMAND) : false,
    GIT_AUTOMATION: process.env.ENABLE_GIT !== 'false' ? (process.env.ENABLE_GIT === 'true' || DEFAULT_CONFIG.GIT_AUTOMATION) : false,
    TRACK_COMMAND: process.env.ENABLE_TRACK !== 'false' ? (process.env.ENABLE_TRACK === 'true' || DEFAULT_CONFIG.TRACK_COMMAND) : false,
    QUALITY_VALIDATION: process.env.ENABLE_QUALITY !== 'false' ? (process.env.ENABLE_QUALITY === 'true' || DEFAULT_CONFIG.QUALITY_VALIDATION) : false,
    HEALTH_MONITORING: process.env.ENABLE_HEALTH !== 'false' ? (process.env.ENABLE_HEALTH === 'true' || DEFAULT_CONFIG.HEALTH_MONITORING) : false,
    COMPATIBILITY_ANALYSIS: process.env.ENABLE_COMPATIBILITY !== 'false' ? (process.env.ENABLE_COMPATIBILITY === 'true' || DEFAULT_CONFIG.COMPATIBILITY_ANALYSIS) : false,
    ENHANCED_COMMANDS: process.env.ENABLE_ENHANCED !== 'false' ? (process.env.ENABLE_ENHANCED === 'true' || DEFAULT_CONFIG.ENHANCED_COMMANDS) : false,
    ECOSYSTEM_UPDATE: process.env.ENABLE_ECOSYSTEM !== 'false' ? (process.env.ENABLE_ECOSYSTEM === 'true' || DEFAULT_CONFIG.ECOSYSTEM_UPDATE) : false,
    ADVANCED_FEATURES: process.env.ENABLE_ADVANCED !== 'false' ? (process.env.ENABLE_ADVANCED === 'true' || DEFAULT_CONFIG.ADVANCED_FEATURES) : false
};
function getFeatureFlags(version) {
    if (!version) {
        return exports.FEATURES;
    }
    const versionKey = version.replace(/\./g, '_');
    const phaseFlags = exports.RELEASE_PHASES[versionKey];
    if (!phaseFlags) {
        return exports.FEATURES;
    }
    return {
        ...exports.FEATURES,
        ...phaseFlags
    };
}
exports.getFeatureFlags = getFeatureFlags;
function isFeatureEnabled(feature) {
    return exports.FEATURES[feature];
}
exports.isFeatureEnabled = isFeatureEnabled;
function getEnabledFeatures() {
    return Object.entries(exports.FEATURES)
        .filter(([, enabled]) => enabled)
        .map(([feature]) => feature);
}
exports.getEnabledFeatures = getEnabledFeatures;
function getDisabledFeatures() {
    return Object.entries(exports.FEATURES)
        .filter(([, enabled]) => !enabled)
        .map(([feature]) => feature);
}
exports.getDisabledFeatures = getDisabledFeatures;
//# sourceMappingURL=features.js.map
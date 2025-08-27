"use strict";
/**
 * @fileoverview Workspace Adapter - Bridges CLI commands to workspace libraries
 *
 * This adapter provides access to workspace functionality while maintaining
 * CLI independence and avoiding TypeScript path mapping issues.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWorkspaceService = exports.WorkspaceService = exports.progressTracker = exports.ProgressTracker = exports.qualityValidationEngine = exports.QualityValidationEngine = exports.gitQualityIntegration = exports.GitQualityIntegration = exports.GitAutomationSystem = exports.mergeTestConfig = exports.createDefaultTestConfig = exports.TestRunner = void 0;
// Import workspace functionality
const testing_framework_1 = require("../workspace/testing-framework");
Object.defineProperty(exports, "TestRunner", { enumerable: true, get: function () { return testing_framework_1.TestRunner; } });
Object.defineProperty(exports, "createDefaultTestConfig", { enumerable: true, get: function () { return testing_framework_1.createDefaultTestConfig; } });
Object.defineProperty(exports, "mergeTestConfig", { enumerable: true, get: function () { return testing_framework_1.mergeTestConfig; } });
const git_automation_1 = require("../workspace/git-automation");
Object.defineProperty(exports, "GitAutomationSystem", { enumerable: true, get: function () { return git_automation_1.GitAutomationSystem; } });
Object.defineProperty(exports, "GitQualityIntegration", { enumerable: true, get: function () { return git_automation_1.GitQualityIntegration; } });
Object.defineProperty(exports, "gitQualityIntegration", { enumerable: true, get: function () { return git_automation_1.gitQualityIntegration; } });
const quality_validation_1 = require("../workspace/quality-validation");
Object.defineProperty(exports, "QualityValidationEngine", { enumerable: true, get: function () { return quality_validation_1.QualityValidationEngine; } });
Object.defineProperty(exports, "qualityValidationEngine", { enumerable: true, get: function () { return quality_validation_1.qualityValidationEngine; } });
const progress_tracking_1 = require("../workspace/progress-tracking");
Object.defineProperty(exports, "ProgressTracker", { enumerable: true, get: function () { return progress_tracking_1.ProgressTracker; } });
Object.defineProperty(exports, "progressTracker", { enumerable: true, get: function () { return progress_tracking_1.progressTracker; } });
/**
 * CLI-optimized wrapper for workspace functionality
 */
class WorkspaceService {
    static getInstance() {
        if (!WorkspaceService.instance) {
            WorkspaceService.instance = new WorkspaceService();
        }
        return WorkspaceService.instance;
    }
    /**
     * Initialize workspace services for CLI usage
     */
    async initialize() {
        // Initialize any required workspace services
        // This can be expanded as needed
    }
    /**
     * Get template generation pipeline (mock implementation)
     */
    getTemplateGenerationPipeline() {
        return null; // Placeholder for future implementation
    }
    /**
     * Get test runner
     */
    getTestRunner() {
        return testing_framework_1.TestRunner;
    }
    /**
     * Get quality validation engine
     */
    getQualityValidationEngine() {
        return quality_validation_1.QualityValidationEngine;
    }
    /**
     * Get quality validation engine instance
     */
    getQualityValidation() {
        return quality_validation_1.qualityValidationEngine;
    }
    /**
     * Get Git automation system
     */
    getGitAutomationSystem() {
        return git_automation_1.GitAutomationSystem;
    }
    /**
     * Get Git quality integration
     */
    getGitQualityIntegration() {
        return git_automation_1.gitQualityIntegration;
    }
    /**
     * Get progress tracker class
     */
    getProgressTracker() {
        return progress_tracking_1.ProgressTracker;
    }
    /**
     * Get progress tracking instance
     */
    getProgressTracking() {
        return progress_tracking_1.progressTracker;
    }
}
exports.WorkspaceService = WorkspaceService;
/**
 * Convenience function to get workspace service instance
 */
const getWorkspaceService = () => WorkspaceService.getInstance();
exports.getWorkspaceService = getWorkspaceService;
//# sourceMappingURL=workspace-adapter.js.map
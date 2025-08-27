"use strict";
/**
 * @fileoverview Update notifier compatibility layer
 * Provides a stub for update-notifier in CommonJS builds
 */
Object.defineProperty(exports, "__esModule", { value: true });
class UpdateNotifier {
    constructor(options) {
        this.options = options;
        // In a real implementation, this would check for updates
        // For now, we'll just return no updates available
    }
    notify(options) {
        // In production, this would display update notifications
        // For now, we'll skip notifications
        if (this.update && !options?.defer) {
            console.log(`\nUpdate available: ${this.update.current} → ${this.update.latest}`);
            console.log(`Run npm update -g ${this.options.pkg.name} to update\n`);
        }
    }
}
function updateNotifier(options) {
    return new UpdateNotifier(options);
}
exports.default = updateNotifier;
//# sourceMappingURL=update-notifier-compat.js.map
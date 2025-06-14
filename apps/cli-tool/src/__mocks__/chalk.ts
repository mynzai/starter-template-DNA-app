/**
 * Mock implementation of chalk for testing
 */

const mockChalk = (text: string) => text;

// Add all the properties chalk might use
mockChalk.red = mockChalk;
mockChalk.green = mockChalk;
mockChalk.blue = mockChalk;
mockChalk.yellow = mockChalk;
mockChalk.cyan = mockChalk;
mockChalk.magenta = mockChalk;
mockChalk.white = mockChalk;
mockChalk.gray = mockChalk;
mockChalk.dim = mockChalk;
mockChalk.bold = mockChalk;

// Add compound methods
mockChalk.bold.red = mockChalk;
mockChalk.bold.green = mockChalk;
mockChalk.bold.blue = mockChalk;
mockChalk.bold.yellow = mockChalk;
mockChalk.bold.cyan = mockChalk;
mockChalk.bold.magenta = mockChalk;
mockChalk.bold.white = mockChalk;

export default mockChalk;
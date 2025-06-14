/**
 * Mock implementation of boxen for testing
 */

export default function boxen(text: string, options?: any): string {
  return `[BOX: ${text}]`;
}
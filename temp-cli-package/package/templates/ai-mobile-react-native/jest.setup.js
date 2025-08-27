import 'react-native-gesture-handler/jestSetup';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock react-native-voice
jest.mock('react-native-voice', () => ({
  start: jest.fn(),
  stop: jest.fn(),
  destroy: jest.fn(),
  removeAllListeners: jest.fn(),
  isAvailable: jest.fn(() => Promise.resolve(true)),
  onSpeechStart: jest.fn(),
  onSpeechEnd: jest.fn(),
  onSpeechError: jest.fn(),
  onSpeechResults: jest.fn(),
}));

// Mock react-native-tts
jest.mock('react-native-tts', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  setDefaultLanguage: jest.fn(),
  setDefaultRate: jest.fn(),
  setDefaultPitch: jest.fn(),
  voices: jest.fn(() => Promise.resolve([])),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Mock react-native-camera
jest.mock('react-native-camera', () => ({
  RNCamera: {
    Constants: {
      Type: { back: 'back', front: 'front' },
      FlashMode: { on: 'on', off: 'off', auto: 'auto' },
      AutoFocus: { on: 'on', off: 'off' },
      WhiteBalance: { auto: 'auto' },
    },
  },
}));

// Mock react-native-image-crop-picker
jest.mock('react-native-image-crop-picker', () => ({
  openCamera: jest.fn(() => Promise.resolve({
    path: '/mock/path/image.jpg',
    width: 1920,
    height: 1080,
    size: 1024000,
    mime: 'image/jpeg',
  })),
  openPicker: jest.fn(() => Promise.resolve({
    path: '/mock/path/image.jpg',
    width: 1920,
    height: 1080,
    size: 1024000,
    mime: 'image/jpeg',
  })),
}));

// Mock @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock @react-native-community/netinfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  addEventListener: jest.fn(),
}));

// Mock react-native-permissions
jest.mock('react-native-permissions', () => ({
  check: jest.fn(() => Promise.resolve('granted')),
  request: jest.fn(() => Promise.resolve('granted')),
  PERMISSIONS: {
    ANDROID: {
      CAMERA: 'android.permission.CAMERA',
      RECORD_AUDIO: 'android.permission.RECORD_AUDIO',
      WRITE_EXTERNAL_STORAGE: 'android.permission.WRITE_EXTERNAL_STORAGE',
      ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
    },
    IOS: {
      CAMERA: 'ios.permission.CAMERA',
      MICROPHONE: 'ios.permission.MICROPHONE',
      PHOTO_LIBRARY: 'ios.permission.PHOTO_LIBRARY',
      LOCATION_WHEN_IN_USE: 'ios.permission.LOCATION_WHEN_IN_USE',
    },
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    BLOCKED: 'blocked',
  },
}));

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialIcons', () => 'MaterialIcons');

// Silence console warnings during tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
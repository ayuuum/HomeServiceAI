import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Supabase mock
import './src/test/mocks/supabase';

// Global fetch mock
global.fetch = vi.fn();

// Mock window.matchMedia (needed for some UI components)
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // Deprecated
        removeListener: vi.fn(), // Deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

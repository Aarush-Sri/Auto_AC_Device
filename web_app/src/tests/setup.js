import '@testing-library/jest-dom';
import { beforeEach } from 'vitest';

beforeEach(() => {
  try {
    localStorage.clear();
  } catch {}
});

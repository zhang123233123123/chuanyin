import type { ExperienceItem } from '@/helpers/ai';

const STORAGE_KEY = 'ai_experience_cache_v1';

export type StoredExperiencePayload = {
  fileName?: string;
  rawContent?: string;
  experiences: ExperienceItem[];
  updatedAt?: string;
};

export function loadStoredExperiences(): StoredExperiencePayload | null {
  if (
    typeof window === 'undefined' ||
    typeof window.localStorage === 'undefined'
  ) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!Array.isArray(parsed.experiences)) return null;
    return parsed as StoredExperiencePayload;
  } catch (err) {
    console.warn('[experience-storage] failed to parse cache', err);
    return null;
  }
}

export function saveStoredExperiences(payload: StoredExperiencePayload) {
  if (
    typeof window === 'undefined' ||
    typeof window.localStorage === 'undefined'
  ) {
    return;
  }
  try {
    const serialized = JSON.stringify({
      ...payload,
      updatedAt: new Date().toISOString(),
    });
    window.localStorage.setItem(STORAGE_KEY, serialized);
  } catch (err) {
    console.warn('[experience-storage] failed to save cache', err);
  }
}

export function clearStoredExperiences() {
  if (
    typeof window === 'undefined' ||
    typeof window.localStorage === 'undefined'
  ) {
    return;
  }
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[experience-storage] failed to clear cache', err);
  }
}

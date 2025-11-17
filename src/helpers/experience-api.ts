import type { ExperienceItem } from './ai';

const API_URL =
  process.env.GATSBY_BACKEND_URL || 'http://localhost:4000/api/experiences';

export async function loadExperiencesFromServer(): Promise<ExperienceItem[]> {
  const res = await fetch(API_URL, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`加载失败: ${res.status}`);
  }
  const data = await res.json();
  if (Array.isArray(data.experiences)) {
    return data.experiences as ExperienceItem[];
  }
  return [];
}

export async function saveExperiencesToServer(
  experiences: ExperienceItem[]
): Promise<void> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ experiences }),
  });
  if (!res.ok) {
    throw new Error(`保存失败: ${res.status}`);
  }
}

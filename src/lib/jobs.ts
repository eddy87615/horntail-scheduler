/* --------------------------------- jobs ---------------------------------- */
// Placeholder job list — swap the names for your own.
export interface Job {
  id: string;
  name: string;
}

export const JOBS: Job[] = [
  { id: 'hero', name: '英雄' },
  { id: 'paladin', name: '聖騎士' },
  { id: 'darkknight', name: '黑騎士' },
  { id: 'firepoison', name: '火毒大魔導士' },
  { id: 'icelightning', name: '冰雷大魔導士' },
  { id: 'bishop', name: '主教' },
  { id: 'bowmaster', name: '箭神' },
  { id: 'marksman', name: '神射手' },
  { id: 'nightlord', name: '夜使者' },
  { id: 'shadower', name: '暗影神偷' },
  { id: 'buccaneer', name: '拳霸' },
  { id: 'corsair', name: '槍神' },
];

export const jobById = (id?: string): Job | undefined =>
  JOBS.find((j) => j.id === id);

/* -------------------------------- bosses --------------------------------- */
// Placeholder roster — swap the names/images for your own.
// Images live in /public/bosses/; reference them as "/bosses/<file>" (NOT "/src/...").
export interface Boss {
  id: string;
  name: string;
  img: string;
}

export const BOSSES: Boss[] = [
  { id: 'horntail', name: '暗黑龍王', img: '/bosses/horntail.png' },
  { id: 'zakum', name: '殘暴炎魔', img: '/bosses/zakum.png' },
  {
    id: 'normal-magnus',
    name: '普通拉圖斯',
    img: '/bosses/normal-magnus.webp',
  },
  {
    id: 'hard-magnus',
    name: '困難拉圖斯',
    img: '/bosses/hard-magnus.png',
  },
];

export const bossById = (id?: string): Boss | undefined =>
  BOSSES.find((b) => b.id === id);

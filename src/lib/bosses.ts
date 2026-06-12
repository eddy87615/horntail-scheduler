/* -------------------------------- bosses --------------------------------- */
// Placeholder roster — swap the names/images for your own.
// Images live in /public/bosses/<id>.svg; replace those files (or change `img`).
export interface Boss {
  id: string;
  name: string;
  img: string;
}

export const BOSSES: Boss[] = [
  { id: 'horntail', name: '暗黑龍王', img: '/src/assets/horntail.png' },
  { id: 'zakum', name: '殘暴炎魔', img: '/src/assets/zakum.png' },
  {
    id: 'normal-magnus',
    name: '普通拉圖斯',
    img: '/src/assets/normal-magnus.webp',
  },
  {
    id: 'hard-magnus',
    name: '困難拉圖斯',
    img: '/src/assets/hard-magnus.png',
  },
];

export const bossById = (id?: string): Boss | undefined =>
  BOSSES.find((b) => b.id === id);

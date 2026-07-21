export const CATEGORY_META = {
  electrician: { emoji: '⚡', blurb: 'Wiring, repairs & fittings' },
  plumber: { emoji: '🚰', blurb: 'Leaks, taps & fittings' },
  cleaner: { emoji: '🧽', blurb: 'Home & bathroom cleaning' },
  carpenter: { emoji: '🪚', blurb: 'Furniture & woodwork' },
  painter: { emoji: '🎨', blurb: 'Walls & interiors' },
  'ac-technician': { emoji: '❄️', blurb: 'Service & gas refill' },
  'pest-control': { emoji: '🐜', blurb: 'Safe pest removal' },
  'appliance-repair': { emoji: '🔧', blurb: 'Appliances & gadgets' },
  gardening: { emoji: '🌿', blurb: 'Lawn & plant care' },
};

export function catMeta(slug) {
  return CATEGORY_META[slug] ?? { emoji: '🛠️', blurb: 'Trusted local pros' };
}

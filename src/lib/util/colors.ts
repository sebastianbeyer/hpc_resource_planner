/**
 * Deterministic palette mapping for model ids. Used by the Plan tab to color
 * per-sim segments in the budget meters so sims of the same model share a hue
 * at a glance. Classes are written out in full so Tailwind picks them up
 * during its source scan.
 *
 * Palette excludes reds and greens by design — those hues carry "error" and
 * "success" semantics in the rest of the UI (over-budget warnings, etc.) and
 * shouldn't double as neutral categorical colors.
 */

const PALETTE: { active: string; completed: string }[] = [
  { active: 'bg-indigo-500', completed: 'bg-indigo-700' },
  { active: 'bg-sky-500', completed: 'bg-sky-700' },
  { active: 'bg-amber-500', completed: 'bg-amber-700' },
  { active: 'bg-violet-500', completed: 'bg-violet-700' },
  { active: 'bg-teal-500', completed: 'bg-teal-700' },
  { active: 'bg-orange-500', completed: 'bg-orange-700' },
  { active: 'bg-fuchsia-500', completed: 'bg-fuchsia-700' },
  { active: 'bg-cyan-500', completed: 'bg-cyan-700' },
  { active: 'bg-pink-500', completed: 'bg-pink-700' },
  { active: 'bg-blue-500', completed: 'bg-blue-700' },
  { active: 'bg-yellow-500', completed: 'bg-yellow-700' },
  { active: 'bg-purple-500', completed: 'bg-purple-700' }
];

// Stable color overrides keyed by model name (case-insensitive). Lets the
// well-known climate models keep a recognizable color regardless of the
// random id they were created with.
const NAME_OVERRIDES: Record<string, { active: string; completed: string }> = {
  icon: { active: 'bg-purple-500', completed: 'bg-purple-700' }
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function modelColor(
  modelId: string,
  completed: boolean,
  modelName?: string
): string {
  const override = modelName
    ? NAME_OVERRIDES[modelName.trim().toLowerCase()]
    : undefined;
  const entry = override ?? PALETTE[hash(modelId) % PALETTE.length];
  return completed ? entry.completed : entry.active;
}

// Active-shade backgrounds where white text would have poor contrast — those
// few need a dark label instead. The completed (-700) shades are dark enough
// for white text across the whole palette.
const LIGHT_ACTIVE_BG = new Set([
  'bg-amber-500',
  'bg-yellow-500',
  'bg-cyan-500'
]);

export function modelBadgeClass(
  modelId: string,
  completed: boolean,
  modelName?: string
): string {
  const bg = modelColor(modelId, completed, modelName);
  const text = !completed && LIGHT_ACTIVE_BG.has(bg) ? 'text-slate-900' : 'text-white';
  return `${bg} ${text}`;
}

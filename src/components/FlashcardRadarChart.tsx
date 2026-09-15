import React from 'react';
import type { Category, SRSCard } from '../types/srs';
import { ALL_CATEGORIES, CATEGORY_STYLES } from '../utils/categoryColors';
import { isCardMastered, isCardDue } from '../utils/sm2';

interface FlashcardRadarChartProps {
  cards: SRSCard[];
  onSelectCategory?: (category: Category) => void;
}

export const FlashcardRadarChart: React.FC<FlashcardRadarChartProps> = ({
  cards,
  onSelectCategory,
}) => {
  const categoriesData = ALL_CATEGORIES.map((cat) => {
    const catCards = cards.filter((c) => c.category === cat);
    const total = catCards.length;
    const mastered = catCards.filter((c) => isCardMastered(c)).length;
    const due = catCards.filter((c) => isCardDue(c)).length;
    const masteryPct = total > 0 ? Math.round((mastered / total) * 100) : 0;
    return {
      category: cat,
      style: CATEGORY_STYLES[cat],
      total,
      mastered,
      due,
      masteryPct,
    };
  });

  // Overall average mastery across all categories
  const avgMastery = Math.round(
    categoriesData.reduce((acc, c) => acc + c.masteryPct, 0) / categoriesData.length
  );

  // SVG Radar Dimensions
  const cx = 175;
  const cy = 160;
  const radius = 100;
  const totalAxes = categoriesData.length;
  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];

  // Axis angles (start at 12 o'clock, clockwise)
  const getAngle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / totalAxes;

  // Concentric polygon rings
  const ringPolygons = levels.map((lvl) => {
    return categoriesData
      .map((_, i) => {
        const angle = getAngle(i);
        const x = cx + radius * lvl * Math.cos(angle);
        const y = cy + radius * lvl * Math.sin(angle);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  });

  // Data polygon coordinates
  const dataPoints = categoriesData.map((d, i) => {
    const angle = getAngle(i);
    // minimum 0.08 scale so 0% has an anchor point
    const normalized = Math.max(0.08, d.masteryPct / 100);
    const x = cx + radius * normalized * Math.cos(angle);
    const y = cy + radius * normalized * Math.sin(angle);
    return { x, y, angle, ...d };
  });

  const dataPolygonString = dataPoints
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4 flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Meeting Context Radar</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Mastery depth across the 5 technical communication scenarios
          </p>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-slate-400 block">Deck Balance</span>
          <span className="text-base font-bold font-mono text-indigo-600 dark:text-indigo-400">
            {avgMastery}%
          </span>
        </div>
      </div>

      {/* SVG Container */}
      <div className="relative w-full flex items-center justify-center py-2 select-none overflow-visible">
        <svg
          viewBox="0 0 350 320"
          className="w-full max-w-[340px] h-auto overflow-visible"
        >
          <defs>
            {/* Gradient fill for data polygon */}
            <radialGradient id="radarFillGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.15" />
            </radialGradient>
          </defs>

          {/* Grid Background Rings */}
          {ringPolygons.map((pts, idx) => (
            <polygon
              key={`ring-${idx}`}
              points={pts}
              fill={idx === levels.length - 1 ? 'currentColor' : 'none'}
              className="text-slate-50/60 dark:text-slate-900/40 stroke-slate-200 dark:stroke-slate-800"
              strokeWidth={idx === levels.length - 1 ? '1.5' : '1'}
              strokeDasharray={idx < levels.length - 1 ? '3 3' : undefined}
            />
          ))}

          {/* Grid Axis Lines */}
          {categoriesData.map((_, i) => {
            const angle = getAngle(i);
            const x2 = cx + radius * Math.cos(angle);
            const y2 = cy + radius * Math.sin(angle);
            return (
              <line
                key={`axis-${i}`}
                x1={cx}
                y1={cy}
                x2={x2}
                y2={y2}
                className="stroke-slate-200 dark:stroke-slate-800"
                strokeWidth="1"
              />
            );
          })}

          {/* Data Filled Polygon */}
          <polygon
            points={dataPolygonString}
            fill="url(#radarFillGrad)"
            stroke="#6366f1"
            strokeWidth="2.5"
            strokeLinejoin="round"
            className="transition-all duration-500 ease-out drop-shadow-sm"
          />

          {/* Center Point */}
          <circle cx={cx} cy={cy} r="3" className="fill-slate-300 dark:fill-slate-700" />

          {/* Vertex Dots & Value Labels */}
          {dataPoints.map((pt, i) => {
            // Anchor positioning for outer labels
            const labelRadius = radius + 24;
            const lx = cx + labelRadius * Math.cos(pt.angle);
            const ly = cy + labelRadius * Math.sin(pt.angle);

            let textAnchor: 'middle' | 'start' | 'end' = 'middle';
            if (Math.cos(pt.angle) > 0.3) textAnchor = 'start';
            else if (Math.cos(pt.angle) < -0.3) textAnchor = 'end';

            return (
              <g
                key={`point-${i}`}
                className="cursor-pointer group"
                onClick={() => onSelectCategory?.(pt.category)}
              >
                {/* Vertex Circle */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="4.5"
                  fill="#6366f1"
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="transition-transform duration-200 group-hover:scale-125"
                />

                {/* Outer Label: Category and Percentage */}
                <text
                  x={lx}
                  y={ly - 2}
                  textAnchor={textAnchor}
                  className="text-[11px] font-semibold fill-slate-700 dark:fill-slate-300 transition-colors group-hover:fill-indigo-600 dark:group-hover:fill-indigo-400"
                >
                  {pt.category}
                </text>
                <text
                  x={lx}
                  y={ly + 10}
                  textAnchor={textAnchor}
                  className="text-[10px] font-mono font-bold fill-indigo-600 dark:fill-indigo-400"
                >
                  {pt.masteryPct}% ({pt.mastered}/{pt.total})
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Footer Meta */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span>Target B2+ Mastery: &ge; 80% interval &ge; 21d</span>
        <span className="text-indigo-600 dark:text-indigo-400 font-medium cursor-pointer">
          Click any point to inspect
        </span>
      </div>
    </div>
  );
};

import React, { useMemo } from 'react';
import {
  Clock,
  Sparkles,
  Zap,
  ShieldCheck,
  TrendingUp,
  Brain,
  AlertTriangle,
  Play,
} from 'lucide-react';
import type { TechCard, EvaluationResult, ContextDomain } from '../../types/techCard';

interface ParaphraseAnalyticsDashboardProps {
  techCards: TechCard[];
  dueCards: TechCard[];
  history: EvaluationResult[];
  onStartPractice: () => void;
  onResetCard?: (cardId: string) => void;
}

const DOMAIN_LABELS: Record<ContextDomain, { label: string; desc: string; color: string }> = {
  git: { label: 'Git Flow', desc: 'PRs, merges, rebase, conflicts', color: '#6366f1' },
  architecture: { label: 'Architecture', desc: 'APIs, microservices, scaling', color: '#8b5cf6' },
  agile: { label: 'Agile & Scrum', desc: 'Dailies, refinement, blockers', color: '#ec4899' },
  debugging: { label: 'Debugging', desc: 'Stack traces, leaks, root cause', color: '#f59e0b' },
  ci_cd: { label: 'CI / CD', desc: 'Deployments, rollback, pipelines', color: '#10b981' },
};

export const ParaphraseAnalyticsDashboard: React.FC<ParaphraseAnalyticsDashboardProps> = ({
  techCards,
  dueCards,
  history,
  onStartPractice,
}) => {
  // 1. Due Today count
  const dueTodayCount = dueCards.length;

  // 2. Oral Proficiency Index (rolling average of last 20 attempts)
  const last20 = useMemo(() => history.slice(0, 20), [history]);
  const overallProficiency = useMemo(() => {
    if (last20.length === 0) return null;
    const sum = last20.reduce((acc, curr) => acc + curr.scores.overallScore, 0);
    return +(sum / last20.length).toFixed(1);
  }, [last20]);

  const proficiencyBadge = useMemo(() => {
    if (overallProficiency === null) return { text: 'No Data', color: 'bg-slate-100 text-slate-600' };
    if (overallProficiency >= 4.5) return { text: 'B2+ Advanced', color: 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400' };
    if (overallProficiency >= 4.2) return { text: 'B2 Proficient', color: 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400' };
    if (overallProficiency >= 3.8) return { text: 'B1+ Solid', color: 'bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-400' };
    if (overallProficiency >= 3.0) return { text: 'B1 Intermediate', color: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400' };
    return { text: 'Developing', color: 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-400' };
  }, [overallProficiency]);

  // 3. Speech Agility (average duration of high-scoring cards >= 4.0)
  const agility = useMemo(() => {
    const highScoring = history.filter((h) => h.scores.overallScore >= 4.0);
    if (highScoring.length === 0) return null;
    const avgDuration =
      highScoring.reduce((acc, curr) => acc + curr.telemetry.durationSeconds, 0) / highScoring.length;
    return +avgDuration.toFixed(1);
  }, [history]);

  // 4. Lexical Compliance Rate (% without forbidden words)
  const lexicalComplianceRate = useMemo(() => {
    if (history.length === 0) return null;
    const compliantCount = history.filter(
      (h) => !h.insights.repeatedForbiddenWords || h.insights.repeatedForbiddenWords.length === 0
    ).length;
    return Math.round((compliantCount / history.length) * 100);
  }, [history]);

  // Dimensions Average (Scale 1.0 - 5.0)
  const dimensions = useMemo(() => {
    if (history.length === 0) {
      return {
        semantic: null,
        lexical: null,
        grammar: null,
        vocab: null,
      };
    }
    const sum = history.reduce(
      (acc, h) => ({
        semantic: acc.semantic + h.scores.semanticEquivalence,
        lexical: acc.lexical + h.scores.lexicalCompliance,
        grammar: acc.grammar + h.scores.grammarAndSyntax,
        vocab: acc.vocab + h.scores.vocabularyRange,
      }),
      { semantic: 0, lexical: 0, grammar: 0, vocab: 0 }
    );
    const n = history.length;
    return {
      semantic: +(sum.semantic / n).toFixed(1),
      lexical: +(sum.lexical / n).toFixed(1),
      grammar: +(sum.grammar / n).toFixed(1),
      vocab: +(sum.vocab / n).toFixed(1),
    };
  }, [history]);

  // SRS Maturity Breakdown
  const maturity = useMemo(() => {
    const total = techCards.length;
    if (total === 0) return { learning: 0, young: 0, mature: 0, learningPct: 0, youngPct: 0, maturePct: 0, retentionRate: 0 };
    let learning = 0;
    let young = 0;
    let mature = 0;
    techCards.forEach((c) => {
      if (!c.intervalDays || c.intervalDays === 0) learning++;
      else if (c.intervalDays < 21) young++;
      else mature++;
    });

    const retentionPassing = history.filter((h) => h.scores.overallScore >= 3.0).length;
    const retentionRate = history.length > 0 ? Math.round((retentionPassing / history.length) * 100) : 0;

    return {
      learning,
      young,
      mature,
      learningPct: Math.round((learning / total) * 100),
      youngPct: Math.round((young / total) * 100),
      maturePct: Math.round((mature / total) * 100),
      retentionRate,
    };
  }, [techCards, history]);

  // Domain Mastery
  const domainStats = useMemo(() => {
    const domains: ContextDomain[] = ['git', 'architecture', 'agile', 'debugging', 'ci_cd'];
    return domains.map((d) => {
      const cardsInDomain = techCards.filter((c) => c.contextDomain === d);
      const total = cardsInDomain.length;
      const mastered = cardsInDomain.filter((c) => (c.intervalDays || 0) >= 21).length;
      const historyInDomain = history.filter((h) => {
        const card = techCards.find((tc) => tc.id === h.cardId);
        return card?.contextDomain === d;
      });
      const avgScore =
        historyInDomain.length > 0
          ? +(historyInDomain.reduce((a, b) => a + b.scores.overallScore, 0) / historyInDomain.length).toFixed(1)
          : null;
      const masteryPercent = total > 0 ? Math.round((mastered / total) * 100) : 0;

      return {
        domain: d,
        ...DOMAIN_LABELS[d],
        total,
        mastered,
        masteryPercent,
        avgScore,
      };
    });
  }, [techCards, history]);

  // Persistent Pitfalls to unlearn
  const topPitfalls = useMemo(() => {
    const bulletCounts: Record<string, number> = {};
    const wordCounts: Record<string, number> = {};

    history.forEach((h) => {
      (h.insights.grammarBullets || []).forEach((bullet) => {
        const clean = bullet.trim();
        if (clean) bulletCounts[clean] = (bulletCounts[clean] || 0) + 1;
      });
      (h.insights.repeatedForbiddenWords || []).forEach((word) => {
        const clean = word.toLowerCase().trim();
        if (clean) wordCounts[clean] = (wordCounts[clean] || 0) + 1;
      });
    });

    const topBullets = Object.entries(bulletCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([text, count]) => ({ text, count }));

    const topWords = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([word, count]) => ({ word, count }));

    return { topBullets, topWords };
  }, [history]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Due Today */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Due Today</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-mono">
                {dueTodayCount}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">cards</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Target B2: 0 at end of day
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={onStartPractice}
              className="w-full py-1.5 px-3 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Start Review Session</span>
            </button>
          </div>
        </div>

        {/* KPI 2: Oral Proficiency Index */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Oral Proficiency</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-mono">
                {overallProficiency !== null ? overallProficiency : '—'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">/ 5.0</span>
            </div>
            <div className="mt-2">
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold border ${proficiencyBadge.color}`}>
                {proficiencyBadge.text}
              </span>
            </div>
          </div>
          <p className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
            Target B2: &ge; 4.2 / 5.0 (Last 20 attempts)
          </p>
        </div>

        {/* KPI 3: Speech Agility (Pace) */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Speech Agility</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-mono">
                {agility !== null ? `${agility}s` : '—'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">avg response</span>
            </div>
            <div className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <span>{agility ? (agility <= 12 ? 'Thoughtful & Clear' : 'Extended Pace') : 'Pending reviews'}</span>
            </div>
          </div>
          <p className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
            Target B2: 6.0s &ndash; 12.0s on high scores
          </p>
        </div>

        {/* KPI 4: Lexical Compliance Rate */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Lexical Compliance</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-mono">
                {lexicalComplianceRate !== null ? `${lexicalComplianceRate}%` : '—'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">clean rate</span>
            </div>
            <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${lexicalComplianceRate ?? 0}%` }}
              />
            </div>
          </div>
          <p className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
            Target B2: &ge; 85% clean (no forbidden words)
          </p>
        </div>
      </div>

      {/* Grid: 4 Detailed Modular Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Widget 1: Radar / Dimension Breakdown (The 4 Dimensions) */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Skill Dimensions (The 4 Pillars)
              </h3>
            </div>
            <span className="text-xs text-slate-400">Scale 1.0 &ndash; 5.0</span>
          </div>

          <div className="space-y-3.5 pt-2">
            {/* Dimension 1: Semantic */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Semantic Precision (Equivalence)
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {dimensions.semantic !== null ? `${dimensions.semantic} / 5.0` : '—'}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full"
                  style={{ width: `${dimensions.semantic ? (dimensions.semantic / 5) * 100 : 0}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400">Weight: 40% &bull; Conceptual fidelity</span>
            </div>

            {/* Dimension 2: Lexical Discipline */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Lexical Discipline (Forbidden Words Avoidance)
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {dimensions.lexical !== null ? `${dimensions.lexical} / 5.0` : '—'}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-violet-600 h-full rounded-full"
                  style={{ width: `${dimensions.lexical ? (dimensions.lexical / 5) * 100 : 0}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400">Weight: 20% &bull; Zero stolen lemmas</span>
            </div>

            {/* Dimension 3: Grammar & Syntax */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Grammar & Prepositions (Morphosyntax)
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {dimensions.grammar !== null ? `${dimensions.grammar} / 5.0` : '—'}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full"
                  style={{ width: `${dimensions.grammar ? (dimensions.grammar / 5) * 100 : 0}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400">Weight: 25% &bull; Verbal regime & syntax</span>
            </div>

            {/* Dimension 4: Technical Range */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Technical Range & Register
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {dimensions.vocab !== null ? `${dimensions.vocab} / 5.0` : '—'}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-600 h-full rounded-full"
                  style={{ width: `${dimensions.vocab ? (dimensions.vocab / 5) * 100 : 0}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400">Weight: 15% &bull; Engineering register</span>
            </div>
          </div>
        </div>

        {/* Widget 2: Salud del Mazo SRS (Anki Card Maturity Breakdown) */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  SRS Health & Card Maturity
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500">
                Total: {techCards.length} Cards
              </span>
            </div>

            {/* Stacked Progress Bar */}
            <div className="mt-5 space-y-2">
              <div className="w-full h-4 rounded-full bg-slate-100 dark:bg-slate-800 flex overflow-hidden p-0.5">
                {maturity.learningPct > 0 && (
                  <div
                    style={{ width: `${maturity.learningPct}%` }}
                    className="h-full bg-rose-500 rounded-l-full"
                    title={`Learning/Lapse: ${maturity.learning} (${maturity.learningPct}%)`}
                  />
                )}
                {maturity.youngPct > 0 && (
                  <div
                    style={{ width: `${maturity.youngPct}%` }}
                    className="h-full bg-amber-500"
                    title={`Young: ${maturity.young} (${maturity.youngPct}%)`}
                  />
                )}
                {maturity.maturePct > 0 && (
                  <div
                    style={{ width: `${maturity.maturePct}%` }}
                    className="h-full bg-emerald-500 rounded-r-full"
                    title={`Mature: ${maturity.mature} (${maturity.maturePct}%)`}
                  />
                )}
              </div>

              {/* Legend with counts */}
              <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Learning</span>
                  </div>
                  <div className="mt-1 font-mono font-bold text-slate-900 dark:text-white">
                    {maturity.learning} ({maturity.learningPct}%)
                  </div>
                  <span className="text-[10px] text-slate-400">interval = 0d</span>
                </div>

                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Young</span>
                  </div>
                  <div className="mt-1 font-mono font-bold text-slate-900 dark:text-white">
                    {maturity.young} ({maturity.youngPct}%)
                  </div>
                  <span className="text-[10px] text-slate-400">1 &le; int &lt; 21d</span>
                </div>

                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Mature</span>
                  </div>
                  <div className="mt-1 font-mono font-bold text-slate-900 dark:text-white">
                    {maturity.mature} ({maturity.maturePct}%)
                  </div>
                  <span className="text-[10px] text-slate-400">int &ge; 21d</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">Overall Retention Rate:</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {maturity.retentionRate}% (Score &ge; 3.0 on first trial)
            </span>
          </div>
        </div>

        {/* Widget 3: Progreso por Dominio Técnico (Domain Mastery) */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-500" />
              <span>Technical Domain Mastery</span>
            </h3>
            <span className="text-xs text-slate-400">By meeting scenario</span>
          </div>

          <div className="space-y-3 pt-1">
            {domainStats.map((d) => (
              <div
                key={d.domain}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white mr-2">{d.label}</span>
                    <span className="text-slate-400 text-[11px]">({d.desc})</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-500 text-[11px]">
                      {d.mastered}/{d.total} mature
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {d.masteryPercent}%
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${d.masteryPercent}%`,
                      backgroundColor: d.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Widget 4: Bitácora de Vicios y Correcciones Recurrentes (Top Pitfalls) */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span>Persistent Pitfalls (To Unlearn)</span>
            </h3>
            <span className="text-xs text-slate-400">Top habits & stolen words</span>
          </div>

          <div className="space-y-3 pt-1">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Grammar & Preposition Traps:
              </span>
              {topPitfalls.topBullets.length > 0 ? (
                <div className="space-y-2">
                  {topPitfalls.topBullets.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/60 text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between gap-2"
                    >
                      <span className="line-clamp-2">&bull; {item.text}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 shrink-0 font-mono">
                        &times;{item.count}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic p-2">
                  No recurring grammar traps detected yet. Complete more voice sessions to populate.
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Most Stolen Forbidden Words:
              </span>
              {topPitfalls.topWords.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {topPitfalls.topWords.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-mono"
                    >
                      "{item.word}" &times;{item.count}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Clean practice! No forbidden words repeated yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

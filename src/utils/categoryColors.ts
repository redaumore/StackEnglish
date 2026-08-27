import type { Category } from '../types/srs';

export interface CategoryStyle {
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  cardGlow: string;
  accentColor: string;
  description: string;
}

export const CATEGORY_STYLES: Record<Category, CategoryStyle> = {
  'Kick-off': {
    badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    badgeBorder: 'border-emerald-500/30',
    cardGlow: 'hover:border-emerald-500/50 hover:shadow-emerald-500/10',
    accentColor: '#10b981',
    description: 'Sprint planning, project inception, milestone alignment & MVP scoping.',
  },
  'Standup / Follow-up': {
    badgeBg: 'bg-sky-500/10 dark:bg-sky-500/20',
    badgeText: 'text-sky-700 dark:text-sky-300',
    badgeBorder: 'border-sky-500/30',
    cardGlow: 'hover:border-sky-500/50 hover:shadow-sky-500/10',
    accentColor: '#0ea5e9',
    description: 'Daily syncs, PR reviews, unblocking teammates & async follow-ups.',
  },
  'Scope Negotiation': {
    badgeBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    badgeText: 'text-amber-700 dark:text-amber-300',
    badgeBorder: 'border-amber-500/30',
    cardGlow: 'hover:border-amber-500/50 hover:shadow-amber-500/10',
    accentColor: '#f59e0b',
    description: 'Pushing back on deadlines, managing scope creep & bandwidth trade-offs.',
  },
  'Architecture Review': {
    badgeBg: 'bg-purple-500/10 dark:bg-purple-500/20',
    badgeText: 'text-purple-700 dark:text-purple-300',
    badgeBorder: 'border-purple-500/30',
    cardGlow: 'hover:border-purple-500/50 hover:shadow-purple-500/10',
    accentColor: '#a855f7',
    description: 'Scalability trade-offs, distributed edge cases, latency & decoupling.',
  },
  'Post-Mortem': {
    badgeBg: 'bg-rose-500/10 dark:bg-rose-500/20',
    badgeText: 'text-rose-700 dark:text-rose-300',
    badgeBorder: 'border-rose-500/30',
    cardGlow: 'hover:border-rose-500/50 hover:shadow-rose-500/10',
    accentColor: '#f43f5e',
    description: 'Blameless root cause analysis, action items, MTTR & blast radius.',
  },
};

export const ALL_CATEGORIES: Category[] = [
  'Kick-off',
  'Standup / Follow-up',
  'Scope Negotiation',
  'Architecture Review',
  'Post-Mortem',
];

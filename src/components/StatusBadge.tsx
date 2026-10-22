import React from 'react';
import { ShieldCheck, ShieldAlert, Clock, Lock, AlertCircle } from 'lucide-react';
import { SystemStatus } from '../engine/types.js';

interface StatusBadgeProps {
  status: SystemStatus;
  size?: 'sm' | 'md' | 'lg';
  showDescription?: boolean;
  customLabel?: string;
}

export const STATUS_CONFIG: Record<
  SystemStatus,
  {
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    bgClass: string;
    borderClass: string;
    textClass: string;
    ringClass: string;
  }
> = {
  SAFE: {
    label: 'SAFE',
    description: 'A complete safe sequence exists; deadlock cannot occur under any order of claims.',
    icon: ShieldCheck,
    bgClass: 'bg-emerald-500/15 dark:bg-emerald-500/20',
    borderClass: 'border-emerald-500/50',
    textClass: 'text-emerald-400 font-bold',
    ringClass: 'ring-1 ring-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.25)]',
  },
  UNSAFE: {
    label: 'UNSAFE',
    description: 'No safe sequence exists. Warning: this is NOT deadlock yet, but deadlock cannot be prevented if all processes make peak demands.',
    icon: ShieldAlert,
    bgClass: 'bg-amber-500/15 dark:bg-amber-500/20',
    borderClass: 'border-amber-500/50',
    textClass: 'text-amber-400 font-bold',
    ringClass: 'ring-1 ring-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.25)]',
  },
  WAITING: {
    label: 'WAITING / DEFERRED',
    description: 'Request ≤ Need but > Available. Request queued legitimately until resources are released; state completely unchanged.',
    icon: Clock,
    bgClass: 'bg-yellow-500/15 dark:bg-yellow-500/20',
    borderClass: 'border-yellow-500/50',
    textClass: 'text-yellow-400 font-bold',
    ringClass: 'ring-1 ring-yellow-500/30 shadow-[0_0_12px_rgba(234,179,8,0.25)]',
  },
  DEADLOCK_DETECTED: {
    label: 'DEADLOCK DETECTED',
    description: 'Produced ONLY by Detection Algorithm: active circular wait / deadlock exists right now where processes are permanently blocked.',
    icon: Lock,
    bgClass: 'bg-red-500/20 dark:bg-red-500/25',
    borderClass: 'border-red-500/60',
    textClass: 'text-red-400 font-extrabold',
    ringClass: 'ring-1 ring-red-500/40 shadow-[0_0_16px_rgba(239,68,68,0.35)]',
  },
  INVALID_INPUT: {
    label: 'INVALID INPUT',
    description: 'Input violates OS integrity constraints (negative values, non-existent process, or request exceeding declared maximum claim).',
    icon: AlertCircle,
    bgClass: 'bg-slate-500/15 dark:bg-slate-500/20',
    borderClass: 'border-slate-500/50',
    textClass: 'text-slate-300 font-bold',
    ringClass: 'ring-1 ring-slate-500/30',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showDescription = false,
  customLabel,
}) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.INVALID_INPUT;
  const Icon = config.icon;
  const textToDisplay = customLabel || config.label;

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1 gap-1.5',
    md: 'text-sm px-3.5 py-1.5 gap-2',
    lg: 'text-base px-4 py-2 gap-2.5',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div className="inline-flex flex-col">
      <div
        className={`inline-flex items-center rounded-full border ${config.bgClass} ${config.borderClass} ${config.textClass} ${config.ringClass} ${sizeClasses[size]} transition-all duration-300`}
        role="status"
        aria-label={`System Status: ${textToDisplay}`}
      >
        <Icon className={`${iconSizes[size]} shrink-0`} />
        <span>{textToDisplay}</span>
      </div>
      {showDescription && (
        <p className="mt-1 text-xs text-slate-400 max-w-xs">{config.description}</p>
      )}
    </div>
  );
};

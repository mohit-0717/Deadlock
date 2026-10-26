import React from 'react';
import { ShieldCheck, ShieldAlert, Clock, Lock, AlertCircle, RefreshCw, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { SystemStatus, CheckStatus } from '../engine/types.js';

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
    dotClass: string;
  }
> = {
  SAFE: {
    label: 'Safe State',
    description: 'System invariant satisfied: verified safe execution sequence exists.',
    icon: ShieldCheck,
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
    textClass: 'text-emerald-800',
    dotClass: 'bg-emerald-600',
  },
  UNSAFE: {
    label: 'Unsafe State',
    description: 'Trial allocation cannot guarantee completion. Rollback triggered.',
    icon: ShieldAlert,
    bgClass: 'bg-rose-50',
    borderClass: 'border-rose-200',
    textClass: 'text-rose-800',
    dotClass: 'bg-rose-600 animate-pulse',
  },
  WAITING: {
    label: 'Waiting (Queued)',
    description: 'Request is within Need but exceeds Available. State preserved.',
    icon: Clock,
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
    textClass: 'text-amber-800',
    dotClass: 'bg-amber-600',
  },
  DEADLOCK_DETECTED: {
    label: 'Deadlock Detected',
    description: 'Circular wait confirmed in Wait-For Graph. Preemption required.',
    icon: Lock,
    bgClass: 'bg-rose-50',
    borderClass: 'border-rose-300',
    textClass: 'text-rose-900',
    dotClass: 'bg-rose-600 animate-ping',
  },
  INVALID_INPUT: {
    label: 'Invalid Input',
    description: 'Request violates format, bounds, or declared maximum claim.',
    icon: AlertCircle,
    bgClass: 'bg-rose-50',
    borderClass: 'border-rose-200',
    textClass: 'text-rose-800',
    dotClass: 'bg-rose-500',
  },
  ANALYSIS_OUT_OF_DATE: {
    label: 'Analysis Out of Date',
    description: 'Inputs have changed since this analysis was calculated. Re-evaluation required.',
    icon: RefreshCw,
    bgClass: 'bg-amber-50/80',
    borderClass: 'border-amber-300',
    textClass: 'text-amber-900',
    dotClass: 'bg-amber-500 animate-pulse',
  },
};

export const CHECK_STATUS_CONFIG: Record<
  CheckStatus,
  {
    label: string;
    bgClass: string;
    borderClass: string;
    textClass: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  PASSED: {
    label: 'PASSED',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-300',
    textClass: 'text-emerald-800 font-bold',
    icon: CheckCircle2,
  },
  FAILED: {
    label: 'FAILED',
    bgClass: 'bg-rose-50',
    borderClass: 'border-rose-300',
    textClass: 'text-rose-800 font-bold',
    icon: XCircle,
  },
  WAITING: {
    label: 'WAITING (DEFERRED)',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-300',
    textClass: 'text-amber-800 font-bold',
    icon: Clock,
  },
  NOT_EVALUATED: {
    label: 'NOT EVALUATED',
    bgClass: 'bg-slate-100',
    borderClass: 'border-slate-300',
    textClass: 'text-slate-500 font-semibold',
    icon: MinusCircle,
  },
};

export const CheckStatusBadge: React.FC<{ status: CheckStatus; customText?: string }> = ({
  status,
  customText,
}) => {
  const cfg = CHECK_STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border ${cfg.bgClass} ${cfg.borderClass} ${cfg.textClass}`}
    >
      <Icon className="w-3 h-3 shrink-0" />
      <span>{customText || cfg.label}</span>
    </span>
  );
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
    md: 'text-xs px-3 py-1.5 gap-2',
    lg: 'text-sm px-3.5 py-1.5 gap-2',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-4 h-4',
  };

  return (
    <div className="inline-flex flex-col">
      <div
        className={`inline-flex items-center rounded-lg border font-sans font-semibold shadow-2xs ${config.bgClass} ${config.borderClass} ${config.textClass} ${sizeClasses[size]} transition-colors`}
        role="status"
        aria-label={`System Status: ${textToDisplay}`}
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${config.dotClass}`} />
        <Icon className={`${iconSizes[size]} shrink-0`} />
        <span className="tracking-tight">{textToDisplay}</span>
      </div>
      {showDescription && (
        <p className="mt-1 text-xs text-slate-500 max-w-xs font-sans">{config.description}</p>
      )}
    </div>
  );
};

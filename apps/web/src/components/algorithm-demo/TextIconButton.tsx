'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type TextIconButtonProps = {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  type?: 'button' | 'submit';
};

const sizeClasses: Record<NonNullable<TextIconButtonProps['size']>, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  default: 'h-9 px-4 py-2 text-sm gap-2',
  lg: 'h-10 px-5 text-sm gap-2',
};

const variantClasses: Record<NonNullable<TextIconButtonProps['variant']>, string> = {
  default:
    'bg-primary text-on-primary shadow hover:bg-primary-hover',
  outline:
    'border border-border bg-background hover:bg-accent hover:text-accent-foreground',
  ghost:
    'hover:bg-accent hover:text-accent-foreground',
};

export function TextIconButton({
  icon: Icon,
  label,
  onClick,
  variant = 'default',
  size = 'default',
  disabled = false,
  loading = false,
  className,
  type = 'button',
}: TextIconButtonProps) {
  const DisplayIcon = loading ? Loader2 : Icon;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
    >
      <DisplayIcon className={cn('h-4 w-4 shrink-0', loading && 'animate-spin')} />
      <span>{loading ? '加载中...' : label}</span>
    </button>
  );
}
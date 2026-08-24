'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export type OneSegmentedProps<T extends string = string> = {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

export function OneSegmented<T extends string = string>({
  options,
  value,
  onChange,
  className,
}: OneSegmentedProps<T>) {
  return (
    <div
      className={cn(
        'inline-flex h-9 items-center rounded-lg bg-muted p-1',
        className,
      )}
      role="radiogroup"
    >
      {options.map(option => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
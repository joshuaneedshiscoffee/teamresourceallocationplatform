import { cn } from '@/utils/cn';

interface AvatarProps {
  initials: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar({ initials, size = 'md', className }: AvatarProps) {
  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 font-semibold text-slate-700',
        size === 'sm' && 'h-7 w-7 text-[11px]',
        size === 'md' && 'h-8 w-8 text-xs',
        size === 'lg' && 'h-11 w-11 text-sm',
        className
      )}
    >
      {initials}
    </div>
  );
}

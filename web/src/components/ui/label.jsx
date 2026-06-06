import { cn } from '@/lib/utils';

export function Label({ className, ...props }) {
  return (
    <label
      className={cn('text-xs uppercase tracking-wider text-muted-foreground font-medium', className)}
      {...props}
    />
  );
}

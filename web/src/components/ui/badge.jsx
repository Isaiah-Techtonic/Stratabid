import { cn } from '@/lib/utils';

const statusStyles = {
  draft: 'bg-secondary text-muted-foreground',
  scheduled: 'bg-gold/20 text-gold-bright',
  live: 'bg-destructive/20 text-red-300',
  paused: 'bg-yellow-500/20 text-yellow-300',
  completed: 'bg-green-600/20 text-green-300',
  cancelled: 'bg-secondary text-muted-foreground',
  submitted: 'bg-gold/20 text-gold-bright',
  approved: 'bg-green-600/20 text-green-300',
  rejected: 'bg-destructive/20 text-red-300',
};

export function Badge({ className, status, children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide',
        status ? statusStyles[status] || 'bg-secondary text-muted-foreground' : 'bg-gold text-navy-deep',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

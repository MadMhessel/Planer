import type { HTMLAttributes } from 'react';
import clsx from 'clsx';

type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  name: string;
  src?: string;
  size?: AvatarSize;
  status?: 'online' | 'offline';
}

const sizeMap: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

export const Avatar = ({ className, name, src, size = 'md', status, ...props }: AvatarProps) => {
  const initials = name
    .split(' ')
    .map((chunk) => chunk[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={clsx('relative inline-flex shrink-0', className)} {...props}>
      {src ? (
        <img src={src} alt={name} loading="lazy" className={clsx('rounded-full object-cover', sizeMap[size])} />
      ) : (
        <span
          className={clsx(
            'inline-flex items-center justify-center rounded-full bg-gradient-to-br from-violet-200 to-cyan-200 font-semibold text-slate-700',
            sizeMap[size],
          )}
        >
          {initials}
        </span>
      )}
      {status ? (
        <span
          className={clsx(
            'absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white',
            status === 'online' ? 'bg-emerald-500' : 'bg-slate-300',
          )}
        />
      ) : null}
    </div>
  );
};

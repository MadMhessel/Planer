import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  actions?: ReactNode;
  hoverable?: boolean;
  padded?: boolean;
  animate?: boolean;
}

export const Card = ({
  className,
  title,
  description,
  actions,
  hoverable = false,
  padded = true,
  animate = false,
  children,
  ...props
}: CardProps) => {
  const classes = clsx(
    'rounded-card border border-slate-200 bg-white shadow-soft',
    padded && 'p-4',
    hoverable && 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
    className,
  );

  const content = (
    <>
      {(title || description || actions) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="space-y-1">
            {title ? <h3 className="text-base font-semibold text-slate-900">{title}</h3> : null}
            {description ? <p className="text-sm text-slate-500">{description}</p> : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      )}
      {children}
    </>
  );

  if (animate) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }}>
        <div className={classes} {...props}>
          {content}
        </div>
      </motion.div>
    );
  }

  return (
    <div className={classes} {...props}>
      {content}
    </div>
  );
};

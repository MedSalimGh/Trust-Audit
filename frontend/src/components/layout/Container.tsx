import React from 'react';
import { cn } from '../../lib/cn';

type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: ContainerSize;
}

const sizeClasses: Record<ContainerSize, string> = {
  sm: 'max-w-3xl',
  md: 'max-w-5xl',
  lg: 'max-w-7xl',
  xl: 'max-w-[1440px]',
  full: 'max-w-full',
};

export const Container: React.FC<ContainerProps> = ({ size = 'xl', className, children, ...props }) => (
  <div className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8', sizeClasses[size], className)} {...props}>
    {children}
  </div>
);

type SectionSpacing = 'sm' | 'md' | 'lg';

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  spacing?: SectionSpacing;
}

const spacingClasses: Record<SectionSpacing, string> = {
  sm: 'py-6',
  md: 'py-10',
  lg: 'py-16',
};

export const Section: React.FC<SectionProps> = ({ spacing = 'md', className, children, ...props }) => (
  <section className={cn(spacingClasses[spacing], className)} {...props}>
    {children}
  </section>
);

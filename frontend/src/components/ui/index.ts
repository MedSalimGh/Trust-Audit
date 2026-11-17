// ─── TrustAudit UI Component Library ────────────────────────────────────────
// Phase 2 — Core component kit with "The Vault" glassmorphism design system.

// Primitives
export { GlassCard } from './GlassCard';
export { Button } from './Button';
export { Badge } from './Badge';
export { Input, Textarea } from './Input';
export { Skeleton, SkeletonCard, SkeletonRow } from './Skeleton';

// Radix composites
export {
  Dialog, DialogTrigger, DialogClose, DialogOverlay,
  DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from './Dialog';
export {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from './DropdownMenu';
export { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from './Tooltip';
export { ToastProvider, useToast } from './Toast';

// Domain components
export { HashDisplay } from './HashDisplay';
export { StatusDot } from './StatusDot';
export { TransactionStatus } from './TransactionStatus';
export { EmptyState } from './EmptyState';
export { RiskBadge } from './RiskBadge';
export { RoleBadge } from './RoleBadge';
export { TimestampDisplay } from './TimestampDisplay';
export { PageHeader } from './PageHeader';

// Error handling
export { ErrorBoundary } from './ErrorBoundary';

// Animation
export { AnimatedSection, StaggerContainer, StaggerItem } from './AnimatedSection';
export { ScrollReveal } from './ScrollReveal';
export { StaggerText } from './StaggerText';

// Layout
export { Container, Section } from '../layout/Container';

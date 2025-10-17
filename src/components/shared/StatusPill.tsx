import type { Book, BookStatusPillDetail, BookStatusVariant } from '@/types';
import { cn } from '@/lib/utils';
import { AlertTriangle, BookOpenCheck, CheckCircle, Clock, Gift, HelpCircle, Loader2, XCircle, BellRing } from 'lucide-react';

const getStatusDetails = (book: Book): BookStatusPillDetail => {
  const now = new Date();
  let variant: BookStatusVariant = book.status as BookStatusVariant; // Default to book.status

  if (book.status === 'issued' && book.issueDetails) {
    const dueDate = new Date(book.issueDetails.dueDate);
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) variant = 'overdue';
    else if (diffDays <= 3) variant = 'due_soon'; // Adjusted to 3 days for "due soon"
    else variant = 'issued';
  } else if (book.status === 'donated_pending_approval') {
    variant = 'pending_approval';
  } else if (book.status === 'donated_approved') {
    // If it's donated approved, we treat it as 'available' for pill purposes
    variant = 'available';
  } else if (book.status === 'issue_requested') {
    variant = 'issue_requested';
  }

  switch (variant) {
    case 'available':
      return { text: 'Available', bgColorClass: 'bg-green-100 dark:bg-green-900', textColorClass: 'text-green-700 dark:text-green-300', icon: CheckCircle };
    case 'issued':
      return { text: 'Issued', bgColorClass: 'bg-blue-100 dark:bg-blue-900', textColorClass: 'text-blue-700 dark:text-blue-300', icon: BookOpenCheck };
    case 'overdue':
      return { text: 'Overdue', bgColorClass: 'bg-red-100 dark:bg-red-900', textColorClass: 'text-red-700 dark:text-red-300', icon: AlertTriangle };
    case 'due_soon':
      return { text: 'Due Soon', bgColorClass: 'bg-yellow-100 dark:bg-yellow-800', textColorClass: 'text-yellow-700 dark:text-yellow-200', icon: Clock };
    case 'pending_approval':
      return { text: 'Pending Approval', bgColorClass: 'bg-purple-100 dark:bg-purple-900', textColorClass: 'text-purple-700 dark:text-purple-300', icon: HelpCircle };
    case 'issue_requested':
      return { text: 'Issue Requested', bgColorClass: 'bg-orange-100 dark:bg-orange-900', textColorClass: 'text-orange-700 dark:text-orange-300', icon: BellRing };
    case 'donated': // This case is mostly for logic, UI might show 'Available'
      return { text: 'Donated', bgColorClass: 'bg-teal-100 dark:bg-teal-900', textColorClass: 'text-teal-700 dark:text-teal-300', icon: Gift };
    case 'lost':
      return { text: 'Lost', bgColorClass: 'bg-slate-200 dark:bg-slate-700', textColorClass: 'text-slate-600 dark:text-slate-300', icon: XCircle };
    case 'maintenance':
        return { text: 'Maintenance', bgColorClass: 'bg-orange-100 dark:bg-orange-900', textColorClass: 'text-orange-700 dark:text-orange-300', icon: Loader2 };
    default:
      return { text: book.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), bgColorClass: 'bg-gray-100 dark:bg-gray-700', textColorClass: 'text-gray-600 dark:text-gray-300' };
  }
};

interface StatusPillProps {
  book: Book;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusPill({ book, size = 'md', className }: StatusPillProps) {
  const details = getStatusDetails(book);
  const IconComponent = details.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        details.bgColorClass,
        details.textColorClass,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        className
      )}
    >
      {IconComponent && <IconComponent className={cn('h-3.5 w-3.5', size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />}
      {details.text}
    </span>
  );
}

import Link from 'next/link';
import type { CrossSpaceSummary } from '@/lib/api/finance-types';
import {
  crossSpaceSummaryHref,
  crossSpaceSummaryLabel,
} from '@/lib/finance/cross-space-summary-view';
import styles from './finance-forms.module.css';

type CrossSpaceSummaryBadgeProps = {
  summary: CrossSpaceSummary;
};

export function CrossSpaceSummaryBadge({ summary }: CrossSpaceSummaryBadgeProps) {
  const href = crossSpaceSummaryHref(summary);
  return (
    <p className={styles.meta}>
      <Link href={href}>{crossSpaceSummaryLabel(summary)}</Link>
    </p>
  );
}
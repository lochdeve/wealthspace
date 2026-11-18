'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { consumptionReportHref } from '@/lib/finance/routes';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import styles from '@/components/finance/finance-forms.module.css';

type ConsumptionMonthFormProps = {
  spaceId: string;
  year: number;
  month: number;
};

export function ConsumptionMonthForm({ spaceId, year, month }: ConsumptionMonthFormProps) {
  const router = useRouter();
  const [nextYear, setNextYear] = useState(String(year));
  const [nextMonth, setNextMonth] = useState(String(month));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const y = Number.parseInt(nextYear, 10);
    const m = Number.parseInt(nextMonth, 10);
    if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
      return;
    }
    router.push(consumptionReportHref(spaceId, { year: y, month: m }));
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.inlineActions}>
        <Field id="report-year" label="Año">
          <TextInput
            id="report-year"
            value={nextYear}
            onChange={(event) => setNextYear(event.target.value)}
            inputMode="numeric"
          />
        </Field>
        <Field id="report-month" label="Mes (1–12)">
          <TextInput
            id="report-month"
            value={nextMonth}
            onChange={(event) => setNextMonth(event.target.value)}
            inputMode="numeric"
          />
        </Field>
        <Button type="submit" variant="secondary">
          Ver informe
        </Button>
      </div>
    </form>
  );
}
'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { createAccount } from '@/lib/api/accounts';
import { ApiError } from '@/lib/api/errors';
import { financeActionErrorMessage } from '@/lib/finance/finance-messages';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import styles from './finance-forms.module.css';
import ui from '@/components/ui/ui.module.css';

type CreateAccountFormProps = {
  spaceId: string;
  defaultCurrency?: string;
};

export function CreateAccountForm({ spaceId, defaultCurrency = 'EUR' }: CreateAccountFormProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!name.trim()) {
      errors.name = 'Introduce un nombre.';
    }
    if (!/^[A-Z]{3}$/.test(currency.trim().toUpperCase())) {
      errors.currency = 'Moneda ISO 4217 de 3 letras (p. ej. EUR).';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!validate()) {
      return;
    }
    setPending(true);
    try {
      const account = await createAccount(spaceId, {
        name: name.trim(),
        currency: currency.trim().toUpperCase(),
      });
      router.push(`/spaces/${spaceId}/accounts/${account.id}`);
      router.refresh();
    } catch (error) {
      setFormError(financeActionErrorMessage(error));
      if (error instanceof ApiError && error.statusCode === 401) {
        setFormError('Sesión caducada. Vuelve a iniciar sesión.');
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {formError ? (
        <p className={ui.alert} role="alert">
          {formError}
        </p>
      ) : null}
      <Field id="account-name" label="Nombre" error={fieldErrors.name}>
        <TextInput
          id="account-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          hasError={Boolean(fieldErrors.name)}
          disabled={pending}
          required
        />
      </Field>
      <Field id="account-currency" label="Moneda" error={fieldErrors.currency}>
        <TextInput
          id="account-currency"
          value={currency}
          onChange={(event) => setCurrency(event.target.value)}
          hasError={Boolean(fieldErrors.currency)}
          disabled={pending}
          required
          maxLength={3}
          autoCapitalize="characters"
        />
      </Field>
      <p className={styles.meta}>La moneda no se puede cambiar después de crear la cuenta.</p>
      <Button type="submit" disabled={pending}>
        {pending ? 'Creando…' : 'Crear cuenta'}
      </Button>
    </form>
  );
}

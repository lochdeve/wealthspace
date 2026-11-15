'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { createSharedSpace } from '@/lib/api/spaces';
import { userErrorMessage } from '@/lib/api/errors';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import styles from './spaces-forms.module.css';
import ui from '@/components/ui/ui.module.css';
import { setActiveSpaceId } from '@/lib/spaces/active-space.server';

export function CreateSpaceForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [displayCurrency, setDisplayCurrency] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!name.trim()) {
      errors.name = 'Indica un nombre para el espacio.';
    }
    if (displayCurrency.trim() && !/^[A-Za-z]{3}$/.test(displayCurrency.trim())) {
      errors.displayCurrency = 'Usa un código ISO de 3 letras (p. ej. EUR).';
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
      const payload: { name: string; displayCurrency?: string } = {
        name: name.trim(),
      };
      const currency = displayCurrency.trim().toUpperCase();
      if (currency) {
        payload.displayCurrency = currency;
      }
      const space = await createSharedSpace(payload);
      await setActiveSpaceId(space.id);
      router.replace(`/spaces/${space.id}`);
      router.refresh();
    } catch (error) {
      setFormError(userErrorMessage(error, {}, 'No se pudo crear el espacio.'));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h1 className={styles.title}>Nuevo espacio compartido</h1>
      {formError ? (
        <p className={ui.alert} role="alert">
          {formError}
        </p>
      ) : null}
      <Field id="name" label="Nombre" error={fieldErrors.name}>
        <TextInput
          id="name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          hasError={Boolean(fieldErrors.name)}
          disabled={pending}
          required
        />
      </Field>
      <Field
        id="displayCurrency"
        label="Moneda de visualización (opcional)"
        hint="ISO 4217, p. ej. EUR. Afecta informes del espacio."
        error={fieldErrors.displayCurrency}
      >
        <TextInput
          id="displayCurrency"
          name="displayCurrency"
          value={displayCurrency}
          onChange={(event) => setDisplayCurrency(event.target.value)}
          hasError={Boolean(fieldErrors.displayCurrency)}
          disabled={pending}
          autoComplete="off"
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? 'Creando…' : 'Crear espacio'}
      </Button>
    </form>
  );
}

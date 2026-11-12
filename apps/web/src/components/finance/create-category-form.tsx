'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { createCategory } from '@/lib/api/categories';
import type { Category, CategoryType } from '@/lib/api/finance-types';
import { financeActionErrorMessage } from '@/lib/finance/finance-messages';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import styles from './finance-forms.module.css';
import ui from '@/components/ui/ui.module.css';

type CreateCategoryFormProps = {
  spaceId: string;
  defaultType?: CategoryType;
  existingCategories?: Category[];
};

export function CreateCategoryForm({
  spaceId,
  defaultType = 'EXPENSE',
  existingCategories = [],
}: CreateCategoryFormProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>(defaultType);
  const [parentId, setParentId] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const errors: Record<string, string> = {};
    if (!name.trim()) {
      errors.name = 'Introduce un nombre.';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setPending(true);
    try {
      await createCategory(spaceId, {
        name: name.trim(),
        type,
        parentId: parentId || undefined,
      });
      setName('');
      router.refresh();
    } catch (error) {
      setFormError(financeActionErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h3 className={styles.sectionTitle}>Nueva categoría</h3>
      {formError ? (
        <p className={ui.alert} role="alert">
          {formError}
        </p>
      ) : null}
      <Field id="category-name" label="Nombre" error={fieldErrors.name}>
        <TextInput
          id="category-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          hasError={Boolean(fieldErrors.name)}
          disabled={pending}
          required
        />
      </Field>
      <Field id="category-type" label="Tipo">
        <select
          id="category-type"
          className={styles.selectNative}
          value={type}
          onChange={(event) => {
            setType(event.target.value as CategoryType);
            setParentId('');
          }}
          disabled={pending}
        >
          <option value="INCOME">Ingreso</option>
          <option value="EXPENSE">Gasto</option>
        </select>
      </Field>
      {existingCategories.filter((row) => row.type === type).length > 0 ? (
        <Field id="category-parent" label="Categoría padre (opcional)">
          <select
            id="category-parent"
            className={styles.selectNative}
            value={parentId}
            onChange={(event) => setParentId(event.target.value)}
            disabled={pending}
          >
            <option value="">Ninguna</option>
            {existingCategories
              .filter((row) => row.type === type)
              .map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
          </select>
        </Field>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? 'Creando…' : 'Crear categoría'}
      </Button>
    </form>
  );
}

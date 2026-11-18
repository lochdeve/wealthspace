'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import { listSpaces } from '@/lib/api/spaces';
import type { SpaceListItem } from '@/lib/api/space-types';
import { setActiveSpaceId } from '@/lib/spaces/active-space.server';
import styles from './space-switcher.module.css';

type SpaceSwitcherProps = {
  activeSpaceId: string | null;
};

export function SpaceSwitcher({ activeSpaceId }: SpaceSwitcherProps) {
  const router = useRouter();
  const [spaces, setSpaces] = useState<SpaceListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await listSpaces();
        if (!cancelled) {
          setSpaces(data);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onChange = useCallback(
    async (event: ChangeEvent<HTMLSelectElement>) => {
      const nextId = event.target.value;
      if (!nextId) {
        return;
      }
      await setActiveSpaceId(nextId);
      router.push(`/spaces/${nextId}`);
      router.refresh();
    },
    [router],
  );

  if (loading) {
    return (
      <span className={styles.wrapper} aria-live="polite">
        Espacios…
      </span>
    );
  }

  if (spaces.length === 0) {
    return null;
  }

  const value =
    activeSpaceId && spaces.some((s) => s.id === activeSpaceId) ? activeSpaceId : spaces[0]?.id;

  return (
    <label className={styles.wrapper}>
      <span className={styles.srOnly}>Espacio activo</span>
      <select
        className={styles.select}
        value={value}
        onChange={onChange}
        aria-label="Espacio activo"
      >
        {spaces.map((space) => (
          <option key={space.id} value={space.id}>
            {space.name}
          </option>
        ))}
      </select>
    </label>
  );
}

'use client';

import { useEffect, useRef } from 'react';
import { setActiveSpaceId } from '@/lib/spaces/active-space.server';

type SyncActiveSpaceProps = {
  spaceId: string;
};

/** Persists active space via Server Action (required by Next.js cookie rules). */
export function SyncActiveSpace({ spaceId }: SyncActiveSpaceProps) {
  const lastSyncedId = useRef<string | null>(null);

  useEffect(() => {
    if (!spaceId || lastSyncedId.current === spaceId) {
      return;
    }
    lastSyncedId.current = spaceId;
    void setActiveSpaceId(spaceId).catch(() => {
      lastSyncedId.current = null;
    });
  }, [spaceId]);

  return null;
}

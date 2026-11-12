'use client';

import { useEffect } from 'react';
import { setActiveSpaceId } from '@/lib/spaces/active-space.server';

type SyncActiveSpaceProps = {
  spaceId: string;
};

/** Persists active space via Server Action (required by Next.js cookie rules). */
export function SyncActiveSpace({ spaceId }: SyncActiveSpaceProps) {
  useEffect(() => {
    void setActiveSpaceId(spaceId);
  }, [spaceId]);

  return null;
}

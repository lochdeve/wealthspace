import type { SpaceListItem } from '@/lib/api/space-types';
import { getActiveSpaceId } from '@/lib/spaces/active-space.server';

/** Pick active space id from cookie when still a member; else personal or first space. */
export async function resolveActiveSpaceId(
  spaces: SpaceListItem[],
  personalSpaceId: string | undefined,
): Promise<string | null> {
  if (spaces.length === 0) {
    return null;
  }
  const stored = await getActiveSpaceId();
  if (stored && spaces.some((space) => space.id === stored)) {
    return stored;
  }
  const personal = spaces.find((space) => space.id === personalSpaceId);
  if (personal) {
    return personal.id;
  }
  return spaces[0]?.id ?? null;
}

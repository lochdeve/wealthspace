import { redirect } from 'next/navigation';
import { getCurrentUser, requireUser } from '@/lib/auth/session.server';

/** Entry from nav — slice 1 targets the user's PERSONAL space. */
export default async function AccountsEntryPage() {
  await requireUser();
  const user = await getCurrentUser();
  if (!user?.personalSpaceId) {
    redirect('/spaces');
  }
  redirect(`/spaces/${user.personalSpaceId}/accounts`);
}

import { CreateSpaceForm } from '@/components/spaces/create-space-form';
import { requireUser } from '@/lib/auth/session.server';

export default async function NewSpacePage() {
  await requireUser();
  return <CreateSpaceForm />;
}

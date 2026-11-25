import { redirect } from 'next/navigation';

export default async function LegacyAuthorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect('/admin-v2/articles/redacteurs/' + encodeURIComponent(id));
}

import { redirect } from 'next/navigation';

export default function LegacyAuthorsPage() {
  redirect('/admin-v2/articles?vue=redacteurs');
}

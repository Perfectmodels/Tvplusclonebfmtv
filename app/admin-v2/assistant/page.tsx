import { redirect } from 'next/navigation';

export default function AssistantPage() {
  redirect('/recherche?assistant=1');
}

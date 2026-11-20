import ArticleStudio from '../../../../../components/editor/ArticleStudio';

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ArticleStudio id={id} />;
}

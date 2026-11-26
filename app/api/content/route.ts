import { getPrograms, getTestimonials, getVideos, getPodcasts, getChannels } from '../../../lib/db/repository';
import { handleRoute, ok } from '../../../lib/api/response';

export const dynamic = 'force-dynamic';

export const GET = handleRoute(async () => {
  const [videos, programs, podcasts, channels, testimonials] = await Promise.all([
    getVideos(), getPrograms(), getPodcasts(), getChannels(), getTestimonials(),
  ]);
  return ok({ videos, programs, podcasts, channels, testimonials });
});

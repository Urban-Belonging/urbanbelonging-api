import { Application, Request, Response } from 'express';
import { FilterQuery, LeanDocument } from 'mongoose';
import { AuthenticatedRequest } from '../@types/auth';
import { authenticatedRoute } from '../lib/express-middleware/authenticated';
import { Photo } from '../models/Photo';
import { PhotoEvent, PhotoEventModel } from '../models/PhotoEvent';
import { ModelRepositories } from '../models/repositories';
import { UserGroupWithACL } from '../models/UserGroup';

interface PhotoEventWithMetadata extends LeanDocument<Omit<PhotoEvent, 'group'>> {
  group: UserGroupWithACL;
  isActive: boolean;
  photos: (Pick<Photo, 'imageUrl' | 'thumbnails'> & { id: string })[];
  photoCount: number;
}

export default (app: Application): void => {
  app.get(
    '/v1/feed',
    authenticatedRoute,
    async (
      req: AuthenticatedRequest<Request<{}, { events: PhotoEventWithMetadata[] }>>,
      res: Response<{ events: PhotoEventWithMetadata[] }>
    ) => {
      try {
        // @todo cache groups per user
        const participatingGroups = await ModelRepositories.UserGroup.listForUser(req.user.id);

        if (participatingGroups.length === 0) {
          return res.success({
            events: []
          });
        }

        const events: PhotoEvent[] = [];
        const activeEvents = await ModelRepositories.PhotoEvent.listActiveForGroups(
          participatingGroups.map((group) => group.id)
        );
        events.push(...activeEvents);

        const inactiveQuery: FilterQuery<PhotoEvent> = {
          $or: participatingGroups.map((group) => ({ group: group.id }))
        };

        if (activeEvents.length > 0) {
          inactiveQuery._id = {
            $nin: activeEvents.map((event) => event._id)
          };
        }

        // @todo add pagination
        const inactiveEvents = await PhotoEventModel.find(inactiveQuery)
          .sort({
            endsAt: -1
          })
          .limit(20);

        events.push(...inactiveEvents);

        const groupMap = participatingGroups.reduce<Record<string, UserGroupWithACL>>((result, group) => {
          result[group.id] = group;
          return result;
        }, {});

        const eventsWithMetadata: PhotoEventWithMetadata[] = [];

        for (const event of events) {
          const { photos, count } = await ModelRepositories.Photo.listForUserInEvent(event.id, req.user.id, {
            skip: 0,
            limit: 4
          });
          eventsWithMetadata.push({
            ...event.toObject(),
            group: groupMap[event.group.toString()],
            isActive: getEventActiveStatus(event),
            photos: photos.map((photo) => ({
              id: photo.id as string,
              imageUrl: photo.imageUrl,
              thumbnails: photo.thumbnails
            })),
            photoCount: count
          });
        }

        res.success({
          events: eventsWithMetadata.sort((a, b) => {
            if (a.isActive && !b.isActive) return -1;
            if (b.isActive && !a.isActive) return 1;
            return b.createdAt.valueOf() - a.createdAt.valueOf();
          })
        });
      } catch (err) {
        res.error(err);
      }
    }
  );
};

function getEventActiveStatus(event: PhotoEvent): boolean {
  const now = Date.now();
  let isActive = false;

  if (event.contributionPeriodStartsAt.valueOf() < now && event.contributionPeriodEndsAt.valueOf() > now) {
    isActive = true;
  }
  if (event.reactionPeriodStartsAt.valueOf() < now && event.reactionPeriodEndsAt.valueOf() > now) {
    isActive = true;
  }

  return isActive;
}

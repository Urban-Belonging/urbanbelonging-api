import { Application, Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { AuthenticatedRequest } from '../@types/auth';
import { PaginationRequest } from '../@types/pagination';
import { constructAssetUrl } from '../lib/cdn';
import { authenticatedRoute } from '../lib/express-middleware/authenticated';
import { handleValidationError } from '../lib/express-middleware/handleValidationError';
import pagination from '../lib/express-middleware/pagination';
import { handlePhotoUpload } from '../lib/express-middleware/uploadPhoto';
import { BadRequestError } from '../lib/http/HTTPError';
import { LocationDataPointWithTimestamp } from '../lib/location/types';
import { PhotoEventCache } from '../lib/photo-event-monitor/cache';
import { PhotoProcessing } from '../lib/photo-processing';
import { Photo, PhotoWithUserReactionStatus } from '../models/Photo';
import { PhotoEvent } from '../models/PhotoEvent';
import { PhotoEventWalk, PhotoEventWalkWithPhotos } from '../models/PhotoEventWalk';
import { ModelRepositories } from '../models/repositories';
import { UserGroup } from '../models/UserGroup';

export default (app: Application): void => {
  app.post(
    '/v1/photo-event',
    authenticatedRoute,
    body('name').isLength({ min: 1 }),
    body('group').isMongoId(),
    body('contributionPeriodStartsAt').isISO8601(),
    body('contributionPeriodEndsAt').isISO8601(),
    body('reactionPeriodStartsAt').isISO8601(),
    body('reactionPeriodEndsAt').isISO8601(),
    handleValidationError,
    async (
      req: AuthenticatedRequest<
        Request<
          {},
          PhotoEvent,
          {
            name: string;
            group: string;
            contributionPeriodStartsAt: string;
            contributionPeriodEndsAt: string;
            reactionPeriodStartsAt: string;
            reactionPeriodEndsAt: string;
          }
        >
      >,
      res: Response<PhotoEvent>
    ) => {
      try {
        await ModelRepositories.UserGroup.assertUserCanCreatePhotoEvents(req.body.group, req.user.id);
        const result = await ModelRepositories.PhotoEvent.create({
          name: req.body.name,
          group: req.body.group,
          contributionPeriodStartsAt: req.body.contributionPeriodStartsAt,
          contributionPeriodEndsAt: req.body.contributionPeriodEndsAt,
          reactionPeriodStartsAt: req.body.reactionPeriodStartsAt,
          reactionPeriodEndsAt: req.body.reactionPeriodEndsAt,
          createdBy: req.user.id
        });

        res.success(result);
      } catch (err) {
        res.error(err);
      }
    }
  );

  app.get(
    '/v1/photo-event',
    authenticatedRoute,
    // fix type warning
    // @ts-ignore
    query('group').isMongoId(),
    handleValidationError,
    async (
      req: AuthenticatedRequest<
        Request<
          {},
          {},
          {},
          {
            group: string;
          }
        >
      >,
      res: Response<PhotoEvent[]>
    ) => {
      try {
        await ModelRepositories.UserGroup.assertUserIsMember(req.query.group, req.user.id);
        const results = await ModelRepositories.PhotoEvent.list({
          group: req.query.group
        });
        res.success(results);
      } catch (err) {
        res.error(err);
      }
    }
  );

  app.get(
    '/v1/photo-event/:id/photos',
    authenticatedRoute,
    pagination,
    async (
      req: AuthenticatedRequest<
        PaginationRequest<
          Request<
            { id: string },
            PhotoWithUserReactionStatus[],
            {},
            {
              group?: string;
            }
          >
        >
      >,
      res: Response<PhotoWithUserReactionStatus[]>
    ) => {
      try {
        const { count, photos } = await ModelRepositories.Photo.listForUserInEvent(req.params.id, req.user.id, {
          skip: req.skip,
          limit: req.limit
        });

        req.total = count;
        res.success(photos);
      } catch (err) {
        res.error(err);
      }
    }
  );

  app.get(
    '/v1/photo-event/:id/walk/photos',
    authenticatedRoute,
    pagination,
    async (
      req: AuthenticatedRequest<
        Request<
          { id: string },
          {},
          {},
          {
            start: string;
            end: string;
          }
        >
      >,
      res: Response<Photo[]>
    ) => {
      try {
        if (!req.query.start || !req.query.end) throw new BadRequestError('Invalid date range');
        const parsedStart = new Date(req.query.start);
        const parsedEnd = new Date(req.query.end);

        if (isNaN(parsedStart.valueOf()) || isNaN(parsedEnd.valueOf())) throw new BadRequestError('Invalid date range');

        const photos = await ModelRepositories.Photo.listBetweenDates(
          req.params.id,
          req.user.id,
          parsedStart,
          parsedEnd
        );

        res.success(photos);
      } catch (err) {
        res.error(err);
      }
    }
  );

  app.get(
    '/v1/photo-event/:id',
    authenticatedRoute,
    async (req: AuthenticatedRequest<Request<{ id: string }>>, res: Response<PhotoEvent>) => {
      try {
        const result = await PhotoEventCache.get(req.params.id);

        await ModelRepositories.UserGroup.assertUserIsMember((result.group as UserGroup).id, req.user.id);

        res.success(result);
      } catch (err) {
        res.error(err);
      }
    }
  );

  app.post(
    '/v1/photo-event/:id/upload',
    authenticatedRoute,
    param('id').isMongoId(),
    handlePhotoUpload.single('photo'),
    async (req: AuthenticatedRequest<Request<{ id: string }, Photo>>, res: Response<Photo>) => {
      try {
        const file = req.file as Express.MulterS3.File;

        const result = await ModelRepositories.Photo.create({
          event: req.params.id,
          imageUrl: constructAssetUrl(file.key),
          createdBy: req.user.id
        });

        await PhotoProcessing.addToResizeQueue(result);

        res.success(result);
      } catch (err) {
        res.error(err);
      }
    }
  );

  app.post(
    '/v1/photo-event/:id/walk',
    authenticatedRoute,
    param('id').isMongoId(),
    async (
      req: AuthenticatedRequest<
        Request<
          { id: string },
          PhotoEventWalk,
          {
            name: string;
            startedAt: string;
            endedAt: string;
            distance: number;
            duration: number;
            locationData: LocationDataPointWithTimestamp<string>[];
          }
        >
      >,
      res: Response<PhotoEventWalk>
    ) => {
      try {
        const result = await ModelRepositories.PhotoEventWalk.create({
          name: req.body.name,
          event: req.params.id,
          locationData: req.body.locationData,
          distance: req.body.distance,
          duration: req.body.duration,
          createdBy: req.user.id,
          startedAt: req.body.startedAt,
          endedAt: req.body.endedAt
        });

        res.success(result);
      } catch (err) {
        res.error(err);
      }
    }
  );

  app.get(
    '/v1/photo-event/:id/walks',
    authenticatedRoute,
    param('id').isMongoId(),
    async (
      req: AuthenticatedRequest<Request<{ id: string }, PhotoEventWalkWithPhotos[]>>,
      res: Response<PhotoEventWalkWithPhotos[]>
    ) => {
      try {
        const result = await ModelRepositories.PhotoEventWalk.getForUserInEvent(req.params.id, req.user.id);
        res.success(result);
      } catch (err) {
        res.error(err);
      }
    }
  );

  app.get(
    '/v1/photo-event-walk/:id',
    authenticatedRoute,
    param('id').isMongoId(),
    async (req: AuthenticatedRequest<Request<{ id: string }, PhotoEventWalk>>, res: Response<PhotoEventWalk>) => {
      try {
        const result = await ModelRepositories.PhotoEventWalk.get(req.params.id);
        res.success(result);
      } catch (err) {
        res.error(err);
      }
    }
  );

  app.get(
    '/v1/photo-event/:id/random-photos',
    authenticatedRoute,
    param('id').isMongoId(),
    async (
      req: AuthenticatedRequest<Request<{ id: string }, { photos: Photo[]; remainingCount: number }>>,
      res: Response<{ photos: Photo[]; remainingCount: number }>
    ) => {
      try {
        const result = await ModelRepositories.Photo.listRandomForEvent(req.params.id, req.user);
        res.success(result);
      } catch (err) {
        res.error(err);
      }
    }
  );
};

import { Application, Request, Response } from 'express';
import { AuthenticatedRequest } from '../@types/auth';
import { apiKeyAuthenticated } from '../lib/express-middleware/apiKeyAuthenticated';
import { NotFoundError } from '../lib/http/HTTPError';
import { LeanPhotoWithoutId, PhotoModel } from '../models/Photo';
import { PhotoEvent, PhotoEventModel } from '../models/PhotoEvent';
import { PhotoEventWalk, PhotoEventWalkModel } from '../models/PhotoEventWalk';
import { PhotoReactionModel } from '../models/PhotoReaction';
import { ModelRepositories } from '../models/repositories';
import { User, UserModel } from '../models/User';
import { UserGroup, UserGroupModel } from '../models/UserGroup';
import { UserGroupMember } from '../models/UserGroupMembership';

export default (app: Application): void => {
  app.get(
    '/v1/export/photo-event/:id/analytics',
    apiKeyAuthenticated,
    async (
      req: AuthenticatedRequest<Request<{ id: string }>>,
      res: Response<{
        photoCount: number;
        reactionCount: number;
        walkCount: number;
        participants: Record<
          string,
          {
            photoCount: number;
            reactionCount: number;
            walkCount: number;
          }
        >;
      }>
    ) => {
      try {
        const event = await ModelRepositories.PhotoEvent.get(req.params.id);

        const photoCount = await PhotoModel.countDocuments({
          event: req.params.id
        });
        const reactionCount = await PhotoReactionModel.countDocuments({
          event: req.params.id
        });
        const walkCount = await PhotoEventWalkModel.countDocuments({
          event: req.params.id
        });

        const users = await ModelRepositories.UserGroup.listMembers(event.group as unknown as string);
        const participants: Record<
          string,
          {
            photoCount: number;
            reactionCount: number;
            walkCount: number;
          }
        > = {};

        for (const user of users) {
          const photoCountForUser = await PhotoModel.countDocuments({
            event: req.params.id,
            createdBy: user.id
          });
          const reactionCountForUser = await PhotoReactionModel.countDocuments({
            event: req.params.id,
            createdBy: user.id
          });
          const walkCountForUser = await PhotoEventWalkModel.countDocuments({
            event: req.params.id,
            createdBy: user.id
          });

          participants[user.username] = {
            photoCount: photoCountForUser,
            reactionCount: reactionCountForUser,
            walkCount: walkCountForUser
          };
        }

        res.success({ photoCount, reactionCount, walkCount, participants });
      } catch (err) {
        res.error(err);
      }
    }
  );

  app.get(
    '/v1/export/photo-event/:id/walks',
    apiKeyAuthenticated,
    async (
      req: AuthenticatedRequest<Request<{ id: string }>>,
      res: Response<{
        walks: PhotoEventWalk[];
      }>
    ) => {
      try {
        const photoEvent = await PhotoEventModel.findById(req.params.id);
        if (!photoEvent) throw new NotFoundError('PhotoEvent does not exist');

        const walks = await ModelRepositories.PhotoEventWalk.getForEvent(photoEvent.id);

        res.success({ walks });
      } catch (err) {
        res.error(err);
      }
    }
  );

  app.get(
    '/v1/export/photo-event/:id',
    apiKeyAuthenticated,
    async (
      req: AuthenticatedRequest<
        Request<
          { id: string },
          {
            photoEvent: PhotoEvent;
            userGroup: UserGroup;
            photos: LeanPhotoWithoutId[];
            members: UserGroupMember[];
          }
        >
      >,
      res: Response<{
        photoEvent: PhotoEvent;
        userGroup: UserGroup;
        photos: LeanPhotoWithoutId[];
        members: UserGroupMember[];
      }>
    ) => {
      try {
        const photoEvent = await PhotoEventModel.findById(req.params.id);
        if (!photoEvent) throw new NotFoundError('PhotoEvent does not exist');

        const userGroup = await UserGroupModel.findById(photoEvent.group);
        if (!userGroup) throw new NotFoundError('UserGroup does not exist');

        const members = await ModelRepositories.UserGroup.listMembers(userGroup.id);

        const photos = await PhotoModel.find({
          event: photoEvent._id
        })
          .populate('reactions')
          .lean();

        const formattedPhotos = photos.map((photo) => {
          return ModelRepositories.Photo.omitId(photo);
        });

        res.success({ photoEvent, userGroup, photos: formattedPhotos, members });
      } catch (err) {
        res.error(err);
      }
    }
  );

  app.get(
    '/v1/export/users',
    apiKeyAuthenticated,
    async (
      req: AuthenticatedRequest<Request>,
      res: Response<{
        users: User[];
      }>
    ) => {
      try {
        const users = await UserModel.find({}).skip(0).limit(500).sort({
          createdAt: -1
        });

        res.success({ users });
      } catch (err) {
        res.error(err);
      }
    }
  );

  app.get(
    '/v1/export/user-group/:id',
    apiKeyAuthenticated,
    async (
      req: AuthenticatedRequest<
        Request<
          { id: string },
          {
            members: UserGroupMember[];
            events: PhotoEvent[];
          }
        >
      >,
      res: Response<{
        members: UserGroupMember[];
        events: PhotoEvent[];
      }>
    ) => {
      try {
        const members = await ModelRepositories.UserGroup.listMembers(req.params.id);
        const events = await ModelRepositories.PhotoEvent.list({ group: req.params.id });
        res.success({ members, events });
      } catch (err) {
        res.error(err);
      }
    }
  );
};

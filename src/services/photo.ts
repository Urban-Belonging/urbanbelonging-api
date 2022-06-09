import { Application, Request, Response } from 'express';
import { param } from 'express-validator';
import { AuthenticatedRequest } from '../@types/auth';
import { authenticatedRoute } from '../lib/express-middleware/authenticated';
import { NotFoundError } from '../lib/http/HTTPError';
import { AnnotationAnswer, ReactionAnswer } from '../lib/prompts';
import { Photo, PhotoLocationData, PhotoModel } from '../models/Photo';
import { PhotoReaction } from '../models/PhotoReaction';
import { ModelRepositories } from '../models/repositories';

export default (app: Application): void => {
  app.get(
    '/v1/photo/:id',
    authenticatedRoute,
    async (req: AuthenticatedRequest<Request<{ id: string }>>, res: Response<Photo>) => {
      try {
        const result = await PhotoModel.findById(req.params.id);

        if (!result) throw new NotFoundError('Photo does not exist');

        res.success(result);
      } catch (err) {
        res.error(err);
      }
    }
  );

  app.post(
    '/v1/photo/:id/reaction',
    authenticatedRoute,
    async (
      req: AuthenticatedRequest<
        Request<
          { id: string },
          PhotoReaction,
          {
            answers: ReactionAnswer[];
          }
        >
      >,
      res: Response<PhotoReaction>
    ) => {
      try {
        const result = await ModelRepositories.PhotoReaction.create({
          answers: req.body.answers,
          photo: req.params.id,
          createdBy: req.user.id
        });

        res.success(result);
      } catch (err) {
        res.error(err);
      }
    }
  );

  app.get(
    '/v1/photo/:id/reactions',
    authenticatedRoute,
    async (req: AuthenticatedRequest<Request<{ id: string }, PhotoReaction[]>>, res: Response<PhotoReaction[]>) => {
      try {
        const result = await ModelRepositories.PhotoReaction.listForPhoto(req.params.id, req.user.id);
        res.success(result);
      } catch (err) {
        res.error(err);
      }
    }
  );

  app.put(
    '/v1/photo/:id/metadata',
    authenticatedRoute,
    param('id').isMongoId(),
    async (
      req: AuthenticatedRequest<Request<{ id: string }, Photo, { exifData: any; locationData: PhotoLocationData }>>,
      res: Response<Photo>
    ) => {
      try {
        const result = await ModelRepositories.Photo.updateMetadata(req.params.id, {
          exifData: req.body.exifData,
          locationData: req.body.locationData
        });
        res.success(result);
      } catch (err) {
        res.error(err);
      }
    }
  );

  app.post(
    '/v1/photo/:id/annotate',
    authenticatedRoute,
    param('id').isMongoId(),
    async (
      req: AuthenticatedRequest<Request<{ id: string }, Photo, { annotationAnswers: AnnotationAnswer[] }>>,
      res: Response<Photo>
    ) => {
      try {
        const result = await ModelRepositories.Photo.annotate(req.params.id, req.body.annotationAnswers);
        res.success(result);
      } catch (err) {
        res.error(err);
      }
    }
  );

  app.delete(
    '/v1/photo/:id',
    authenticatedRoute,
    param('id').isMongoId(),
    async (req: AuthenticatedRequest<Request<{ id: string }, { success: true }>>, res: Response<{ success: true }>) => {
      try {
        await ModelRepositories.Photo.destroy(req.params.id, req.user.id);
        res.success({
          success: true
        });
      } catch (err) {
        res.error(err);
      }
    }
  );
};

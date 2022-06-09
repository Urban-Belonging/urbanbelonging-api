import { Application, Request, Response } from 'express';
import { AuthenticatedRequest } from '../@types/auth';
import { apiKeyAuthenticated } from '../lib/express-middleware/apiKeyAuthenticated';
import Push from '../lib/push';
import { ModelRepositories } from '../models/repositories';
import { UserRole } from '../models/User';

export default (app: Application): void => {
  app.put(
    '/v1/admin/user/:id/role',
    apiKeyAuthenticated,
    async (
      req: AuthenticatedRequest<
        Request<
          {
            id: string;
          },
          { success: true },
          {
            role: UserRole;
          }
        >
      >,
      res: Response<{
        success: true;
      }>
    ) => {
      try {
        await ModelRepositories.User.updateRole(req.params.id, req.body.role);

        res.success({ success: true });
      } catch (err) {
        res.error(err);
      }
    }
  );

  app.post(
    '/v1/admin/user-group/:id/push',
    apiKeyAuthenticated,
    async (
      req: AuthenticatedRequest<
        Request<
          {
            id: string;
          },
          {},
          {
            title: string;
            message: string;
          }
        >
      >,
      res: Response<{
        success: boolean;
      }>
    ) => {
      try {
        await ModelRepositories.UserGroup.assertExists(req.params.id);

        await Push.sendToGroup(req.params.id, {
          title: req.body.title,
          message: req.body.message,
          params: {
            notificationType: 'user-group:custom-message'
          }
        });

        res.success({ success: true });
      } catch (err) {
        res.error(err);
      }
    }
  );
};

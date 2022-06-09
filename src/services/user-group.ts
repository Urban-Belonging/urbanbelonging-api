import { Application, Request, Response } from 'express';
import { body } from 'express-validator';
import { AuthenticatedRequest } from '../@types/auth';
import { EmailService } from '../lib/email/EmailService';
import { apiKeyAuthenticated } from '../lib/express-middleware/apiKeyAuthenticated';
import { authenticatedRoute } from '../lib/express-middleware/authenticated';
import { ModelRepositories } from '../models/repositories';
import { UserGroup, UserGroupWithACL } from '../models/UserGroup';
import { UserGroupInvitationModel } from '../models/UserGroupInvitation';
import { PendingUserGroupMember, UserGroupMember } from '../models/UserGroupMembership';

export default (app: Application): void => {
  app.post(
    '/v1/user-group',
    authenticatedRoute,
    body('name').isLength({ min: 1 }),
    async (
      req: AuthenticatedRequest<
        Request<
          {},
          UserGroup,
          {
            name: string;
          }
        >
      >,
      res: Response<UserGroup>
    ) => {
      try {
        const result = await ModelRepositories.UserGroup.create({
          name: req.body.name,
          createdBy: req.user.id
        });

        res.success(result);
      } catch (err) {
        res.error(err);
      }
    }
  );

  app.patch(
    '/v1/user-group/:id',
    authenticatedRoute,
    body('name').isLength({ min: 1 }),
    async (
      req: AuthenticatedRequest<
        Request<
          { id: string },
          UserGroup,
          {
            name: string;
          }
        >
      >,
      res: Response<UserGroup>
    ) => {
      try {
        await ModelRepositories.UserGroup.assertUserIsOwner(req.params.id, req.user.id);

        const result = await ModelRepositories.UserGroup.update(req.params.id, {
          name: req.body.name
        });

        res.success(result);
      } catch (err) {
        res.error(err);
      }
    }
  );

  app.get(
    '/v1/user-group/me',
    authenticatedRoute,
    async (req: AuthenticatedRequest<Request<{}, UserGroupWithACL[]>>, res: Response<UserGroupWithACL[]>) => {
      try {
        const results = await ModelRepositories.UserGroup.listForUser(req.user.id);
        res.success(results);
      } catch (err) {
        res.error(err);
      }
    }
  );

  app.get(
    '/v1/user-group/:id',
    authenticatedRoute,
    async (req: AuthenticatedRequest<Request<{ id: string }, UserGroup>>, res: Response<UserGroup>) => {
      try {
        await ModelRepositories.UserGroup.assertUserIsMember(req.params.id, req.user.id);

        const result = await ModelRepositories.UserGroup.get(req.params.id);
        res.success(result);
      } catch (err) {
        res.error(err);
      }
    }
  );

  app.get(
    '/v1/user-group/:id/members',
    authenticatedRoute,
    async (
      req: AuthenticatedRequest<Request<{ id: string }, (PendingUserGroupMember | UserGroupMember)[]>>,
      res: Response<(PendingUserGroupMember | UserGroupMember)[]>
    ) => {
      try {
        await ModelRepositories.UserGroup.assertUserCanInviteMembers(req.params.id, req.user.id);

        const members = await ModelRepositories.UserGroup.listMembers(req.params.id);
        // @ts-ignore
        const pendingMembers = await UserGroupInvitationModel.find({
          group: req.params.id,
          activated: false,
          expiresAt: {
            $gte: Date.now()
          }
        });

        res.success([
          ...members,
          ...pendingMembers.map((pendingMember) => ({
            id: pendingMember.id,
            username: `${pendingMember.email} (pending)`,
            canCreatePhotoEvents: pendingMember.canCreatePhotoEvents,
            canInviteMembers: pendingMember.canInviteMembers
          }))
        ]);
      } catch (err) {
        res.error(err);
      }
    }
  );

  app.post(
    '/v1/user-group/:id/members',
    authenticatedRoute,
    async (
      req: AuthenticatedRequest<
        Request<
          { id: string },
          any,
          {
            emailOrUsername: string;
            canInviteMembers: boolean;
            canCreatePhotoEvents: boolean;
          }
        >
      >,
      res: Response<any>
    ) => {
      try {
        await ModelRepositories.UserGroup.assertUserCanInviteMembers(req.params.id, req.user.id);

        const result = await ModelRepositories.UserGroup.inviteMember(req.params.id, {
          emailOrUsername: req.body.emailOrUsername,
          canInviteMembers: req.body.canInviteMembers,
          canCreatePhotoEvents: req.body.canCreatePhotoEvents,
          invitedBy: req.user.id
        });
        res.success(result);
      } catch (err) {
        res.error(err);
      }
    }
  );

  app.put(
    '/v1/user-group/:id/demographics',
    apiKeyAuthenticated,
    async (
      req: AuthenticatedRequest<
        Request<
          { id: string },
          { updateCount: number },
          {
            users: Record<string, string>;
          }
        >
      >,
      res: Response<{ updateCount: number }>
    ) => {
      try {
        const response = await ModelRepositories.UserGroup.updateDemographics(req.params.id, req.body.users);

        res.success({
          updateCount: response.updateCount
        });
      } catch (err) {
        res.error(err);
      }
    }
  );

  app.post(
    '/v1/user-group/:id/preset-users',
    apiKeyAuthenticated,
    async (
      req: AuthenticatedRequest<
        Request<
          { id: string },
          { users: { username: string; password: string }[] },
          {
            count: number;
          }
        >
      >,
      res: Response<{ users: { username: string; password: string }[] }>
    ) => {
      try {
        const { users, group } = await ModelRepositories.UserGroup.generatePresetUsers(req.params.id, req.body.count);

        await EmailService.send(
          req.user.email,
          'Generated Urban Belonging Users',
          `<div>You chose to generate ${req.body.count} users for the group ${
            group.name
          }. You will be unable to recover these user's passwords as they use a fake email address. Here are their details: <br/> ${users.map(
            (user) => `<div><b>Username:</b> ${user.username}<br/><b>Password:</b> ${user.password}</div>`
          )}</div>`
        );

        res.success({
          users
        });
      } catch (err) {
        res.error(err);
      }
    }
  );
};

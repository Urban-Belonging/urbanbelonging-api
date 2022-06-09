import { Application, Request, Response } from 'express';
import { body } from 'express-validator';
import { AuthenticatedRequest } from '../@types/auth';
import { JWT } from '../lib/auth/jwt';
import { comparePassword, hashPassword, validatePassword } from '../lib/auth/password';
import { authenticatedRoute } from '../lib/express-middleware/authenticated';
import { handleValidationError } from '../lib/express-middleware/handleValidationError';
import { AuthError, BadRequestError } from '../lib/http/HTTPError';
import { Device } from '../models/Device';
import { ModelRepositories } from '../models/repositories';
import { UserModel } from '../models/User';

export default (app: Application): void => {
  app.post('/v1/auth/login', async (req: Request<{}, {}, { username: string; password: string }>, res: Response) => {
    try {
      const user = await UserModel.findOne({
        username: req.body.username.toLowerCase()
      });

      if (!user) throw new AuthError('Invalid username or password');

      const isPasswordValid = await comparePassword(req.body.password, user.hashedPassword);
      if (!isPasswordValid) throw new AuthError('Invalid username or password');

      const { accessToken, refreshToken } = await JWT.signToken(user);

      res.success({
        accessToken,
        refreshToken
      });
    } catch (err) {
      res.error(err);
    }
  });

  app.post('/v1/auth/register/start', async (req: Request<{}, {}, { email: string }>, res: Response) => {
    try {
      await ModelRepositories.UserRegistration.create({ email: req.body.email.toLowerCase() });
      res.noContent();
    } catch (err) {
      res.error(err);
    }
  });

  app.post(
    '/v1/auth/register/complete',
    async (
      req: Request<{}, {}, { username: string; password: string; activationCode: string; locale: string }>,
      res: Response
    ) => {
      let isUserRegistrationValid = true;
      let isUserGroupInvitationValid = true;
      let email;

      try {
        const registration = await ModelRepositories.UserRegistration.verifyActivationCode(req.body.activationCode);
        email = registration.email;
      } catch (err) {
        isUserRegistrationValid = false;
      }

      try {
        const invitation = await ModelRepositories.UserGroupInvitation.verifyActivationCode(req.body.activationCode);
        email = invitation.email;
      } catch (err) {
        isUserGroupInvitationValid = false;
      }

      if (!email || (!isUserGroupInvitationValid && !isUserRegistrationValid)) {
        return res.error(new BadRequestError('Invalid activation code'));
      }

      try {
        const isPasswordValid = validatePassword(req.body.password);
        if (!isPasswordValid) throw new BadRequestError('Invalid password');

        const hashedPassword = await hashPassword(req.body.password);
        const user = await ModelRepositories.User.create({
          email,
          username: req.body.username.toLowerCase(),
          hashedPassword,
          locale: req.body.locale
        });

        const { accessToken, refreshToken } = await JWT.signToken(user);

        res.success({
          accessToken,
          refreshToken
        });
      } catch (err) {
        res.error(err);
      }
    }
  );

  app.post('/v1/auth/refresh', async (req: Request<{}, {}, { refreshToken: string }>, res: Response) => {
    try {
      const cachedUserId = await JWT.getUserIdFromCachedRefreshToken(req.body.refreshToken);
      if (!cachedUserId) throw new AuthError('Invalid refresh token');
      if (!JWT.verifyToken(req.body.refreshToken)) throw new AuthError('Invalid refresh token');

      const user = await UserModel.findById(cachedUserId);
      if (!user) throw new AuthError('User does not exist');

      const { accessToken, refreshToken } = await JWT.signToken(user);

      res.success({
        accessToken,
        refreshToken
      });
    } catch (err) {
      res.error(err);
    }
  });

  app.get(
    '/v1/auth/me',
    authenticatedRoute,
    async (req: AuthenticatedRequest<Request<{}, {}, { refreshToken: string }>>, res: Response) => {
      try {
        res.success(req.user);
      } catch (err) {
        res.error(err);
      }
    }
  );

  app.post(
    '/v1/auth/logout',
    authenticatedRoute,
    async (
      req: AuthenticatedRequest<Request<{}, {}, { deviceToken?: string | null; refreshToken?: string | null }>>,
      res: Response
    ) => {
      try {
        if (req.body.deviceToken) await ModelRepositories.Device.unregister(req.body.deviceToken);
        if (req.body.refreshToken) await JWT.invalidateToken(req.body.refreshToken);

        res.noContent();
      } catch (err) {
        res.error(err);
      }
    }
  );

  app.post(
    '/v1/auth/activation-code/verify',
    async (
      req: Request<{}, {}, { activationCode: string }>,
      res: Response<{ type: 'UserRegistration' | 'UserGroupInvitation' | 'UserPasswordResetRequest' }>
    ) => {
      let isUserRegistrationValid = false;
      let isUserGroupInvitationValid = false;
      let isUserPasswordResetRequestValid = false;

      try {
        await ModelRepositories.UserRegistration.verifyActivationCode(req.body.activationCode);
        isUserRegistrationValid = true;
      } catch (err) {}

      try {
        await ModelRepositories.UserGroupInvitation.verifyActivationCode(req.body.activationCode);
        isUserGroupInvitationValid = true;
      } catch (err) {}

      try {
        await ModelRepositories.UserPasswordResetRequest.verifyActivationCode(req.body.activationCode);
        isUserPasswordResetRequestValid = true;
      } catch (err) {}

      if (isUserRegistrationValid) {
        return res.success({
          type: 'UserRegistration'
        });
      }

      if (isUserGroupInvitationValid) {
        return res.success({
          type: 'UserGroupInvitation'
        });
      }

      if (isUserPasswordResetRequestValid) {
        return res.success({
          type: 'UserPasswordResetRequest'
        });
      }

      return res.error(new BadRequestError('Invalid activation code'));
    }
  );

  app.post(
    '/v1/auth/device-token',
    authenticatedRoute,
    async (
      req: AuthenticatedRequest<Request<{}, {}, { token: string; platform: 'ios' | 'android' }>>,
      res: Response<Device>
    ) => {
      try {
        const device = await ModelRepositories.Device.create({
          token: req.body.token,
          user: req.user.id,
          platform: req.body.platform
        });
        res.success(device);
      } catch (err) {
        res.error(err);
      }
    }
  );

  app.put(
    '/v1/auth/locale',
    authenticatedRoute,
    async (req: AuthenticatedRequest<Request<{}, {}, { locale: string }>>, res: Response<Device>) => {
      try {
        await ModelRepositories.User.updateLocale(req.user.id, req.body.locale);
        res.noContent();
      } catch (err) {
        res.error(err);
      }
    }
  );

  app.post(
    '/v1/auth/reset-password',
    body('emailOrUsername').isString(),
    handleValidationError,
    async (req: Request<{}, {}, { emailOrUsername: string }>, res: Response) => {
      try {
        const user = await ModelRepositories.User.getByEmailOrUsername(req.body.emailOrUsername);
        if (!user) return res.noContent();

        await ModelRepositories.UserPasswordResetRequest.create(user);

        res.noContent();
      } catch (err) {
        res.error(err);
      }
    }
  );

  app.post(
    '/v1/auth/reset-password/complete',
    body('activationCode').isString(),
    body('password').isString(),
    handleValidationError,
    async (req: Request<{}, {}, { password: string; activationCode: string }>, res: Response) => {
      try {
        const hashedPassword = await hashPassword(req.body.password);
        await ModelRepositories.UserPasswordResetRequest.complete(req.body.activationCode, hashedPassword);

        res.noContent();
      } catch (err) {
        res.error(err);
      }
    }
  );
};

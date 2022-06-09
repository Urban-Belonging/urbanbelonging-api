import Debug from 'debug';
import { ModelRepositories } from '.';
import { randomString } from '../../lib/auth/utils';
import { EmailService } from '../../lib/email/EmailService';
import { BadRequestError } from '../../lib/http/HTTPError';
import i18n from '../../lib/i18n';
import { User } from '../User';
import { UserPasswordResetRequest, UserPasswordResetRequestModel } from '../UserPasswordResetRequest';

const debug = Debug('ForgottenPasswordRequest');

export async function create(user: User) {
  const expiresAt = Date.now() + 172800000;
  const activationCode = await generateActivationCode();
  const result = await UserPasswordResetRequestModel.create({
    user: user.id,
    activationCode,
    expiresAt
  });

  await EmailService.send(
    user.email,
    i18n.translate('en', 'forgottenPasswordTitle'),
    i18n.translate('en', 'forgottenPasswordBody', activationCode, new Date(expiresAt).toISOString())
  );

  debug(`Successfully created`, result);

  return result;
}

export async function verifyActivationCode(activationCode: string) {
  const request = await UserPasswordResetRequestModel.findOne({
    activationCode,
    activated: false,
    expiresAt: {
      // @ts-ignore
      $gte: Date.now()
    }
  });

  if (!request) throw new BadRequestError('Activation code has expired or has already been activated');

  await assertIsActive(request);

  return request;
}

export async function complete(activationCode: string, password: string) {
  const request = await verifyActivationCode(activationCode);

  await ModelRepositories.User.changePassword(request.user as unknown as string, password);
}

async function generateActivationCode(): Promise<string> {
  let activationCode;

  while (!activationCode) {
    const randomCode = randomString(2);
    const isTaken = await UserPasswordResetRequestModel.exists({
      activationCode: randomCode,
      activated: false,
      expiresAt: {
        // @ts-ignore
        $gte: Date.now()
      }
    });

    if (isTaken) return generateActivationCode();
    activationCode = randomCode;
  }

  return activationCode;
}

async function assertIsActive(request: UserPasswordResetRequest) {
  if (request.activated || request.expiresAt.valueOf() <= Date.now()) {
    throw new BadRequestError('Activation code has expired or has already been activated');
  }
  return true;
}

import Debug from 'debug';
import { randomString } from '../../lib/auth/utils';
import { EmailService } from '../../lib/email/EmailService';
import { BadRequestError } from '../../lib/http/HTTPError';
import i18n from '../../lib/i18n';
import { UserModel } from '../User';
import { UserRegistration, UserRegistrationModel } from '../UserRegistration';

const debug = Debug('UserRegistration');

export async function create(params: { email: string }) {
  debug(`Creating with options`, params);

  const userAlreadyExists = await UserModel.exists({
    email: params.email
  });

  if (userAlreadyExists) throw new BadRequestError('Email already taken');

  const expiresAt = Date.now() + 172800000;

  const activationCode = await generateActivationCode();
  const registration = await UserRegistrationModel.create({
    email: params.email,
    activationCode,
    expiresAt
  });

  await EmailService.send(
    params.email,
    i18n.translate('en', 'userRegistrationTitle'),
    i18n.translate('en', 'userRegistrationBody', activationCode, new Date(expiresAt).toISOString())
  );

  debug(`Successfully created`, registration);

  return registration;
}

export async function verifyActivationCode(activationCode: string) {
  const registration = await UserRegistrationModel.findOne({
    activationCode,
    activated: false,
    expiresAt: {
      // @ts-ignore
      $gte: Date.now()
    }
  });

  if (!registration) throw new BadRequestError('Activation code has expired or has already been activated');

  await assertIsActive(registration);

  return registration;
}

export async function assertIsActive(registration: UserRegistration) {
  if (registration.activated || registration.expiresAt.valueOf() <= Date.now()) {
    throw new BadRequestError('Activation code has expired or has already been activated');
  }
  return true;
}

async function generateActivationCode(): Promise<string> {
  let activationCode;

  while (!activationCode) {
    const randomCode = randomString(2);
    const isTaken = await UserRegistrationModel.exists({
      activationCode: randomCode,
      activated: false,
      expiresAt: {
        // @ts-ignore
        $gte: Date.now()
      }
    });

    if (isTaken) {
      return generateActivationCode();
    }

    activationCode = randomCode;
  }

  return activationCode;
}

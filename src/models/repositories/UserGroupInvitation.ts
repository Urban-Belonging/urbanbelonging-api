import Debug from 'debug';
import { randomString } from '../../lib/auth/utils';
import { BadRequestError } from '../../lib/http/HTTPError';
import { UserGroupInvitation, UserGroupInvitationModel } from '../UserGroupInvitation';

const debug = Debug('UserGroupInvitation');

export async function create(params: {
  email: string;
  createdBy: string;
  group: string;
  canCreatePhotoEvents: boolean;
  canInviteMembers: boolean;
}) {
  debug(`Creating with options`, params);

  // @TODO Blank/dummy email for special sign up for users without a personal device

  const activationCode = await generateActivationCode();
  const invitation = await UserGroupInvitationModel.create({
    ...params,
    activationCode,
    expiresAt: Date.now() + 172800000
  });

  // @TODO Send email to user if set

  debug(`Successfully created`, invitation);

  return invitation;
}

export async function verifyActivationCode(activationCode: string) {
  const invitation = await UserGroupInvitationModel.findOne({
    activationCode,
    activated: false,
    expiresAt: {
      // @ts-ignore
      $gte: Date.now()
    }
  });

  if (!invitation) throw new BadRequestError('Activation code has expired or has already been activated');

  await assertIsActive(invitation);

  return invitation;
}

export async function assertIsActive(invitation: UserGroupInvitation) {
  if (invitation.activated || invitation.expiresAt.valueOf() <= Date.now()) {
    throw new BadRequestError('Invitation is not active');
  }
  return true;
}

async function generateActivationCode(): Promise<string> {
  let activationCode;

  while (!activationCode) {
    const randomCode = randomString(2);
    const isTaken = await UserGroupInvitationModel.exists({
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

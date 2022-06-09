import Debug from 'debug';
import { ModelRepositories } from '.';
import { BadRequestError, NotFoundError } from '../../lib/http/HTTPError';
import { UserModel, UserRole } from '../User';
import { UserGroupInvitationModel } from '../UserGroupInvitation';
import { UserRegistrationModel } from '../UserRegistration';

const debug = Debug('User');

export async function create(params: { email: string; username: string; hashedPassword: string; locale?: string }) {
  debug(`Creating with options`, params);

  const isDuplicateUser = await UserModel.exists({
    username: params.username
  });
  if (isDuplicateUser) throw new BadRequestError('Username already taken');

  const createdUser = await UserModel.create({
    email: params.email,
    username: params.username,
    hashedPassword: params.hashedPassword,
    locale: params.locale
  });

  debug(`Successfully created `, createdUser);

  await UserRegistrationModel.updateMany(
    {
      email: params.email
    },
    {
      activated: true
    }
  );

  const userGroupInvitations = await UserGroupInvitationModel.find({
    email: params.email
  });

  for (const invitation of userGroupInvitations) {
    try {
      await ModelRepositories.UserGroupInvitation.assertIsActive(invitation.id);
    } catch (err) {}

    try {
      await ModelRepositories.UserGroupMembership.create({
        group: invitation.group.toString(),
        canCreatePhotoEvents: invitation.canCreatePhotoEvents,
        canInviteMembers: invitation.canInviteMembers,
        invitedBy: invitation.createdBy.toString(),
        user: createdUser.id
      });
      // User was already a member of the group
    } catch (err) {}

    await invitation.updateOne({
      activated: true
    });
  }

  return createdUser;
}

export async function getByEmailOrUsername(emailOrUsername: string) {
  return await UserModel.findOne({
    $or: [
      {
        username: emailOrUsername
      },
      {
        email: emailOrUsername
      }
    ]
  });
}

export async function changePassword(userId: string, hashedPassword: string) {
  const update = await UserModel.updateOne(
    {
      _id: userId
    },
    {
      hashedPassword
    }
  );

  if (update.nModified === 0) throw new NotFoundError('User does not exist');

  return update;
}

export async function assertExists(id: string) {
  const exists = await UserModel.exists({
    _id: id
  });

  if (!exists) throw new BadRequestError('User does not exist');
}

export async function updateRole(userId: string, role: UserRole) {
  const update = await UserModel.updateOne(
    {
      _id: userId
    },
    {
      role
    }
  );

  if (update.nModified === 0) throw new NotFoundError('User does not exist');

  return update;
}

export async function updateLocale(userId: string, locale: string) {
  const update = await UserModel.updateOne(
    {
      _id: userId
    },
    {
      locale
    }
  );

  if (update.nModified === 0) throw new NotFoundError('User does not exist');

  return update;
}

import Debug from 'debug';
import { ModelRepositories } from '.';
import { hashPassword } from '../../lib/auth/password';
import { randomString } from '../../lib/auth/utils';
import { customEmailTemplates } from '../../lib/email/customTemplates';
import { EmailService } from '../../lib/email/EmailService';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../lib/http/HTTPError';
import Push from '../../lib/push';
import { User, UserModel } from '../User';
import { UserGroupModel, UserGroupWithACL } from '../UserGroup';
import { UserGroupMember, UserGroupMembership, UserGroupMembershipModel } from '../UserGroupMembership';

const debug = Debug('UserGroup');

const GENERATED_USER_EMAIL_SUFFIX = '@PRESET_USER.GENERATED';

export async function create(params: { name: string; createdBy: string }) {
  debug(`Creating with options`, params);

  const userGroup = await UserGroupModel.create({
    name: params.name,
    createdBy: params.createdBy
  });

  debug(`Successfully created`, userGroup);

  const membership = await UserGroupMembershipModel.create({
    user: params.createdBy,
    group: userGroup._id,
    canCreatePhotoEvents: true,
    canInviteMembers: true
  });

  debug(`Successfully created UserGroupMembership`, membership);

  return userGroup;
}

export async function listForUser(user: string): Promise<UserGroupWithACL[]> {
  const memberships = await UserGroupMembershipModel.find({
    user
  });

  // Mongo doesn't like empty $or arrays, return immediately if we have no memberships
  if (memberships.length === 0) return [];

  const groups = await UserGroupModel.find({
    $or: memberships.map((membership) => ({ _id: membership.group }))
  }).sort({
    updatedAt: -1
  });

  const membershipMap = memberships.reduce<Record<string, UserGroupMembership>>((result, membership) => {
    result[membership.group.toString()] = membership;
    return result;
  }, {});

  return groups.map((group) => ({
    ...group.toObject(),
    canCreatePhotoEvents: membershipMap[group.id].canCreatePhotoEvents,
    canInviteMembers: membershipMap[group.id].canInviteMembers
  }));
}

export async function listMembers(group: string): Promise<UserGroupMember[]> {
  const memberships = await UserGroupMembershipModel.find({
    group
  }).populate('user');
  if (memberships.length === 0) return [];

  return memberships.map((membership) => {
    const user = membership.user as User;
    return {
      id: user.id,
      username: user.username,
      canCreatePhotoEvents: membership.canCreatePhotoEvents,
      canInviteMembers: membership.canInviteMembers,
      demographicGroup: user.demographicGroup
    };
  });
}

export async function inviteMember(
  groupId: string,
  params: { emailOrUsername: string; invitedBy: string; canInviteMembers: boolean; canCreatePhotoEvents: boolean }
) {
  const group = await ModelRepositories.UserGroup.assertExists(groupId);
  const user = await UserModel.findOne({
    $or: [
      {
        email: params.emailOrUsername
      },
      {
        username: params.emailOrUsername
      }
    ]
  });

  // @todo implement an acceptance flow
  if (user) {
    debug(`User with email or username ${params.emailOrUsername} already exists, adding directly to group`);

    const membership = await ModelRepositories.UserGroupMembership.create({
      group: groupId,
      canCreatePhotoEvents: params.canCreatePhotoEvents,
      canInviteMembers: params.canInviteMembers,
      invitedBy: params.invitedBy,
      user: user.id
    });

    await Push.sendToUser(user.id, {
      title: `You've been invited to join ${group.name}`,
      message: '',
      params: {
        notificationType: 'user-group:invited',
        userGroupId: group.id,
        userGroupName: group.name
      }
    });

    debug('Created membership ', membership);
  } else {
    if (
      !/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
        params.emailOrUsername
      )
    ) {
      throw new BadRequestError('Invalid email');
    }

    debug(`User with email or username ${params.emailOrUsername} does not yet exist, creating UserGroupInvitation`);
    const invitation = await ModelRepositories.UserGroupInvitation.create({
      group: groupId,
      email: params.emailOrUsername,
      createdBy: params.invitedBy,
      canInviteMembers: params.canInviteMembers,
      canCreatePhotoEvents: params.canCreatePhotoEvents
    });

    if (customEmailTemplates[group.id]) {
      debug(`Using custom email template for group ${group.id}`);
      const customEmail = customEmailTemplates[group.id](params.emailOrUsername, group, invitation);
      await EmailService.send(params.emailOrUsername, customEmail.subject, customEmail.body);
    } else {
      await EmailService.send(
        params.emailOrUsername,
        `You've been invited to join ${group.name}`,
        `Your activation code is ${invitation.activationCode} and expires at ${new Date(
          invitation.expiresAt
        ).toISOString()}`
      );
    }

    debug('Created invitation ', invitation);
  }
}

export async function generatePresetUsers(groupId: string, count: number) {
  const users: {
    username: string;
    password: string;
  }[] = [];

  const group = await ModelRepositories.UserGroup.assertExists(groupId);

  for (let i = 0; i < count; i++) {
    const username = randomString(5);
    const password = randomString(5);
    const email = `${username}${GENERATED_USER_EMAIL_SUFFIX}`;
    const hashedPassword = await hashPassword(password);

    const createdUser = await ModelRepositories.User.create({
      email,
      username,
      hashedPassword
    });

    await ModelRepositories.UserGroupMembership.create({
      group: groupId,
      user: createdUser.id,
      canCreatePhotoEvents: false,
      canInviteMembers: false
    });

    users.push({
      username: createdUser.username,
      password
    });
  }

  return { users: users, group };
}

export async function get(id: string) {
  const userGroup = await UserGroupModel.findById({ _id: id });

  if (!userGroup) throw new NotFoundError(`UserGroup does not exist`);

  return userGroup;
}

export async function update(
  id: string,
  options: {
    name: string;
  }
) {
  const userGroup = await ModelRepositories.UserGroup.assertExists(id);

  debug(`Attempting to update with ID ${id} and values `, options);

  await userGroup.updateOne({
    name: options.name
  });

  debug(`Successfully updated`);

  return userGroup;
}

export async function updateDemographics(id: string, users: Record<string, string>) {
  await ModelRepositories.UserGroup.assertExists(id);

  let updateCount = 0;

  debug(`Updating demographics in group ${id}`);

  for (const [userId, demographic] of Object.entries(users)) {
    debug(`Setting demographic for user ${userId} to ${demographic}`);

    const updateResponse = await UserModel.updateOne(
      {
        _id: userId
      },
      {
        demographicGroup: demographic
      }
    );

    if (updateResponse.nModified === 0) throw new NotFoundError(`User with ${userId} does not exist`);

    updateCount++;
  }

  return {
    updateCount
  };
}

export async function assertExists(id: string) {
  const group = await UserGroupModel.findById(id);

  if (!group) throw new BadRequestError(`Group with id "${id}" not known`);

  return group;
}

export async function assertUserIsOwner(group: string, user: string) {
  const exists = await UserGroupModel.exists({
    _id: group,
    createdBy: user
  });

  if (!exists) throw new ForbiddenError(`User ${user} is not the owner of ${group}`);
}

export async function assertUserIsMember(group: string, user: string) {
  const membership = await UserGroupMembershipModel.findOne({
    group,
    user
  });

  if (!membership) throw new ForbiddenError(`User ${user} is not a member of group ${group}`);

  return membership;
}

export async function assertUserCanCreatePhotoEvents(group: string, user: string) {
  const membership = await ModelRepositories.UserGroup.assertUserIsMember(group, user);

  if (!membership.canCreatePhotoEvents) throw new ForbiddenError(`User cannot create photo events`);

  return membership;
}

export async function assertUserCanInviteMembers(group: string, user: string) {
  const membership = await ModelRepositories.UserGroup.assertUserIsMember(group, user);

  if (!membership.canInviteMembers) throw new ForbiddenError(`User cannot invite members`);

  return membership;
}

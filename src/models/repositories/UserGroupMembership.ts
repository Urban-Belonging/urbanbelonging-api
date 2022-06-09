import Debug from 'debug';
import { NotFoundError } from '../../lib/http/HTTPError';
import { UserGroupModel } from '../UserGroup';
import { UserGroupMembershipModel } from '../UserGroupMembership';

const debug = Debug('UserGroupMembership');

export async function create(params: {
  group: string;
  user: string;
  canCreatePhotoEvents: boolean;
  canInviteMembers: boolean;
  invitedBy?: string;
}) {
  debug(`Creating with options`, params);

  const groupExists = await UserGroupModel.exists({
    _id: params.group
  });

  if (!groupExists) throw new NotFoundError('Group does not exist');

  const userIsAlreadyMember = await UserGroupMembershipModel.exists({
    group: params.group,
    user: params.user
  });

  if (userIsAlreadyMember) throw new NotFoundError('User is already a member of the group');

  const membership = await UserGroupMembershipModel.create({
    group: params.group,
    user: params.user,
    canCreatePhotoEvents: params.canCreatePhotoEvents,
    canInviteMembers: params.canInviteMembers,
    invitedBy: params.invitedBy || null
  });

  return membership;
}

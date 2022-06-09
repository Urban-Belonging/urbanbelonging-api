import { Schema, Document, Model, model } from 'mongoose';
import { ObjectIdOrDocument } from '../@types';
import { schemaToJSON } from '../lib/mongoose-middleware/schemaToJSON';
import { User } from './User';
import { UserGroup } from './UserGroup';

export interface UserGroupMembership extends Document {
  group: ObjectIdOrDocument<UserGroup>;
  user: ObjectIdOrDocument<User>;
  invitedBy: ObjectIdOrDocument<User> | null;
  canCreatePhotoEvents: boolean;
  canInviteMembers: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserGroupMember {
  id: string;
  username: string;
  canCreatePhotoEvents: boolean;
  canInviteMembers: boolean;
  demographicGroup: string | null;
}

export type PendingUserGroupMember = Omit<UserGroupMember, "demographicGroup">

export const UserGroupMembershipSchema = new Schema(
  {
    canCreatePhotoEvents: {
      type: Boolean,
      default: false
    },
    canInviteMembers: {
      type: Boolean,
      default: false
    },
    group: { type: Schema.Types.ObjectId, ref: 'UserGroup' },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
  },
  {
    versionKey: false,
    timestamps: true
  }
);

UserGroupMembershipSchema.method('toJSON', schemaToJSON);

UserGroupMembershipSchema.set('toObject', { virtuals: true });
UserGroupMembershipSchema.set('toJSON', { virtuals: true });

export const UserGroupMembershipModel: Model<UserGroupMembership> = model<UserGroupMembership>(
  'UserGroupMembership',
  UserGroupMembershipSchema
);

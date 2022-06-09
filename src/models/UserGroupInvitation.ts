import { Schema, Document, Model, model } from 'mongoose';
import { ObjectIdOrDocument } from '../@types';
import { schemaToJSON } from '../lib/mongoose-middleware/schemaToJSON';
import { UserGroup } from './UserGroup';
import { User } from './User';

export interface UserGroupInvitation extends Document {
  email: string;
  activationCode: string;
  activated: boolean;
  createdBy: ObjectIdOrDocument<User>;
  group: ObjectIdOrDocument<UserGroup>;

  canCreatePhotoEvents: boolean;
  canInviteMembers: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const UserGroupInvitationSchema = new Schema(
  {
    email: { type: String },
    activationCode: { type: String },
    activated: { type: Boolean, default: false },
    group: { type: Schema.Types.ObjectId, ref: 'UserGroup' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'UserGroup' },
    canCreatePhotoEvents: {
      type: Boolean,
      default: false
    },
    canInviteMembers: {
      type: Boolean,
      default: false
    },
    expiresAt: { type: Date }
  },
  {
    versionKey: false,
    timestamps: true
  }
);

UserGroupInvitationSchema.method('toJSON', schemaToJSON);

UserGroupInvitationSchema.set('toObject', { virtuals: true });
UserGroupInvitationSchema.set('toJSON', { virtuals: true });

export const UserGroupInvitationModel: Model<UserGroupInvitation> = model<UserGroupInvitation>(
  'UserGroupInvitation',
  UserGroupInvitationSchema
);

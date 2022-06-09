import { Document, Model, model, Schema, LeanDocument } from 'mongoose';
import { ObjectIdOrDocument } from '../@types';
import { schemaToJSON } from '../lib/mongoose-middleware/schemaToJSON';
import { User } from './User';

export interface UserGroup extends Document {
  name: string;
  createdBy: ObjectIdOrDocument<User>;
  createdAt: Date;
  updatedAt: Date;
}

export type UserGroupWithACL = LeanDocument<UserGroup> & {
  canCreatePhotoEvents: boolean;
  canInviteMembers: boolean;
};

export const UserGroupSchema = new Schema(
  {
    name: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  {
    versionKey: false,
    timestamps: true
  }
);

UserGroupSchema.method('toJSON', schemaToJSON);

UserGroupSchema.set('toObject', { virtuals: true });
UserGroupSchema.set('toJSON', { virtuals: true });

export const UserGroupModel: Model<UserGroup> = model<UserGroup>('UserGroup', UserGroupSchema);

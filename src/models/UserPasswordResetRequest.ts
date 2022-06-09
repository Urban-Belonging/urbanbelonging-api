import { Document, Model, model, Schema } from 'mongoose';
import { ObjectIdOrDocument } from '../@types';
import { schemaToJSON } from '../lib/mongoose-middleware/schemaToJSON';
import { User } from './User';

export interface UserPasswordResetRequest extends Document {
  user: ObjectIdOrDocument<User>;
  activationCode: string;
  activated: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const UserPasswordResetRequestSchema = new Schema(
  {
    activationCode: { type: String },
    activated: { type: Boolean, default: false },
    expiresAt: { type: Date },
    user: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  {
    versionKey: false,
    timestamps: true
  }
);

UserPasswordResetRequestSchema.method('toJSON', schemaToJSON);

UserPasswordResetRequestSchema.set('toObject', { virtuals: true });
UserPasswordResetRequestSchema.set('toJSON', { virtuals: true });

export const UserPasswordResetRequestModel: Model<UserPasswordResetRequest> = model<UserPasswordResetRequest>(
  'UserPasswordResetRequest',
  UserPasswordResetRequestSchema
);

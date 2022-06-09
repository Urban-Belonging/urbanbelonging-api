import { Document, Model, model, Schema } from 'mongoose';
import { schemaToJSON } from '../lib/mongoose-middleware/schemaToJSON';

export interface UserRegistration extends Document {
  email: string;
  activationCode: string;
  activated: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const UserRegistrationSchema = new Schema(
  {
    email: { type: String },
    activationCode: { type: String },
    activated: { type: Boolean, default: false },
    expiresAt: { type: Date }
  },
  {
    versionKey: false,
    timestamps: true
  }
);

UserRegistrationSchema.method('toJSON', schemaToJSON);

UserRegistrationSchema.set('toObject', { virtuals: true });
UserRegistrationSchema.set('toJSON', { virtuals: true });

export const UserRegistrationModel: Model<UserRegistration> = model<UserRegistration>(
  'UserRegistration',
  UserRegistrationSchema
);

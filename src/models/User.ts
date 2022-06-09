import { Document, LeanDocument, Model, model, Schema } from 'mongoose';

export type UserRole = 'user' | 'admin';

export interface User extends Document {
  email: string;
  username: string;
  hashedPassword: string;
  demographicGroup: string | null;
  role: UserRole;
  locale: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = new Schema(
  {
    email: { type: String },
    username: { type: String },
    hashedPassword: { type: String },
    demographicGroup: { type: String },
    locale: { type: String, default: null },
    role: {
      type: String,
      default: 'user'
    }
  },
  {
    versionKey: false,
    timestamps: true
  }
);

UserSchema.method('toJSON', function (this: User) {
  const obj = this.toObject() as Omit<LeanDocument<User>, 'hashedPassword'> & {
    hashedPassword?: string;
  };

  obj.id = obj._id;
  delete obj._id;
  delete obj.hashedPassword;

  return obj;
});

UserSchema.set('toObject', { virtuals: true });
UserSchema.set('toJSON', { virtuals: true });

export const UserModel: Model<User> = model<User>('User', UserSchema);

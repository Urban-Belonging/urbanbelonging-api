import { Document, Model, model, Schema } from 'mongoose';
import { ObjectIdOrDocument } from '../@types';
import { schemaToJSON } from '../lib/mongoose-middleware/schemaToJSON';
import type { AnnotationPrompt, CapturePrompt, ReactionPrompt } from '../lib/prompts';
import type { PendingPushNotification } from '../lib/push/types';
import { User } from './User';
import { UserGroup } from './UserGroup';

export interface PhotoEvent extends Document {
  name: string;
  peerContentAccess: 'always' | 'reaction' | 'never';
  capturePrompt: CapturePrompt;
  annotationPrompts: AnnotationPrompt[];
  reactionPrompts: ReactionPrompt[];
  pendingPushNotifications: PendingPushNotification[];
  createdBy: ObjectIdOrDocument<User>;
  group: ObjectIdOrDocument<UserGroup>;
  contributionPeriodStartsAt: Date;
  contributionPeriodEndsAt: Date;
  reactionPeriodStartsAt: Date;
  reactionPeriodEndsAt: Date;
  startsAt: Date;
  endsAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const PhotoEventSchema = new Schema(
  {
    name: { type: String },
    peerContentAccess: { type: String },

    // Prompts
    capturePrompt: {
      promptType: {
        type: String
      },
      message: {
        type: String
      }
    },
    annotationPrompts: [
      {
        promptType: {
          type: String
        },
        answerType: {
          type: String
        },
        message: {
          type: String
        },
        canAddCustomTag: {
          type: Boolean
        }
      }
    ],
    reactionPrompts: [
      {
        promptType: {
          type: String
        },
        annotationPromptType: {
          type: String
        },
        answerType: {
          type: String
        },
        message: {
          type: String
        },
        canAddCustomTag: {
          type: Boolean
        }
      }
    ],

    // Dates
    contributionPeriodStartsAt: { type: Date, required: true },
    contributionPeriodEndsAt: { type: Date, required: true },
    reactionPeriodStartsAt: { type: Date, required: true },
    reactionPeriodEndsAt: { type: Date, required: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },

    pendingPushNotifications: [
      {
        notificationType: String
      }
    ],

    // Refs
    group: { type: Schema.Types.ObjectId, ref: 'UserGroup' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  {
    versionKey: false,
    timestamps: true
  }
);

PhotoEventSchema.method('toJSON', schemaToJSON);

PhotoEventSchema.set('toObject', { virtuals: true });
PhotoEventSchema.set('toJSON', { virtuals: true });

export const PhotoEventModel: Model<PhotoEvent> = model<PhotoEvent>('PhotoEvent', PhotoEventSchema);

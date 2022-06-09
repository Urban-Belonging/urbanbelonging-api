import Debug from 'debug';
import { ModelRepositories } from '.';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../lib/http/HTTPError';
import { AnnotationPrompts, CapturePrompts, ReactionPrompts } from '../../lib/prompts';
import { PhotoEvent, PhotoEventModel } from '../PhotoEvent';

const debug = Debug('PhotoEvent');

export async function create(params: {
  name: string;
  group: string;
  createdBy: string;
  contributionPeriodStartsAt: string;
  contributionPeriodEndsAt: string;
  reactionPeriodStartsAt: string;
  reactionPeriodEndsAt: string;
}) {
  debug(`Creating with options`, params);

  await ModelRepositories.UserGroup.assertExists(params.group);
  await ModelRepositories.UserGroup.assertUserCanCreatePhotoEvents(params.group, params.createdBy);

  const contributionPeriodStartsAt = new Date(params.contributionPeriodStartsAt);
  const contributionPeriodEndsAt = new Date(params.contributionPeriodEndsAt);
  const reactionPeriodStartsAt = new Date(params.reactionPeriodStartsAt);
  const reactionPeriodEndsAt = new Date(params.reactionPeriodEndsAt);

  const startsAt = contributionPeriodStartsAt;
  const endsAt = new Date(Math.max(contributionPeriodEndsAt.valueOf(), reactionPeriodEndsAt.valueOf()));

  await ModelRepositories.PhotoEvent.assertValidDateRange(startsAt, endsAt);
  await ModelRepositories.PhotoEvent.assertValidDateRange(contributionPeriodStartsAt, contributionPeriodEndsAt);
  await ModelRepositories.PhotoEvent.assertValidDateRange(reactionPeriodStartsAt, reactionPeriodEndsAt);

  const photoEvent = await PhotoEventModel.create({
    name: params.name,
    group: params.group,
    contributionPeriodStartsAt,
    contributionPeriodEndsAt,
    reactionPeriodStartsAt,
    reactionPeriodEndsAt,
    startsAt,
    endsAt,
    createdBy: params.createdBy,
    peerContentAccess: 'reaction',
    capturePrompt: CapturePrompts['general:thing-place-situation'],
    annotationPrompts: [
      AnnotationPrompts['annotation:describe-attachment'],
      AnnotationPrompts['annotation:describe-creation-motivation']
    ],
    reactionPrompts: [
      ReactionPrompts['reaction:describe-attachment'],
      ReactionPrompts['reaction:describe-creation-motivation']
    ],
    pendingPushNotifications: [
      {
        notificationType: 'photo-event:contribution:starting'
      },
      {
        notificationType: 'photo-event:reaction:starting'
      }
    ]
  });

  debug(`Successfully created`, photoEvent);

  return photoEvent;
}

export async function list(condition: { group: string }) {
  // @todo fix hardcoded limit, use pagination
  const results = await PhotoEventModel.find(condition).limit(200).sort({
    createdAt: -1
  });

  return results;
}

export async function listActiveForGroups(groups: string[]) {
  if (groups.length === 0) return [];

  const results = await PhotoEventModel.find({
    // @ts-ignore
    startsAt: {
      $lte: Date.now()
    },
    endsAt: {
      $gte: Date.now()
    },
    $or: groups.map((group) => ({
      group
    }))
  })
    .limit(200)
    .sort({
      startsAt: 1
    });

  return results;
}

export async function get(id: string) {
  const photoEvent = await PhotoEventModel.findById(id).populate('group');

  if (!photoEvent) throw new NotFoundError(`PhotoEvent with ID "${id}" does not exist`);

  return photoEvent;
}

export async function assertUserIsOwner(photoEvent: string, user: string) {
  const exists = await PhotoEventModel.exists({
    _id: photoEvent,
    createdBy: user
  });

  if (!exists) throw new ForbiddenError(`User "${user}" is not the owner of PhotoEvent "${photoEvent}"`);
}

export async function assertExists(id: string) {
  const event = await PhotoEventModel.findById(id);

  if (!event) throw new ForbiddenError(`Event "${id}" does not exist`);

  return event;
}

export async function assertValidDateRange(startsAt: Date, endsAt: Date) {
  const startsAtValue = startsAt.valueOf();
  const endsAtValue = endsAt.valueOf();

  if (isNaN(startsAtValue)) throw new BadRequestError(`Invalid startsAt: "${startsAt}"`);
  if (isNaN(endsAtValue)) throw new BadRequestError(`Invalid endsAt: "${endsAt}"`);
  if (startsAtValue >= endsAtValue) throw new BadRequestError(`Invalid date range: "${startsAt}" - "${endsAt}"`);
}

export function getActiveCollaborationPeriods(photoEvent: PhotoEvent, now = new Date()) {
  const result = {
    isBeforeContributionPeriod: false,
    isAfterContributionPeriod: false,
    isInContributionPeriod: false,
    isInReactionPeriod: false,
    isAfterReactionPeriod: false
  };
  const nowAsUnix = now.valueOf();
  const contributionPeriodStartsAt = photoEvent.contributionPeriodStartsAt.valueOf();
  const contributionPeriodEndsAt = photoEvent.contributionPeriodEndsAt.valueOf();
  const reactionPeriodEndsAt = photoEvent.reactionPeriodEndsAt.valueOf();
  const reactionPeriodStartsAt = photoEvent.reactionPeriodStartsAt.valueOf();

  if (contributionPeriodStartsAt > nowAsUnix) result.isBeforeContributionPeriod = true;
  if (contributionPeriodEndsAt < nowAsUnix) result.isAfterContributionPeriod = true;
  if (reactionPeriodEndsAt < nowAsUnix) result.isAfterReactionPeriod = true;

  if (reactionPeriodStartsAt < nowAsUnix && reactionPeriodEndsAt > nowAsUnix) result.isInReactionPeriod = true;
  if (contributionPeriodStartsAt < nowAsUnix && contributionPeriodEndsAt > nowAsUnix)
    result.isInContributionPeriod = true;
  return result;
}

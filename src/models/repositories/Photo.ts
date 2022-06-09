import Debug from 'debug';
import { FilterQuery } from 'mongoose';
import { ModelRepositories } from '.';
import { PaginationRequestParams } from '../../@types/pagination';
import { NotFoundError } from '../../lib/http/HTTPError';
import { PhotoEventCache } from '../../lib/photo-event-monitor/cache';
import { AnnotationAnswer } from '../../lib/prompts';
import {
  LeanPhoto,
  LeanPhotoWithoutId,
  Photo,
  PhotoLocationData,
  PhotoModel,
  photoToJSON,
  PhotoWithUserReactionStatus
} from '../Photo';
import { User } from '../User';
import { UserGroup } from '../UserGroup';
import { getActiveCollaborationPeriods } from './PhotoEvent';

const debug = Debug('Photo');

export async function create(options: { event: string; imageUrl: string; createdBy: string }) {
  debug(`Creating photo with params `, options);

  const event = await ModelRepositories.PhotoEvent.assertExists(options.event);

  const photo = await PhotoModel.create({
    ...options,
    annotationPrompts: event.annotationPrompts,
    reactionPrompts: event.reactionPrompts,
    annotationAnswers: []
  });

  debug(`Successfully created Photo document with ID "${photo._id}"`);

  return photo;
}

export async function updateThumbnails(photoId: string, thumbnails: Thumbnail[]) {
  const update = await PhotoModel.updateOne(
    {
      _id: photoId
    },
    {
      thumbnails
    }
  );

  if (update.nModified === 0) throw new NotFoundError('Photo does not exist');
}

export async function annotate(id: string, annotationAnswers: AnnotationAnswer[]) {
  debug(`Annotating photo ${id} with answer `, annotationAnswers);

  const photo = await PhotoModel.findByIdAndUpdate(
    id,
    {
      annotationAnswers
    },
    {
      new: true
    }
  );

  if (!photo) throw new NotFoundError('Photo does not exist');

  debug(`Successfully annotated Photo document with ID "${photo._id}"`);

  return photo;
}

export async function updateMetadata(id: string, params: { exifData: any; locationData: PhotoLocationData }) {
  debug(`Updating metadata for photo ${id} with data `, params);

  const photo = await PhotoModel.findByIdAndUpdate(id, {
    ...params
  });

  if (!photo) throw new NotFoundError('Photo does not exist');

  debug(`Successfully updated metadata for Photo document with ID "${photo._id}"`);

  return photo;
}

export async function listForUserInEvent(
  eventId: string,
  userId: string,
  pagination: PaginationRequestParams
): Promise<{ count: number; photos: PhotoWithUserReactionStatus[] }> {
  const photoEvent = await PhotoEventCache.get(eventId);
  await ModelRepositories.UserGroup.assertUserIsMember((photoEvent.group as UserGroup).id, userId);

  let query: FilterQuery<Photo> = {
    event: photoEvent._id,
    createdBy: userId
  };

  const activeCollaborationPeriods = getActiveCollaborationPeriods(photoEvent);
  /**
   * Photos are anonymous by default. If the event is:
   * - set to always show peer content,
   * - or we're during/after the reaction period and the event is set to only show peer
   *   content after the contribution period has finished (the reaction period has started),
   * Then we remove the createdBy query filter to show Photos created by all users instead
   * of just the currently authenticated user.
   *
   * Eventually, we might want to allow group admins to see everything, regardless of
   * the peerContentAccess settings on the PhotoEvent.
   */
  if (
    photoEvent.peerContentAccess === 'always' ||
    (photoEvent.peerContentAccess === 'reaction' &&
      (activeCollaborationPeriods.isInReactionPeriod || activeCollaborationPeriods.isAfterReactionPeriod))
  ) {
    delete query.createdBy;
  }

  const [count, photos, reactionsInEvent] = await Promise.all([
    PhotoModel.countDocuments(query),
    PhotoModel.find(query).skip(pagination.skip).limit(pagination.limit).sort({
      createdAt: -1
    }),
    ModelRepositories.PhotoReaction.listForEvent(eventId, userId)
  ]);
  const alreadyReactedPhotoIds = reactionsInEvent.map((reaction) => reaction.photo.toString());

  return {
    count,
    photos: photos.map((photo) => ({
      ...photoToJSON(photo),
      hasReacted: alreadyReactedPhotoIds.includes(photo.id)
    }))
  };
}

export async function listBetweenDates(eventId: string, userId: string, start: Date, end: Date) {
  const photoEvent = await PhotoEventCache.get(eventId);
  await ModelRepositories.UserGroup.assertUserIsMember((photoEvent.group as UserGroup).id, userId);

  const photos = await PhotoModel.find({
    // @ts-ignore
    event: eventId,
    createdBy: userId,
    createdAt: {
      $lte: end.valueOf(),
      $gte: start.valueOf()
    }
  }).sort({
    createdAt: -1
  });

  return photos;
}

/**
 * Gets a list of 20 random photos from an event for a specific user. This is used for the one-by-one reaction
 * view in the app, where the user is given batches of photos and can request another batch to react to.
 *
 * If it's the first time a user has requested these images (we infer this by checking if they've reacted to any)
 * and the user has a demographicGroup set, we return a list of photos from users who are part of the same
 * demographicGroup.
 *
 * Otherwise, we return a random list of photos, but only ones they have not yet reacted to.
 *
 * @todo Check performance — maybe we need to cache the photo IDs per user that they've reacted to
 *
 * @param eventId The event to list the photos for
 * @param user The user requesting the photos
 * @returns An array of Photo documents
 */
export async function listRandomForEvent(eventId: string, user: User) {
  const photoEvent = await PhotoEventCache.get(eventId);
  await ModelRepositories.UserGroup.assertUserIsMember((photoEvent.group as UserGroup).id, user.id);

  const reactionsFromUserInEvent = await ModelRepositories.PhotoReaction.listForEvent(photoEvent.id, user.id);
  const alreadyReactedPhotoIds = reactionsFromUserInEvent.map((reaction) => reaction.photo);

  const baseQuery: FilterQuery<Photo> = {
    event: eventId,
    createdBy: {
      $ne: user.id
    }
  };

  let query: FilterQuery<Photo> = {
    ...baseQuery
  };

  // The user has a demographic group — get a list of photos from the same demographicGroup
  if (user.demographicGroup !== null) {
    const membersInGroup = await ModelRepositories.UserGroup.listMembers(photoEvent.group as string);
    const membersInSameDemographicGroup = membersInGroup.filter(
      (member) => member.id !== user.id && member.demographicGroup === user.demographicGroup
    );

    if (membersInSameDemographicGroup.length > 0) {
      query.$or = membersInSameDemographicGroup.map((member) => ({ createdBy: member.id }));
    }
  }

  // The user has already reacted to some photos — make sure we only return photos they haven't yet reacted to by excluding ones they have reacted to
  if (alreadyReactedPhotoIds.length > 0) {
    query._id = {
      $nin: alreadyReactedPhotoIds
    };
  }

  let photos: Photo[] = [];
  let remainingCount = 0;

  photos = await PhotoModel.find(query).limit(20).sort({
    createdAt: -1
  });

  const excludedPhotoIds = [...alreadyReactedPhotoIds, ...photos.map((photo) => photo.id)];

  // If we've got less than 20, we need to pad the result with other photos
  if (photos.length < 20) {
    const limit = 20 - photos.length;
    let toPadQuery: FilterQuery<Photo> = {
      ...baseQuery
    };

    // Don't show photos the user has already reacted to/photos which have already been fetched
    if (excludedPhotoIds.length > 0) {
      toPadQuery._id = {
        $nin: excludedPhotoIds
      };
    }

    const toPad = await PhotoModel.find(toPadQuery).skip(0).limit(limit).sort({
      createdAt: -1
    });

    photos = [...photos, ...toPad];
  }

  if (excludedPhotoIds.length > 0 || photos.length > 0) {
    remainingCount = await PhotoModel.countDocuments({
      ...baseQuery,
      _id: {
        $nin: [...excludedPhotoIds, ...photos.map((photo) => photo.id)]
      }
    });
  }

  return { photos, remainingCount };
}

export async function destroy(id: string, userId: string) {
  debug(`Attempting to destroy with id ${id} `);

  const result = await PhotoModel.deleteOne({ _id: id, createdBy: userId });
  if (result.deletedCount !== 1) throw new NotFoundError(`Photo does not exist or user is not creator`);

  await ModelRepositories.PhotoReaction.destroyForPhoto(id);

  debug(`Successfully destroyed`);
}

export async function assertExists(id: string) {
  const photo = await PhotoModel.findById(id);

  if (!photo) throw new NotFoundError(`Photo "${id}" does not exist`);

  return photo;
}

export function omitId(photo: LeanPhoto): LeanPhotoWithoutId {
  const { _id, ...rest } = photo;
  return {
    ...rest,
    id: _id
  };
}

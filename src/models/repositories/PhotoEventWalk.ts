import Debug from 'debug';
import { FilterQuery } from 'mongoose';
import { ModelRepositories } from '.';
import { NotFoundError } from '../../lib/http/HTTPError';
import { LocationDataPointWithTimestamp } from '../../lib/location/types';
import { PhotoEventWalk, PhotoEventWalkModel, PhotoEventWalkWithPhotos } from '../PhotoEventWalk';

const debug = Debug('PhotoEventWalk');

export async function create(options: {
  name: string;
  event: string;
  distance: number;
  duration: number;
  startedAt: string;
  endedAt: string;
  createdBy: string;
  locationData: LocationDataPointWithTimestamp<string>[];
}) {
  debug(`Creating PhotoEventWalk with params `, options);

  const event = await ModelRepositories.PhotoEvent.assertExists(options.event);
  await ModelRepositories.UserGroup.assertUserIsMember(event.group as string, options.createdBy);

  const photoEventWalk = await PhotoEventWalkModel.create({
    event: event.id,
    status: 'completed',
    distance: options.distance,
    duration: options.duration,
    locationData: options.locationData,
    createdBy: options.createdBy,
    name: options.name,
    startedAt: options.startedAt,
    endedAt: options.endedAt
  });

  debug(`Successfully created PhotoEventWalk document with ID "${photoEventWalk._id}"`);

  return photoEventWalk;
}

export async function getForEvent(eventId: string) {
  await ModelRepositories.PhotoEvent.assertExists(eventId);

  const query: FilterQuery<PhotoEventWalk> = {
    event: eventId
  };

  const walks = await PhotoEventWalkModel.find(query);
  return walks;
}

export async function getForUserInEvent(eventId: string, userId: string): Promise<PhotoEventWalkWithPhotos[]> {
  await ModelRepositories.PhotoEvent.assertExists(eventId);

  const query: FilterQuery<PhotoEventWalk> = {
    event: eventId,
    createdBy: userId
  };

  const walks = await PhotoEventWalkModel.find(query).select('-locationData');
  const walksWithPhotos: PhotoEventWalkWithPhotos[] = [];

  for (const walk of walks) {
    if (!walk.startedAt || !walk.endedAt) continue;
    const photos = await ModelRepositories.Photo.listBetweenDates(eventId, userId, walk.startedAt, walk.endedAt);
    walksWithPhotos.push({
      ...walk.toObject(),
      photos
    });
  }

  return walksWithPhotos;
}

export async function get(id: string): Promise<PhotoEventWalk> {
  return await ModelRepositories.PhotoEventWalk.assertExists(id);
}

export async function assertExists(id: string) {
  const walk = await PhotoEventWalkModel.findById(id);

  if (!walk) throw new NotFoundError(`Walk "${id}" does not exist`);

  return walk;
}

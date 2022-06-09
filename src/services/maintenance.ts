import { Application, Request, Response } from 'express';
import { AuthenticatedRequest } from '../@types/auth';
import { apiKeyAuthenticated } from '../lib/express-middleware/apiKeyAuthenticated';
import { PhotoEventWalkModel } from '../models/PhotoEventWalk';

export default (app: Application): void => {
  app.post(
    '/v1/maintenance/photo-event-walk/distance-duration',
    apiKeyAuthenticated,
    async (
      req: AuthenticatedRequest<Request<{}, {}, {}>>,
      res: Response<{
        count: number;
      }>
    ) => {
      try {
        const walks = await PhotoEventWalkModel.find().limit(1000);
        let count = 0;

        for (const walk of walks) {
          const { distance, duration } = calculateWalkDistanceAndDuration(
            walk.startedAt,
            walk.endedAt,
            walk.locationData
          );

          await walk.updateOne({
            distance,
            duration
          });

          count++;
        }

        res.success({ count });
      } catch (err) {
        res.error(err);
      }
    }
  );

  app.post(
    '/v1/maintenance/photo-event-walk/remove-unnecessary-keys',
    apiKeyAuthenticated,
    async (
      req: AuthenticatedRequest<Request<{}, {}, {}>>,
      res: Response<{
        count: number;
      }>
    ) => {
      try {
        const walks = await PhotoEventWalkModel.find().limit(1000);
        let count = 0;

        for (const walk of walks) {
          await walk.updateOne({
            locationData: walk.locationData.map((data) => ({
              latitude: data.latitude,
              longitude: data.longitude,
              timestamp: data.timestamp
            }))
          });

          count++;
        }

        res.success({ count });
      } catch (err) {
        res.error(err);
      }
    }
  );
};

function calculateWalkDistanceAndDuration(
  startedAt: Date,
  endedAt: Date,
  locationData: { latitude: string; longitude: string }[]
) {
  const parsedLocationData = locationData.map((location) => ({
    latitude: parseFloat(location.latitude),
    longitude: parseFloat(location.longitude)
  }));

  return {
    duration: !endedAt || !startedAt ? 0 : endedAt.valueOf() - startedAt.valueOf(),
    distance: parsedLocationData.reduce((result, currentPoint, index) => {
      const nextPoint = parsedLocationData[index + 1];

      if (nextPoint) {
        result += haversineDistance(currentPoint, nextPoint);
      }

      return result;
    }, 0)
  };
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

export function haversineDistance(pointA: Coordinates, pointB: Coordinates): number {
  const radius = 6371; // km

  const deltaLatitude = ((pointB.latitude - pointA.latitude) * Math.PI) / 180;
  const deltaLongitude = ((pointB.longitude - pointA.longitude) * Math.PI) / 180;

  const halfChordLength =
    Math.cos((pointA.latitude * Math.PI) / 180) *
      Math.cos((pointB.latitude * Math.PI) / 180) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2) +
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2);

  const angularDistance = 2 * Math.atan2(Math.sqrt(halfChordLength), Math.sqrt(1 - halfChordLength));

  return radius * angularDistance;
}

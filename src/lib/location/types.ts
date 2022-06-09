export interface LocationDataPoint {
  latitude: string;
  longitude: string;
}

export type LocationDataPointWithTimestamp<T = Date> = LocationDataPoint & {
  timestamp: T;
};

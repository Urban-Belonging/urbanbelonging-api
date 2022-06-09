import Debug from 'debug';
import { ModelRepositories } from '.';
import { DeviceModel } from '../Device';

const debug = Debug('Device');

export async function create(options: { token: string; user: string; platform: 'ios' | 'android' }) {
  debug(`Creating device with params `, options);

  await ModelRepositories.User.assertExists(options.user);

  const existingDeviceForToken = await DeviceModel.findOne({
    token: options.token,
    user: options.user
  });

  debug(`Device already exists for token ${options.token} and user ${options.user}`);

  if (existingDeviceForToken) return existingDeviceForToken;

  const device = await DeviceModel.create(options);

  debug(`Successfully created Device document with ID "${device._id}"`);

  return device;
}

export async function unregisterMultipleTokens(deviceTokens: string[]) {
  await DeviceModel.deleteMany({
    $or: deviceTokens.map((token) => ({ token }))
  });
}

export async function unregister(deviceToken: string) {
  await DeviceModel.deleteOne({
    deviceToken
  });
}

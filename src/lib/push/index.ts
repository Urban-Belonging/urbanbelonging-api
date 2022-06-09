import Debug from 'debug';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { Device, DeviceModel } from '../../models/Device';
import { ModelRepositories } from '../../models/repositories';
import { UserGroupMembershipModel } from '../../models/UserGroupMembership';
import type { PushNotification } from './types';

const expo = new Expo({});

const debug = Debug('Push');

async function send(devices: Device[], notification: PushNotification) {
  const validDevices = devices.filter((device) => {
    if (!Expo.isExpoPushToken(device.token)) return false;
    return true;
  });

  const messages = validDevices.map<ExpoPushMessage>((device) => ({
    to: device.token,
    sound: 'default',
    body: notification.message,
    title: notification.title,
    data: notification.params
  }));

  const chunks = await expo.chunkPushNotifications(messages);
  const tokensToUnregister: string[] = [];

  for (const chunk of chunks) {
    try {
      // @todo handle push errors, docs here: https://github.com/expo/expo-server-sdk-node
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      for (const [ticketIndex, ticket] of tickets.entries()) {
        if (ticket.status === 'error') {
          console.error(`Failed to send push ${notification.params.notificationType}, message: ${ticket.message}`);

          // Catch any failed sends due to devices not being registered and mark for deletion
          if (ticket.details?.error === 'DeviceNotRegistered') {
            const messageFromChunk = chunk[ticketIndex];
            if (!messageFromChunk) continue;

            tokensToUnregister.push(messageFromChunk.to as string);
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
  }

  // Unregister any tokens marked for deletion
  if (tokensToUnregister.length > 0) {
    await ModelRepositories.Device.unregisterMultipleTokens(tokensToUnregister);
  }
}

const Push = {
  async sendToGroup(groupId: string, notification: PushNotification) {
    const membersInGroup = await UserGroupMembershipModel.find({
      group: groupId
    }).lean();

    if (membersInGroup.length === 0) return;

    const devicesInGroup = await DeviceModel.find({
      $or: membersInGroup.map((membership) => ({
        user: membership.user
      }))
    });

    debug(`sendToGroup() Sending push notification to ${devicesInGroup.length} in group ${groupId}`, notification);

    if (devicesInGroup.length > 0) {
      await send(devicesInGroup, notification);
    }
  },
  async sendToUser(userId: string, notification: PushNotification) {
    debug(`sendToUser() Sending push notification ${userId} `, notification);
    const devicesForUser = await DeviceModel.find({
      user: userId
    });

    if (devicesForUser.length > 0) {
      await send(devicesForUser, notification);
    }
  }
};

export default Push;

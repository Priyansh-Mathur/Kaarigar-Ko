// Persist in-app notifications + fan out Expo push (mirrors NotificationsService).
const prisma = require('../config/db');

async function notify(userId, type, title, body, data) {
  await prisma.notification
    .create({ data: { userId, channel: 'PUSH', type, title, body, data: data ?? undefined } })
    .catch(() => undefined);

  const devices = await prisma.device.findMany({ where: { userId } });
  const messages = devices
    .filter((d) => /^Expo(nent)?PushToken\[/.test(d.fcmToken))
    .map((d) => ({ to: d.fcmToken, title, body, data: data ?? {}, sound: 'default' }));

  if (messages.length === 0) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch (e) {
    console.warn(`Push send failed: ${e.message}`);
  }
}

module.exports = { notify };

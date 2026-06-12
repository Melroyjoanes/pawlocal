self.addEventListener('push', function(event) {
  if (!event.data) return
  let data
  try { data = event.data.json() } catch { data = { title: 'PupStep', body: event.data.text() } }

  const options = {
    body: data.body ?? 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url ?? '/' },
    actions: data.actions ?? [],
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'PupStep', options)
  )
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})

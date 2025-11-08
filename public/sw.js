
self.addEventListener('push', function(event) {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: data.icon || '/icon.svg', // Default icon
    badge: data.badge || '/badge.png' // Default badge
  };
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

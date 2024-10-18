from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import Notification
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .serializers import NotificationSerializer
from django.core.exceptions import ObjectDoesNotExist
from login.models import Friend
from django.db.models import Q

@receiver(post_save, sender=Notification)
def notify_user(sender, instance, created, **kwargs):
    if created:
        if instance.notif_type == 'FR':
            friends = Friend.objects.filter(Q(user1=instance.from_user, user2=instance.to_user) |
                                            Q(user1=instance.to_user, user2=instance.from_user))
            if not friends.exists():
                Friend.objects.create(user1=instance.from_user, user2=instance.to_user, status='pending')
        channel_layer = get_channel_layer()
        notification_serializer = NotificationSerializer(instance)
        notif_type = instance.notif_type
        room_group_name = f'user_{instance.to_user.id}_NOTIF'
        async_to_sync(channel_layer.group_send)(
            room_group_name,
            {
                'type': 'send_notification',
                'notification': notification_serializer.data
            }
        )
    else:
        if instance.notif_type == 'FR':
            friends = Friend.objects.filter(Q(user1=instance.from_user, user2=instance.to_user) |
                                            Q(user1=instance.to_user, user2=instance.from_user))
            if friends.exists():
                friends.update(status='friends' if instance.status == 'accepted' else 'None')

@receiver(pre_save, sender=Notification)
def check_GR_status_change(sender, instance, **kwargs):
    by_receiver_status = ['accepted', 'declined']
    if instance.pk:
        try:
            old_instance = Notification.objects.get(pk=instance.pk)
        except Notification.DoesNotExist:
            print('Notification does not exist')
            return
        if old_instance.status != 'pending':
            return
        channel_layer = get_channel_layer()
        status = instance.status
        if instance.status == 'accepted' and instance.notif_type == 'GR' and instance.is_expired():
            status = 'expired'
            if instance.from_user.status_game != 'available':
                status = 'unavailable'
        Notification.objects.filter(pk=instance.pk).update(status=status)
        instance.refresh_from_db()
        notification_serializer = NotificationSerializer(instance)
        user_id = instance.from_user.id if status in by_receiver_status else instance.to_user.id
        room_group_name = f'user_{user_id}_NOTIF'
        print(f'Sending notification to group {room_group_name}, status: {status}')

        async_to_sync(channel_layer.group_send)(
            room_group_name,
            {
                'type': 'send_notification',
                'notification': notification_serializer.data
            }
        )


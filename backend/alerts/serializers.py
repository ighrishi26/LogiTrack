
from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    shipment_tracking_number = serializers.CharField(
        source="shipment.tracking_number",
        read_only=True,
        default=None,
    )

    class Meta:
        model = Notification
        fields = [
            "id",
            "notification_type",
            "title",
            "message",
            "shipment",
            "shipment_tracking_number",
            "is_read",
            "created_at",
        ]
        read_only_fields = fields

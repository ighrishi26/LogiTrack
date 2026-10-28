
from django.conf import settings
from django.db import models


class Notification(models.Model):
    class NotificationType(models.TextChoices):
        SHIPMENT_STATUS = "SHIPMENT_STATUS", "Shipment status"
        DELIVERY_EXCEPTION = "DELIVERY_EXCEPTION", "Delivery exception"
        SYSTEM = "SYSTEM", "System"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="alerts",
    )
    notification_type = models.CharField(
        max_length=30,
        choices=NotificationType.choices,
        default=NotificationType.SYSTEM,
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    shipment = models.ForeignKey(
        "shipments.Shipment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="alerts",
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} - {self.recipient}"

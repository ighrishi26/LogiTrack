from django.conf import settings
from django.db import models


class DeliveryRoute(models.Model):
    class Status(models.TextChoices):
        PLANNED = "PLANNED", "Planned"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    name = models.CharField(max_length=150)
    route_date = models.DateField()

    driver = models.ForeignKey(
        "fleet.Driver",
        on_delete=models.PROTECT,
        related_name="delivery_routes",
    )

    vehicle = models.ForeignKey(
        "fleet.Vehicle",
        on_delete=models.PROTECT,
        related_name="delivery_routes",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PLANNED,
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_delivery_routes",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["route_date", "name"]

    def __str__(self):
        return self.name


class RouteStop(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        COMPLETED = "COMPLETED", "Completed"
        SKIPPED = "SKIPPED", "Skipped"

    route = models.ForeignKey(
        DeliveryRoute,
        on_delete=models.CASCADE,
        related_name="stops",
    )

    shipment = models.ForeignKey(
        "shipments.Shipment",
        on_delete=models.PROTECT,
        related_name="route_stops",
    )

    stop_order = models.PositiveIntegerField()

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )

    completed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["stop_order"]
        constraints = [
            models.UniqueConstraint(
                fields=["route", "shipment"],
                name="unique_shipment_per_route",
            ),
            models.UniqueConstraint(
                fields=["route", "stop_order"],
                name="unique_stop_order_per_route",
            ),
            models.CheckConstraint(
                condition=models.Q(stop_order__gte=1),
                name="route_stop_order_gte_1",
            ),
        ]

    def __str__(self):
        return (
            f"{self.route.name} - Stop {self.stop_order}: "
            f"{self.shipment.tracking_number}"
        )

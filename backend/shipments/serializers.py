
from rest_framework import serializers
from .models import DeliveryException, Shipment, TrackingHistory


class TrackingHistorySerializer(serializers.ModelSerializer):
    updated_by_username = serializers.CharField(
        source="updated_by.username",
        read_only=True,
        default=None,
    )

    class Meta:
        model = TrackingHistory
        fields = [
            "id",
            "status",
            "location",
            "notes",
            "updated_by_username",
            "timestamp",
        ]
        read_only_fields = fields


class ShipmentSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(
        source="created_by.username",
        read_only=True,
        default=None,
    )
    tracking_history = TrackingHistorySerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = Shipment
        fields = "__all__"
        read_only_fields = [
            "id",
            "tracking_number",
            "created_by",
            "created_at",
            "updated_at",
        ]

    def validate_weight_kg(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Weight must be greater than zero."
            )
        return value

    def validate_shipping_cost(self, value):
        if value < 0:
            raise serializers.ValidationError(
                "Shipping cost cannot be negative."
            )
        return value


class PublicTrackingHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TrackingHistory
        fields = [
            "status",
            "location",
            "notes",
            "timestamp",
        ]


class PublicShipmentTrackingSerializer(serializers.ModelSerializer):
    tracking_history = PublicTrackingHistorySerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = Shipment
        fields = [
            "tracking_number",
            "origin",
            "destination",
            "status",
            "created_at",
            "estimated_delivery",
            "actual_delivery",
            "tracking_history",
        ]

class DeliveryExceptionSerializer(serializers.ModelSerializer):
    shipment_tracking_number = serializers.CharField(
        source="shipment.tracking_number",
        read_only=True,
    )
    reported_by_username = serializers.CharField(
        source="reported_by.username",
        read_only=True,
        default=None,
    )
    resolved_by_username = serializers.CharField(
        source="resolved_by.username",
        read_only=True,
        default=None,
    )

    class Meta:
        model = DeliveryException
        fields = "__all__"
        read_only_fields = [
            "id",
            "reported_by",
            "resolved_by",
            "created_at",
            "updated_at",
            "resolved_at",
        ]

    def validate_description(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Please describe the delivery issue."
            )

        if len(value) < 10:
            raise serializers.ValidationError(
                "Description must contain at least 10 characters."
            )

        return value

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if (
            user
            and getattr(user, "role", None) == "CUSTOMER"
            and self.instance is None
        ):
            shipment = attrs.get("shipment")

            if shipment and shipment.created_by_id != user.id:
                raise serializers.ValidationError({
                    "shipment": (
                        "You can only report an issue for "
                        "a shipment you created."
                    )
                })

        if self.instance:
            old_status = self.instance.status
            new_status = attrs.get("status", old_status)
            notes = attrs.get(
                "resolution_notes",
                self.instance.resolution_notes,
            )

            if (
                new_status == DeliveryException.Status.RESOLVED
                and not notes.strip()
            ):
                raise serializers.ValidationError({
                    "resolution_notes": (
                        "Add resolution notes before resolving "
                        "an exception."
                    )
                })

        return attrs
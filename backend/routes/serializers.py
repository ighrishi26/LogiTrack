from rest_framework import serializers

from .models import DeliveryRoute, RouteStop


class RouteStopSerializer(serializers.ModelSerializer):
    shipment_tracking_number = serializers.CharField(
        source="shipment.tracking_number",
        read_only=True,
    )

    class Meta:
        model = RouteStop
        fields = [
            "id",
            "shipment",
            "shipment_tracking_number",
            "stop_order",
            "status",
            "completed_at",
        ]
        read_only_fields = ["id", "completed_at"]


class DeliveryRouteSerializer(serializers.ModelSerializer):
    driver_name = serializers.CharField(
        source="driver.name",
        read_only=True,
    )

    vehicle_registration = serializers.CharField(
        source="vehicle.registration_number",
        read_only=True,
    )

    stops = RouteStopSerializer(many=True, read_only=True)

    class Meta:
        model = DeliveryRoute
        fields = [
            "id",
            "name",
            "route_date",
            "driver",
            "driver_name",
            "vehicle",
            "vehicle_registration",
            "status",
            "created_by",
            "created_at",
            "updated_at",
            "stops",
        ]
        read_only_fields = [
            "id",
            "created_by",
            "created_at",
            "updated_at",
            "stops",
        ]

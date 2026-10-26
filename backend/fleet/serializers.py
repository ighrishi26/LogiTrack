
from rest_framework import serializers
from .models import Driver, Vehicle


class DriverSerializer(serializers.ModelSerializer):
    class Meta:
        model = Driver
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_phone(self, value):
        value = value.strip()
        if len(value) < 7:
            raise serializers.ValidationError(
                "Enter a valid phone number."
            )
        return value


class VehicleSerializer(serializers.ModelSerializer):
    assigned_driver_name = serializers.CharField(
        source="assigned_driver.name",
        read_only=True,
        default=None,
    )

    class Meta:
        model = Vehicle
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_capacity_kg(self, value):
        if value < 0:
            raise serializers.ValidationError(
                "Vehicle capacity cannot be negative."
            )
        return value

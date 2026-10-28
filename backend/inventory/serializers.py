
from rest_framework import serializers

from .models import InventoryItem, InventoryMovement


class InventoryItemSerializer(serializers.ModelSerializer):
    warehouse_name = serializers.CharField(
        source="warehouse.name",
        read_only=True,
    )

    warehouse_code = serializers.CharField(
        source="warehouse.facility_code",
        read_only=True,
    )

    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = InventoryItem
        fields = [
            "id",
            "warehouse",
            "warehouse_name",
            "warehouse_code",
            "sku",
            "name",
            "description",
            "quantity",
            "reorder_level",
            "unit",
            "is_low_stock",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "quantity",
            "created_at",
            "updated_at",
        ]

    def validate_sku(self, value):
        value = value.strip().upper()

        if not value:
            raise serializers.ValidationError(
                "SKU cannot be empty."
            )

        return value

    def validate(self, attrs):
        warehouse = attrs.get(
            "warehouse",
            getattr(self.instance, "warehouse", None),
        )

        sku = attrs.get(
            "sku",
            getattr(self.instance, "sku", None),
        )

        if warehouse and sku:
            existing = InventoryItem.objects.filter(
                warehouse=warehouse,
                sku=sku,
            )

            if self.instance:
                existing = existing.exclude(
                    pk=self.instance.pk
                )

            if existing.exists():
                raise serializers.ValidationError({
                    "sku": "This SKU already exists in this warehouse."
                })

        return attrs


class InventoryMovementSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(
        source="item.name",
        read_only=True,
    )

    item_sku = serializers.CharField(
        source="item.sku",
        read_only=True,
    )

    performed_by_username = serializers.CharField(
        source="performed_by.username",
        read_only=True,
    )

    class Meta:
        model = InventoryMovement

        fields = [
            "id",
            "item",
            "item_name",
            "item_sku",
            "movement_type",
            "quantity",
            "previous_quantity",
            "new_quantity",
            "notes",
            "performed_by",
            "performed_by_username",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "previous_quantity",
            "new_quantity",
            "performed_by",
            "created_at",
        ]

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Quantity must be greater than zero."
            )

        return value

from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator


class InventoryItem(models.Model):
    warehouse = models.ForeignKey(
        "warehouses.Warehouse",
        on_delete=models.PROTECT,
        related_name="inventory_items",
    )

    sku = models.CharField(max_length=60)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    quantity = models.PositiveIntegerField(default=0)
    reorder_level = models.PositiveIntegerField(default=10)

    unit = models.CharField(max_length=30, default="pcs")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["warehouse", "sku"],
                name="unique_inventory_sku_per_warehouse",
            )
        ]

    def __str__(self):
        return f"{self.name} ({self.sku})"

    @property
    def is_low_stock(self):
        return self.quantity <= self.reorder_level


class InventoryMovement(models.Model):
    class MovementType(models.TextChoices):
        STOCK_IN = "STOCK_IN", "Stock In"
        STOCK_OUT = "STOCK_OUT", "Stock Out"
        ADJUSTMENT = "ADJUSTMENT", "Adjustment"

    item = models.ForeignKey(
        InventoryItem,
        on_delete=models.PROTECT,
        related_name="movements",
    )

    movement_type = models.CharField(
        max_length=20,
        choices=MovementType.choices,
    )

    quantity = models.PositiveIntegerField(
        validators=[MinValueValidator(1)]
    )

    previous_quantity = models.PositiveIntegerField()
    new_quantity = models.PositiveIntegerField()

    notes = models.TextField(blank=True)

    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.item.sku} - {self.movement_type}"
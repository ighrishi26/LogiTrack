
from django.conf import settings
from django.db import models


class Driver(models.Model):
    AVAILABILITY_CHOICES = [
        ("AVAILABLE", "Available"),
        ("ON_DELIVERY", "On Delivery"),
        ("ON_LEAVE", "On Leave"),
        ("INACTIVE", "Inactive"),
    ]

    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, unique=True)
    email = models.EmailField(blank=True)
    license_number = models.CharField(max_length=50, unique=True)
    license_expiry = models.DateField(null=True, blank=True)
    address = models.TextField(blank=True)
    availability = models.CharField(
        max_length=20,
        choices=AVAILABILITY_CHOICES,
        default="AVAILABLE",
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Vehicle(models.Model):
    VEHICLE_TYPES = [
        ("VAN", "Van"),
        ("TRUCK", "Truck"),
        ("MINI_TRUCK", "Mini Truck"),
        ("BIKE", "Bike"),
        ("OTHER", "Other"),
    ]

    VEHICLE_STATUS = [
        ("AVAILABLE", "Available"),
        ("IN_USE", "In Use"),
        ("MAINTENANCE", "Maintenance"),
        ("INACTIVE", "Inactive"),
    ]

    registration_number = models.CharField(max_length=30, unique=True)
    vehicle_type = models.CharField(
        max_length=20,
        choices=VEHICLE_TYPES,
        default="VAN",
    )
    make_model = models.CharField(max_length=120)
    capacity_kg = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
    )
    status = models.CharField(
        max_length=20,
        choices=VEHICLE_STATUS,
        default="AVAILABLE",
    )
    assigned_driver = models.ForeignKey(
        Driver,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="vehicles",
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["registration_number"]

    def __str__(self):
        return f"{self.registration_number} - {self.make_model}"

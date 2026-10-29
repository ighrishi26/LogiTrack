
import os
import uuid
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class Shipment(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        CONFIRMED = "CONFIRMED", "Confirmed"
        PICKED_UP = "PICKED_UP", "Picked Up"
        IN_TRANSIT = "IN_TRANSIT", "In Transit"
        OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY", "Out for Delivery"
        DELIVERED = "DELIVERED", "Delivered"
        CANCELLED = "CANCELLED", "Cancelled"

    tracking_number = models.CharField(
        max_length=20,
        unique=True,
        editable=False,
    )
    sender_name = models.CharField(max_length=150)
    sender_phone = models.CharField(max_length=20)
    sender_address = models.TextField()
    receiver_name = models.CharField(max_length=150)
    receiver_phone = models.CharField(max_length=20)
    receiver_address = models.TextField()
    origin = models.CharField(max_length=150)
    destination = models.CharField(max_length=150)
    package_description = models.TextField(blank=True)
    weight_kg = models.DecimalField(max_digits=10, decimal_places=2)
    shipping_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
    )
    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.PENDING,
    )
    estimated_delivery = models.DateField(null=True, blank=True)
    actual_delivery = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_shipments",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.tracking_number:
            self.tracking_number = (
                "LT-" + uuid.uuid4().hex[:10].upper()
            )
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.tracking_number} - {self.status}"


class TrackingHistory(models.Model):
    shipment = models.ForeignKey(
        Shipment,
        on_delete=models.CASCADE,
        related_name="tracking_history",
    )
    status = models.CharField(
        max_length=30,
        choices=Shipment.Status.choices,
    )
    location = models.CharField(max_length=150, blank=True)
    notes = models.TextField(blank=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]
        verbose_name_plural = "Tracking histories"

    def __str__(self):
        return f"{self.shipment.tracking_number} - {self.status}"

class DeliveryException(models.Model):
    class ExceptionType(models.TextChoices):
        FAILED_DELIVERY = "FAILED_DELIVERY", "Failed delivery"
        DAMAGED_PACKAGE = "DAMAGED_PACKAGE", "Damaged package"
        ADDRESS_ISSUE = "ADDRESS_ISSUE", "Incorrect or incomplete address"
        CUSTOMER_UNAVAILABLE = "CUSTOMER_UNAVAILABLE", "Customer unavailable"
        LOST_PACKAGE = "LOST_PACKAGE", "Lost package"
        OTHER = "OTHER", "Other"

    class Severity(models.TextChoices):
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"
        CRITICAL = "CRITICAL", "Critical"

    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        UNDER_REVIEW = "UNDER_REVIEW", "Under review"
        RESOLVED = "RESOLVED", "Resolved"

    shipment = models.ForeignKey(
        Shipment,
        on_delete=models.CASCADE,
        related_name="delivery_exceptions",
    )
    exception_type = models.CharField(
        max_length=30,
        choices=ExceptionType.choices,
    )
    severity = models.CharField(
        max_length=10,
        choices=Severity.choices,
        default=Severity.MEDIUM,
    )
    description = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
    )
    resolution_notes = models.TextField(blank=True)
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reported_delivery_exceptions",
    )
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_delivery_exceptions",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"{self.shipment.tracking_number} - "
            f"{self.exception_type} ({self.status})"
        )


def validate_proof_file(value):
    max_size_bytes = 5 * 1024 * 1024  # 5 MB
    if value.size > max_size_bytes:
        raise ValidationError("File size cannot exceed 5 MB.")

    ext = os.path.splitext(value.name)[1].lower()
    allowed_extensions = [".jpg", ".jpeg", ".png", ".webp", ".pdf"]
    if ext not in allowed_extensions:
        raise ValidationError(
            f"Unsupported file extension '{ext}'. "
            f"Allowed extensions are: {', '.join(allowed_extensions)}."
        )


class ProofOfDelivery(models.Model):
    class RelationshipType(models.TextChoices):
        RECIPIENT = "RECIPIENT", "Direct Recipient"
        FAMILY_MEMBER = "FAMILY_MEMBER", "Family Member"
        COLLEAGUE = "COLLEAGUE", "Colleague / Coworker"
        FRONT_DESK = "FRONT_DESK", "Reception / Front Desk"
        SECURITY = "SECURITY", "Security Personnel"
        NEIGHBOR = "NEIGHBOR", "Neighbor"
        OTHER = "OTHER", "Other"

    shipment = models.OneToOneField(
        Shipment,
        on_delete=models.CASCADE,
        related_name="proof_of_delivery",
    )
    recipient_name = models.CharField(max_length=150)
    recipient_relationship = models.CharField(
        max_length=50,
        choices=RelationshipType.choices,
        default=RelationshipType.RECIPIENT,
        blank=True,
    )
    actual_delivery = models.DateTimeField(default=timezone.now)
    photo = models.FileField(
        upload_to="proof_of_delivery/%Y/%m/",
        null=True,
        blank=True,
        validators=[validate_proof_file],
    )
    delivery_notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recorded_proofs",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Proof of delivery"
        verbose_name_plural = "Proofs of delivery"

    def __str__(self):
        return (
            f"POD for {self.shipment.tracking_number} - "
            f"{self.recipient_name}"
        )

from django.contrib import admin
from .models import Shipment, TrackingHistory, DeliveryException


@admin.register(Shipment)
class ShipmentAdmin(admin.ModelAdmin):
    list_display = (
        "tracking_number",
        "sender_name",
        "receiver_name",
        "origin",
        "destination",
        "status",
        "created_at",
    )
    list_filter = ("status", "origin", "destination")
    search_fields = (
        "tracking_number",
        "sender_name",
        "receiver_name",
    )
    readonly_fields = ("tracking_number", "created_at", "updated_at")

@admin.register(TrackingHistory)
class TrackingHistoryAdmin(admin.ModelAdmin):
    list_display = (
        "shipment",
        "status",
        "location",
        "updated_by",
        "timestamp",
    )
    list_filter = ("status", "timestamp")
    search_fields = ("shipment__tracking_number", "location", "notes")
    readonly_fields = ("timestamp",)
    
@admin.register(DeliveryException)
class DeliveryExceptionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "shipment",
        "exception_type",
        "severity",
        "status",
        "reported_by",
        "created_at",
        "resolved_at",
    )
    list_filter = (
        "exception_type",
        "severity",
        "status",
        "created_at",
    )
    search_fields = (
        "shipment__tracking_number",
        "description",
        "resolution_notes",
    )
    readonly_fields = (
        "created_at",
        "updated_at",
        "resolved_at",
    )
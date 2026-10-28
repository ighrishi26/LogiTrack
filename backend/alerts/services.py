
from .models import Notification


def notify_shipment_status_changed(shipment):
    """Notify the shipment creator when its status changes."""
    recipient = shipment.created_by

    if recipient is None:
        return

    status_label = shipment.get_status_display()

    Notification.objects.create(
        recipient=recipient,
        notification_type=Notification.NotificationType.SHIPMENT_STATUS,
        title=f"Shipment {shipment.tracking_number} updated",
        message=(
            f"Your shipment status is now: {status_label}."
        ),
        shipment=shipment,
    )


def notify_delivery_exception(delivery_exception):
    """Notify relevant users when a delivery exception is reported."""
    shipment = delivery_exception.shipment
    recipients = {}

    # Notify the shipment creator, if there is one.
    if shipment.created_by_id:
        recipients[shipment.created_by_id] = shipment.created_by

    # Notify the person who reported the exception, if different.
    if delivery_exception.reported_by_id:
        recipients[delivery_exception.reported_by_id] = (
            delivery_exception.reported_by
        )

    exception_label = delivery_exception.get_exception_type_display()

    for recipient in recipients.values():
        Notification.objects.create(
            recipient=recipient,
            notification_type=Notification.NotificationType.DELIVERY_EXCEPTION,
            title=f"Delivery issue: {shipment.tracking_number}",
            message=(
                f"{exception_label} reported for shipment "
                f"{shipment.tracking_number}. "
                f"Severity: {delivery_exception.get_severity_display()}."
            ),
            shipment=shipment,
        )

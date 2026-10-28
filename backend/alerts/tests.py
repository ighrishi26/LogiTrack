
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from shipments.models import Shipment

from .models import Notification


User = get_user_model()


class NotificationAPITests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="notification_user",
            password="TestPassword123!",
        )
        self.other_user = User.objects.create_user(
            username="other_notification_user",
            password="TestPassword123!",
        )

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.unread_notification = Notification.objects.create(
            recipient=self.user,
            notification_type=Notification.NotificationType.SYSTEM,
            title="Shipment update",
            message="Your shipment is in transit.",
        )
        self.read_notification = Notification.objects.create(
            recipient=self.user,
            notification_type=Notification.NotificationType.SYSTEM,
            title="Previous update",
            message="Your shipment was confirmed.",
            is_read=True,
        )
        self.other_users_notification = Notification.objects.create(
            recipient=self.other_user,
            notification_type=Notification.NotificationType.SYSTEM,
            title="Private notification",
            message="This belongs to another user.",
        )

    def test_list_only_returns_current_users_notifications(self):
        response = self.client.get("/api/notifications/")

        self.assertEqual(response.status_code, 200)
        returned_ids = {
            item["id"] for item in response.data["results"]
        }
        self.assertIn(self.unread_notification.id, returned_ids)
        self.assertIn(self.read_notification.id, returned_ids)
        self.assertNotIn(self.other_users_notification.id, returned_ids)

    def test_unread_filter_returns_only_unread_notifications(self):
        response = self.client.get("/api/notifications/?unread=true")

        self.assertEqual(response.status_code, 200)
        returned_ids = {
            item["id"] for item in response.data["results"]
        }
        self.assertIn(self.unread_notification.id, returned_ids)
        self.assertNotIn(self.read_notification.id, returned_ids)

    def test_unread_count_is_correct_for_current_user(self):
        response = self.client.get(
            "/api/notifications/unread-count/"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["unread_count"], 1)

    def test_mark_read_updates_notification(self):
        response = self.client.post(
            f"/api/notifications/{self.unread_notification.id}/mark-read/"
        )

        self.assertEqual(response.status_code, 200)
        self.unread_notification.refresh_from_db()
        self.assertTrue(self.unread_notification.is_read)

    def test_user_cannot_mark_another_users_notification_read(self):
        response = self.client.post(
            f"/api/notifications/{self.other_users_notification.id}/mark-read/"
        )

        self.assertEqual(response.status_code, 404)
        self.other_users_notification.refresh_from_db()
        self.assertFalse(self.other_users_notification.is_read)

    def test_mark_all_read_only_updates_current_users_notifications(self):
        response = self.client.post(
            "/api/notifications/mark-all-read/"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["updated_count"], 1)

        self.unread_notification.refresh_from_db()
        self.read_notification.refresh_from_db()
        self.other_users_notification.refresh_from_db()

        self.assertTrue(self.unread_notification.is_read)
        self.assertTrue(self.read_notification.is_read)
        self.assertFalse(self.other_users_notification.is_read)

class AutomaticNotificationTests(TestCase):
    def setUp(self):
        self.customer = User.objects.create_user(
            username="shipment_customer",
            password="TestPassword123!",
            role="CUSTOMER",
        )
        self.manager = User.objects.create_user(
            username="shipment_manager",
            password="TestPassword123!",
            role="MANAGER",
        )

        self.shipment = Shipment.objects.create(
            created_by=self.customer,
            sender_name="Sender",
            sender_phone="1111111111",
            sender_address="Sender Address",
            receiver_name="Receiver",
            receiver_phone="2222222222",
            receiver_address="Receiver Address",
            origin="Pune",
            destination="Mumbai",
            package_description="Test package",
            weight_kg="2.50",
            shipping_cost="100.00",
            status=Shipment.Status.PENDING,
        )

        self.client = APIClient()
        self.client.force_authenticate(user=self.manager)

    def test_status_change_creates_notification_for_shipment_creator(self):
        response = self.client.patch(
            f"/api/shipments/{self.shipment.id}/",
            {"status": Shipment.Status.IN_TRANSIT},
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        notification = Notification.objects.get(
            recipient=self.customer,
            shipment=self.shipment,
            notification_type=(
                Notification.NotificationType.SHIPMENT_STATUS
            ),
        )

        self.assertIn("In Transit", notification.message)

    def test_reporting_delivery_exception_creates_notifications(self):
        response = self.client.post(
            "/api/delivery-exceptions/",
            {
                "shipment": self.shipment.id,
                "exception_type": "FAILED_DELIVERY",
                "severity": "HIGH",
                "description": "Delivery attempt failed.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        notification = Notification.objects.get(
            recipient=self.customer,
            shipment=self.shipment,
            notification_type=(
                Notification.NotificationType.DELIVERY_EXCEPTION
            ),
        )

        self.assertIn(
            self.shipment.tracking_number,
            notification.message,
        )

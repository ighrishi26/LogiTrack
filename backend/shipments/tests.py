from datetime import date
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from alerts.models import Notification
from shipments.models import DeliveryException, ProofOfDelivery, Shipment, TrackingHistory

User = get_user_model()


class ProofOfDeliveryAPITests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="adminuser",
            password="password123",
            role=User.Role.ADMIN,
        )
        self.manager = User.objects.create_user(
            username="manageruser",
            password="password123",
            role=User.Role.MANAGER,
        )
        self.driver = User.objects.create_user(
            username="driveruser",
            password="password123",
            role=User.Role.DRIVER,
        )
        self.customer = User.objects.create_user(
            username="customeruser",
            password="password123",
            role=User.Role.CUSTOMER,
        )
        self.other_customer = User.objects.create_user(
            username="othercustomer",
            password="password123",
            role=User.Role.CUSTOMER,
        )

        self.shipment = Shipment.objects.create(
            sender_name="Alice Sender",
            sender_phone="1234567890",
            sender_address="123 Origin St",
            receiver_name="Bob Receiver",
            receiver_phone="0987654321",
            receiver_address="456 Destination Ave",
            origin="New York",
            destination="Boston",
            weight_kg=5.5,
            shipping_cost=25.00,
            status=Shipment.Status.OUT_FOR_DELIVERY,
            created_by=self.customer,
        )

    def test_unauthenticated_request_rejected(self):
        response = self.client.get("/api/proof-of-delivery/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_driver_successful_pod_submission(self):
        self.client.force_authenticate(user=self.driver)
        payload = {
            "shipment": self.shipment.id,
            "recipient_name": "Bob Receiver",
            "recipient_relationship": "RECIPIENT",
            "delivery_notes": "Delivered to front door",
            "tracking_location": "Boston Front Porch",
        }
        response = self.client.post("/api/proof-of-delivery/", payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        pod = ProofOfDelivery.objects.get(shipment=self.shipment)
        self.assertEqual(pod.recipient_name, "Bob Receiver")
        self.assertEqual(pod.recipient_relationship, "RECIPIENT")
        self.assertEqual(pod.recorded_by, self.driver)

        self.shipment.refresh_from_db()
        self.assertEqual(self.shipment.status, Shipment.Status.DELIVERED)
        self.assertIsNotNone(self.shipment.actual_delivery)
        self.assertEqual(self.shipment.actual_delivery, pod.actual_delivery.date())

        history = TrackingHistory.objects.filter(
            shipment=self.shipment,
            status=Shipment.Status.DELIVERED,
        ).first()
        self.assertIsNotNone(history)
        self.assertEqual(history.location, "Boston Front Porch")
        self.assertEqual(history.updated_by, self.driver)

        notification = Notification.objects.filter(
            recipient=self.customer,
            shipment=self.shipment,
            notification_type=Notification.NotificationType.SHIPMENT_STATUS,
        ).first()
        self.assertIsNotNone(notification)
        self.assertIn("Delivered", notification.message)

    def test_shipment_proof_action_endpoint(self):
        self.client.force_authenticate(user=self.driver)
        payload = {
            "recipient_name": "Bob Receiver",
            "recipient_relationship": "RECIPIENT",
            "delivery_notes": "Left with security",
        }
        response = self.client.post(
            f"/api/shipments/{self.shipment.id}/proof/",
            payload,
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        get_res = self.client.get(
            f"/api/shipments/{self.shipment.id}/proof/"
        )
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)
        self.assertEqual(get_res.data["recipient_name"], "Bob Receiver")

    def test_missing_required_fields(self):
        self.client.force_authenticate(user=self.driver)
        payload = {
            "shipment": self.shipment.id,
            "recipient_name": "   ",
        }
        response = self.client.post("/api/proof-of-delivery/", payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("recipient_name", response.data)

    def test_customer_cannot_submit_pod(self):
        self.client.force_authenticate(user=self.customer)
        payload = {
            "shipment": self.shipment.id,
            "recipient_name": "Self Signer",
        }
        response = self.client.post("/api/proof-of-delivery/", payload)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_customer_can_only_view_own_shipment_pod(self):
        ProofOfDelivery.objects.create(
            shipment=self.shipment,
            recipient_name="Bob Receiver",
            recorded_by=self.driver,
        )

        self.client.force_authenticate(user=self.customer)
        res = self.client.get(f"/api/proof-of-delivery/?shipment={self.shipment.id}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        records = res.data.get("results", res.data)
        self.assertEqual(len(records), 1)

        self.client.force_authenticate(user=self.other_customer)
        res_other = self.client.get(f"/api/proof-of-delivery/?shipment={self.shipment.id}")
        self.assertEqual(res_other.status_code, status.HTTP_200_OK)
        records_other = res_other.data.get("results", res_other.data)
        self.assertEqual(len(records_other), 0)

    def test_duplicate_submission_prevented(self):
        self.client.force_authenticate(user=self.driver)
        payload = {
            "shipment": self.shipment.id,
            "recipient_name": "Bob Receiver",
        }
        res1 = self.client.post("/api/proof-of-delivery/", payload)
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        res2 = self.client.post("/api/proof-of-delivery/", payload)
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("shipment", res2.data)

    def test_cannot_submit_pod_for_cancelled_shipment(self):
        self.shipment.status = Shipment.Status.CANCELLED
        self.shipment.save()

        self.client.force_authenticate(user=self.driver)
        payload = {
            "shipment": self.shipment.id,
            "recipient_name": "Bob Receiver",
        }
        response = self.client.post("/api/proof-of-delivery/", payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_file_upload_rejected(self):
        self.client.force_authenticate(user=self.driver)
        bad_file = SimpleUploadedFile(
            "malicious.exe",
            b"binary_content_here",
            content_type="application/x-msdownload",
        )
        payload = {
            "shipment": self.shipment.id,
            "recipient_name": "Bob Receiver",
            "photo": bad_file,
        }
        response = self.client.post(
            "/api/proof-of-delivery/",
            payload,
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("photo", response.data)

    def test_valid_photo_upload_accepted(self):
        self.client.force_authenticate(user=self.driver)
        valid_img = SimpleUploadedFile(
            "pod_signature.png",
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82",
            content_type="image/png",
        )
        payload = {
            "shipment": self.shipment.id,
            "recipient_name": "Bob Receiver",
            "photo": valid_img,
        }
        response = self.client.post(
            "/api/proof-of-delivery/",
            payload,
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNotNone(response.data.get("photo"))

    def test_driver_cannot_update_pod(self):
        pod = ProofOfDelivery.objects.create(
            shipment=self.shipment,
            recipient_name="Bob Receiver",
            recorded_by=self.driver,
        )
        self.client.force_authenticate(user=self.driver)
        response = self.client.patch(
            f"/api/proof-of-delivery/{pod.id}/",
            {"delivery_notes": "Modified by driver"},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_manager_can_update_pod(self):
        pod = ProofOfDelivery.objects.create(
            shipment=self.shipment,
            recipient_name="Bob Receiver",
            recorded_by=self.driver,
        )
        self.client.force_authenticate(user=self.manager)
        response = self.client.patch(
            f"/api/proof-of-delivery/{pod.id}/",
            {"delivery_notes": "Updated notes by manager"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        pod.refresh_from_db()
        self.assertEqual(pod.delivery_notes, "Updated notes by manager")

    def test_existing_delivery_exception_intact(self):
        self.client.force_authenticate(user=self.manager)
        payload = {
            "shipment": self.shipment.id,
            "exception_type": DeliveryException.ExceptionType.DAMAGED_PACKAGE,
            "severity": DeliveryException.Severity.HIGH,
            "description": "Package box is slightly damaged on corner.",
        }
        response = self.client.post("/api/delivery-exceptions/", payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            DeliveryException.objects.filter(shipment=self.shipment).count(),
            1,
        )

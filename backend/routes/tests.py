from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from fleet.models import Driver, Vehicle
from shipments.models import Shipment
from routes.models import DeliveryRoute, RouteStop

User = get_user_model()


class DeliveryRouteAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.user = User.objects.create_user(
            username="route_tester",
            password="TestPassword123!",
        )
        self.client.force_authenticate(user=self.user)

        self.driver = Driver.objects.create(
            name="Test Driver",
            phone="9876543210",
            license_number="TEST-LIC-001",
        )

        self.vehicle = Vehicle.objects.create(
            registration_number="MH12TEST001",
            vehicle_type="VAN",
            make_model="Tata Ace",
            capacity_kg=1000,
            assigned_driver=self.driver,
        )

        self.shipment = Shipment.objects.create(
            tracking_number="TRK-TEST-001",
            sender_name="Sender",
            sender_phone="9876543210",
            sender_address="Pune",
            receiver_name="Receiver",
            receiver_phone="9876543211",
            receiver_address="Mumbai",
            origin="Pune",
            destination="Mumbai",
            package_description="Test package",
            weight_kg=5,
            shipping_cost=100,
            estimated_delivery=date.today() + timedelta(days=1),
            created_by=self.user,
        )
        self.route_payload = {
            "name": "Pune to Mumbai Delivery",
            "route_date": str(date.today() + timedelta(days=1)),
            "driver": self.driver.id,
            "vehicle": self.vehicle.id,
        }

    def test_authenticated_user_can_create_route(self):
        response = self.client.post(
            "/api/routes/",
            self.route_payload,
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            response.data["name"],
            "Pune to Mumbai Delivery",
        )
        self.assertEqual(response.data["status"], "PLANNED")
        self.assertEqual(response.data["created_by"], self.user.id)

    def test_user_can_add_shipment_as_route_stop(self):
        route = DeliveryRoute.objects.create(
            name="Pune to Mumbai Delivery",
            route_date=date.today() + timedelta(days=1),
            driver=self.driver,
            vehicle=self.vehicle,
            created_by=self.user,
        )

        response = self.client.post(
            f"/api/routes/{route.id}/stops/",
            {
                "shipment": self.shipment.id,
                "stop_order": 1,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["shipment"], self.shipment.id)
        self.assertEqual(response.data["stop_order"], 1)

        self.assertTrue(
            RouteStop.objects.filter(
                route=route,
                shipment=self.shipment,
            ).exists()
        )

    def test_duplicate_shipment_on_route_is_rejected(self):
        route = DeliveryRoute.objects.create(
            name="Pune to Mumbai Delivery",
            route_date=date.today() + timedelta(days=1),
            driver=self.driver,
            vehicle=self.vehicle,
            created_by=self.user,
        )

        RouteStop.objects.create(
            route=route,
            shipment=self.shipment,
            stop_order=1,
        )

        response = self.client.post(
            f"/api/routes/{route.id}/stops/",
            {
                "shipment": self.shipment.id,
                "stop_order": 2,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.data)

    def test_route_progress_can_be_updated(self):
        route = DeliveryRoute.objects.create(
            name="Pune to Mumbai Delivery",
            route_date=date.today() + timedelta(days=1),
            driver=self.driver,
            vehicle=self.vehicle,
            created_by=self.user,
        )

        response = self.client.patch(
            f"/api/routes/{route.id}/progress/",
            {"status": "IN_PROGRESS"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "IN_PROGRESS")

        route.refresh_from_db()
        self.assertEqual(route.status, "IN_PROGRESS")

    def test_unauthenticated_user_cannot_list_routes(self):
        self.client.force_authenticate(user=None)

        response = self.client.get("/api/routes/")

        self.assertEqual(response.status_code, 401)

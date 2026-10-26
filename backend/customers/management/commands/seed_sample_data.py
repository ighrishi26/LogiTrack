
from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from accounts.models import User
from customers.models import Customer
from fleet.models import Driver, Vehicle
from shipments.models import Shipment, TrackingHistory


class Command(BaseCommand):
    help = "Add clearly labelled sample records without deleting existing data."

    @transaction.atomic
    def handle(self, *args, **options):
        user = User.objects.order_by("id").first()

        if user is None:
            raise CommandError(
                "No user exists. Create an authorized user before seeding."
            )

        today = date.today()

        for i in range(1, 21):
            suffix = f"{i:02d}"

            Customer.objects.get_or_create(
                name=f"Sample Customer {suffix}",
                defaults={
                    "customer_type": "BUSINESS",
                    "company": f"Sample Company {suffix}",
                    "email": f"customer{suffix}@example.com",
                    "phone": f"TEST-CUSTOMER-{suffix}",
                    "address": f"Sample Address {suffix}",
                    "city": "Pune",
                    "state": "Maharashtra",
                    "postal_code": "",
                    "notes": "Fictional test record; not a real customer.",
                },
            )

            Driver.objects.get_or_create(
                phone=f"TEST-DRIVER-{suffix}",
                defaults={
                    "name": f"Sample Driver {suffix}",
                    "email": f"driver{suffix}@example.com",
                    "license_number": f"TEST-LICENSE-{suffix}",
                    "license_expiry": today + timedelta(days=365),
                    "address": "Sample test address, Pune",
                    "availability": "AVAILABLE",
                    "notes": "Fictional test driver; not a real person.",
                },
            )

        drivers = list(Driver.objects.order_by("id"))

        for i in range(1, 21):
            suffix = f"{i:02d}"
            driver = drivers[(i - 1) % len(drivers)]

            Vehicle.objects.get_or_create(
                registration_number=f"TEST-VEHICLE-{suffix}",
                defaults={
                    "vehicle_type": (
                        "VAN" if i % 2 else "MINI_TRUCK"
                    ),
                    "make_model": f"Sample Vehicle Model {suffix}",
                    "capacity_kg": Decimal("1000.00"),
                    "status": "AVAILABLE",
                    "assigned_driver": driver,
                    "notes": "Fictional test vehicle; not a real registration.",
                },
            )

        statuses = [
            "PENDING",
            "CONFIRMED",
            "PICKED_UP",
            "IN_TRANSIT",
            "OUT_FOR_DELIVERY",
            "DELIVERED",
            "CANCELLED",
        ]

        for i in range(1, 21):
            suffix = f"{i:02d}"
            status = statuses[(i - 1) % len(statuses)]

            shipment, _ = Shipment.objects.get_or_create(
                sender_name=f"Sample Sender {suffix}",
                receiver_name=f"Sample Receiver {suffix}",
                origin=f"Pune Test Hub {suffix}",
                destination=f"Mumbai Test Hub {suffix}",
                defaults={
                    "sender_phone": f"TEST-SENDER-{suffix}",
                    "sender_address": f"Sample Sender Address {suffix}",
                    "receiver_phone": f"TEST-RECEIVER-{suffix}",
                    "receiver_address": f"Sample Receiver Address {suffix}",
                    "package_description": (
                        f"Fictional test parcel {suffix}"
                    ),
                    "weight_kg": Decimal("5.00"),
                    "shipping_cost": Decimal("250.00"),
                    "status": status,
                    "estimated_delivery": today + timedelta(days=i),
                    "actual_delivery": (
                        today if status == "DELIVERED" else None
                    ),
                    "created_by": user,
                },
            )

            TrackingHistory.objects.get_or_create(
                shipment=shipment,
                notes=f"Sample tracking event for shipment {suffix}",
                defaults={
                    "status": shipment.status,
                    "location": f"Sample Tracking Hub {suffix}",
                    "updated_by": user,
                },
            )

        self.stdout.write(self.style.SUCCESS(
            "Sample-data seeding completed."
        ))
        self.stdout.write(
            f"Customers: {Customer.objects.count()}"
        )
        self.stdout.write(
            f"Drivers: {Driver.objects.count()}"
        )
        self.stdout.write(
            f"Vehicles: {Vehicle.objects.count()}"
        )
        self.stdout.write(
            f"Shipments: {Shipment.objects.count()}"
        )
        self.stdout.write(
            f"Tracking histories: {TrackingHistory.objects.count()}"
        )

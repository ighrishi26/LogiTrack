
from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Driver, Vehicle
from .serializers import DriverSerializer, VehicleSerializer


class DriverViewSet(viewsets.ModelViewSet):
    queryset = Driver.objects.all()
    serializer_class = DriverSerializer
    permission_classes = [IsAuthenticated]

    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    search_fields = ["name", "phone", "email", "license_number"]
    ordering_fields = ["name", "created_at", "availability"]
    ordering = ["name"]


class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.select_related("assigned_driver").all()
    serializer_class = VehicleSerializer
    permission_classes = [IsAuthenticated]

    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    search_fields = [
        "registration_number",
        "make_model",
        "assigned_driver__name",
    ]
    ordering_fields = [
        "registration_number",
        "vehicle_type",
        "status",
        "created_at",
    ]
    ordering = ["registration_number"]

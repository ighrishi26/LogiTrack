from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Warehouse
from .serializers import WarehouseSerializer


class WarehouseViewSet(viewsets.ModelViewSet):
    queryset = Warehouse.objects.all()
    serializer_class = WarehouseSerializer
    permission_classes = [IsAuthenticated]

    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    search_fields = [
        "name",
        "facility_code",
        "operator",
        "city",
        "district",
        "postal_code",
    ]

    ordering_fields = ["name", "city", "district", "created_at"]
    ordering = ["name"]
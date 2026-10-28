from django.db import transaction
from django.shortcuts import get_object_or_404

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import DeliveryRoute, RouteStop
from .serializers import DeliveryRouteSerializer, RouteStopSerializer


class DeliveryRouteViewSet(viewsets.ModelViewSet):
    serializer_class = DeliveryRouteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            DeliveryRoute.objects.select_related("driver", "vehicle", "created_by")
            .prefetch_related("stops__shipment")
            .all()
        )

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["get", "post"], url_path="stops")
    def stops(self, request, pk=None):
        route = self.get_object()

        if request.method == "GET":
            serializer = RouteStopSerializer(
                route.stops.select_related("shipment").all(),
                many=True,
            )
            return Response(serializer.data)

        serializer = RouteStopSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        shipment = serializer.validated_data["shipment"]
        stop_order = serializer.validated_data["stop_order"]

        if route.stops.filter(shipment=shipment).exists():
            return Response(
                {"detail": "This shipment is already on the route."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if route.stops.filter(stop_order=stop_order).exists():
            return Response(
                {"detail": "This stop order is already in use on this route."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer.save(route=route)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch"], url_path="progress")
    def progress(self, request, pk=None):
        route = self.get_object()
        new_status = request.data.get("status")

        valid_statuses = DeliveryRoute.Status.values

        if new_status not in valid_statuses:
            return Response(
                {"detail": "Invalid route status."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        route.status = new_status
        route.save(update_fields=["status", "updated_at"])

        return Response(self.get_serializer(route).data)

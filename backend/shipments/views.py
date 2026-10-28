
from django.db.models import Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from alerts.services import (
    notify_delivery_exception,
    notify_shipment_status_changed,
)

from .models import (
    DeliveryException,
    Shipment,
    TrackingHistory,
)
from .serializers import (
    DeliveryExceptionSerializer,
    PublicShipmentTrackingSerializer,
    ShipmentSerializer,
)


class ShipmentViewSet(viewsets.ModelViewSet):
    serializer_class = ShipmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    queryset = Shipment.objects.select_related("created_by").all()

    filterset_fields = ["status", "origin", "destination"]

    search_fields = [
        "tracking_number",
        "sender_name",
        "receiver_name",
        "origin",
        "destination",
    ]

    ordering_fields = [
        "created_at",
        "estimated_delivery",
        "weight_kg",
    ]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if getattr(user, "role", None) == "CUSTOMER":
            queryset = queryset.filter(created_by=user)

        for parameter in (
            "created_at__date__gte",
            "created_at__date__lte",
        ):
            date_value = self.request.query_params.get(parameter)

            if date_value:
                parsed_date = parse_date(date_value)

                if parsed_date is None:
                    raise ValidationError({
                        parameter: ["Enter a valid date."]
                    })

                queryset = queryset.filter(
                    **{parameter: parsed_date}
                )

        return queryset

    def perform_create(self, serializer):
        user = self.request.user

        if getattr(user, "role", None) in ["DRIVER", "CUSTOMER"]:
            raise PermissionDenied(
                "Your role cannot create shipments."
            )

        shipment = serializer.save(created_by=user)

        TrackingHistory.objects.create(
            shipment=shipment,
            status=shipment.status,
            location=self.request.data.get(
                "tracking_location", ""
            ),
            notes=self.request.data.get(
                "tracking_notes", "Shipment created"
            ),
            updated_by=user,
        )

    def perform_update(self, serializer):
        user = self.request.user

        if getattr(user, "role", None) in ["DRIVER", "CUSTOMER"]:
            raise PermissionDenied(
                "Your role cannot update shipments."
            )

        previous_status = serializer.instance.status
        shipment = serializer.save()

        if previous_status != shipment.status:
            TrackingHistory.objects.create(
                shipment=shipment,
                status=shipment.status,
                location=self.request.data.get(
                    "tracking_location", ""
                ),
                notes=self.request.data.get(
                    "tracking_notes",
                    f"Status changed from {previous_status} "
                    f"to {shipment.status}",
                ),
                updated_by=user,
            )

            notify_shipment_status_changed(shipment)

    def destroy(self, request, *args, **kwargs):
        if getattr(request.user, "role", None) in [
            "DRIVER",
            "CUSTOMER",
        ]:
            raise PermissionDenied(
                "You do not have permission to delete shipments."
            )

        return super().destroy(request, *args, **kwargs)


class PublicShipmentTrackingView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, tracking_number):
        shipment = get_object_or_404(
            Shipment.objects.prefetch_related("tracking_history"),
            tracking_number=tracking_number.upper(),
        )

        serializer = PublicShipmentTrackingSerializer(shipment)

        return Response({
            "success": True,
            "shipment": serializer.data,
        })


class ShipmentStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        shipments = Shipment.objects.all()

        if getattr(request.user, "role", None) == "CUSTOMER":
            shipments = shipments.filter(
                created_by=request.user
            )

        status_counts = {
            item["status"]: item["total"]
            for item in shipments.values("status").annotate(
                total=Count("id")
            )
        }

        data = {
            "total": shipments.count(),
            "pending": status_counts.get("PENDING", 0),
            "confirmed": status_counts.get("CONFIRMED", 0),
            "picked_up": status_counts.get("PICKED_UP", 0),
            "in_transit": status_counts.get("IN_TRANSIT", 0),
            "delivered": status_counts.get("DELIVERED", 0),
            "out_for_delivery": status_counts.get(
                "OUT_FOR_DELIVERY", 0
            ),
            "cancelled": status_counts.get("CANCELLED", 0),
            "status_counts": status_counts,
        }

        return Response(data)


class DeliveryExceptionViewSet(viewsets.ModelViewSet):
    serializer_class = DeliveryExceptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    queryset = DeliveryException.objects.select_related(
        "shipment",
        "reported_by",
        "resolved_by",
    ).all()

    filterset_fields = ["status", "severity", "exception_type"]
    search_fields = [
        "shipment__tracking_number",
        "description",
        "resolution_notes",
    ]
    ordering_fields = ["created_at", "updated_at", "severity"]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        role = getattr(user, "role", None)

        if role == "CUSTOMER":
            queryset = queryset.filter(
                shipment__created_by=user
            )
        elif role == "DRIVER":
            queryset = queryset.none()

        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        role = getattr(user, "role", None)

        if role == "DRIVER":
            raise PermissionDenied(
                "Drivers cannot create delivery exceptions "
                "through this endpoint."
            )

        shipment = serializer.validated_data["shipment"]

        if (
            role == "CUSTOMER"
            and shipment.created_by_id != user.id
        ):
            raise PermissionDenied(
                "You can only report an issue for a shipment "
                "you created."
            )

        delivery_exception = serializer.save(reported_by=user)
        notify_delivery_exception(delivery_exception)

    def perform_update(self, serializer):
        user = self.request.user
        role = getattr(user, "role", None)

        if role in ["DRIVER", "CUSTOMER"]:
            raise PermissionDenied(
                "Your role cannot update delivery exceptions."
            )

        new_status = serializer.validated_data.get(
            "status",
            serializer.instance.status,
        )

        if new_status == DeliveryException.Status.RESOLVED:
            serializer.save(
                resolved_by=user,
                resolved_at=timezone.now(),
            )
        else:
            serializer.save(
                resolved_by=None,
                resolved_at=None,
            )

    def destroy(self, request, *args, **kwargs):
        if getattr(request.user, "role", None) in [
            "DRIVER",
            "CUSTOMER",
        ]:
            raise PermissionDenied(
                "Your role cannot delete delivery exceptions."
            )

        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        exception = self.get_object()

        if getattr(request.user, "role", None) in [
            "DRIVER",
            "CUSTOMER",
        ]:
            raise PermissionDenied(
                "Your role cannot resolve delivery exceptions."
            )

        notes = request.data.get("resolution_notes", "")

        if not isinstance(notes, str) or not notes.strip():
            raise ValidationError({
                "resolution_notes": [
                    "Resolution notes are required."
                ]
            })

        exception.status = DeliveryException.Status.RESOLVED
        exception.resolution_notes = notes.strip()
        exception.resolved_by = request.user
        exception.resolved_at = timezone.now()
        exception.save()

        return Response(
            self.get_serializer(exception).data,
            status=status.HTTP_200_OK,
        )

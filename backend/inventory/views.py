
from django.db import transaction
from django.db.models import F
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import InventoryItem, InventoryMovement
from .serializers import (
    InventoryItemSerializer,
    InventoryMovementSerializer,
)


class InventoryStaffPermission(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and (
            request.user.is_staff
            or request.user.is_superuser
            or getattr(request.user, "role", "") in ("admin", "manager")
        )


class InventoryItemViewSet(viewsets.ModelViewSet):
    serializer_class = InventoryItemSerializer
    permission_classes = [InventoryStaffPermission]
    queryset = InventoryItem.objects.select_related("warehouse").all()
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        queryset = super().get_queryset()

        warehouse_id = self.request.query_params.get("warehouse")
        search = self.request.query_params.get("search")

        if warehouse_id:
            queryset = queryset.filter(warehouse_id=warehouse_id)

        if search:
            from django.db.models import Q

            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(sku__icontains=search)
            )

        return queryset

    @action(detail=False, methods=["get"], url_path="low-stock")
    def low_stock(self, request):
        queryset = self.filter_queryset(
            self.get_queryset().filter(
                quantity__lte=F("reorder_level")
            )
        )

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class InventoryMovementViewSet(viewsets.GenericViewSet):
    serializer_class = InventoryMovementSerializer
    permission_classes = [InventoryStaffPermission]
    queryset = InventoryMovement.objects.select_related(
        "item", "item__warehouse", "performed_by"
    ).all()

    def list(self, request):
        queryset = self.filter_queryset(self.get_queryset())

        item_id = request.query_params.get("item")
        if item_id:
            queryset = queryset.filter(item_id=item_id)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        item_id = serializer.validated_data["item"].pk
        movement_type = serializer.validated_data["movement_type"]
        quantity = serializer.validated_data["quantity"]
        notes = serializer.validated_data.get("notes", "")

        with transaction.atomic():
            item = InventoryItem.objects.select_for_update().get(
                pk=item_id
            )

            previous_quantity = item.quantity

            if movement_type == InventoryMovement.MovementType.STOCK_IN:
                new_quantity = previous_quantity + quantity

            elif movement_type == InventoryMovement.MovementType.STOCK_OUT:
                if quantity > previous_quantity:
                    raise ValidationError({
                        "quantity": "Insufficient stock available."
                    })

                new_quantity = previous_quantity - quantity

            elif movement_type == InventoryMovement.MovementType.ADJUSTMENT:
                raise ValidationError({
                    "movement_type": (
                        "Use STOCK_IN or STOCK_OUT to record "
                        "a quantity correction."
                    )
                })

            else:
                raise ValidationError({
                    "movement_type": "Invalid movement type."
                })

            item.quantity = new_quantity
            item.save(update_fields=["quantity", "updated_at"])

            movement = InventoryMovement.objects.create(
                item=item,
                movement_type=movement_type,
                quantity=quantity,
                previous_quantity=previous_quantity,
                new_quantity=new_quantity,
                notes=notes,
                performed_by=request.user,
            )

        response_serializer = self.get_serializer(movement)

        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED,
        )


from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import InventoryItemViewSet, InventoryMovementViewSet


router = DefaultRouter()

router.register(
    r"items",
    InventoryItemViewSet,
    basename="inventory-items",
)

router.register(
    r"movements",
    InventoryMovementViewSet,
    basename="inventory-movements",
)

urlpatterns = [
    path("", include(router.urls)),
]

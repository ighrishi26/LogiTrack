
from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    ShipmentViewSet,
    PublicShipmentTrackingView,
    ShipmentStatsView,
    DeliveryExceptionViewSet,
)

router = DefaultRouter()
router.register("shipments", ShipmentViewSet, basename="shipment")
router.register(
    "delivery-exceptions",
    DeliveryExceptionViewSet,
    basename="delivery-exception",
)

urlpatterns = [
    path(
        "track/<str:tracking_number>/",
        PublicShipmentTrackingView.as_view(),
        name="public-shipment-tracking",
    ),
    path("shipments/stats/", ShipmentStatsView.as_view(), name="shipment-stats"),
] + router.urls

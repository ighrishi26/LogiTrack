
from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    DeliveryExceptionViewSet,
    ProofOfDeliveryViewSet,
    PublicShipmentTrackingView,
    ShipmentStatsView,
    ShipmentViewSet,
)

router = DefaultRouter()
router.register("shipments", ShipmentViewSet, basename="shipment")
router.register(
    "delivery-exceptions",
    DeliveryExceptionViewSet,
    basename="delivery-exception",
)
router.register(
    "proof-of-delivery",
    ProofOfDeliveryViewSet,
    basename="proof-of-delivery",
)

urlpatterns = [
    path(
        "track/<str:tracking_number>/",
        PublicShipmentTrackingView.as_view(),
        name="public-shipment-tracking",
    ),
    path("shipments/stats/", ShipmentStatsView.as_view(), name="shipment-stats"),
] + router.urls

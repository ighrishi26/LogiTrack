
from rest_framework.routers import DefaultRouter

from .views import DriverViewSet, VehicleViewSet

router = DefaultRouter()
router.register("drivers", DriverViewSet, basename="driver")
router.register("vehicles", VehicleViewSet, basename="vehicle")

urlpatterns = router.urls

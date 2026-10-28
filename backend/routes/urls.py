from rest_framework.routers import DefaultRouter

from .views import DeliveryRouteViewSet

router = DefaultRouter()
router.register("routes", DeliveryRouteViewSet, basename="route")

urlpatterns = router.urls

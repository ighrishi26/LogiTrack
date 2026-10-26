from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(["GET"])
def api_status(request):
    return Response({
        "success": True,
        "project": "LogiTrack",
        "message": "Logistics Management API is running",
    })
    

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def current_user(request):
    user = request.user

    return Response({
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "phone": user.phone,
    })

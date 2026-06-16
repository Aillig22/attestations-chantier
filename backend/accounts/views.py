from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import RoleTokenObtainPairSerializer, UserSerializer


class LoginView(TokenObtainPairView):
    serializer_class = RoleTokenObtainPairSerializer
    # Limite les tentatives de connexion (anti brute force / credential stuffing).
    throttle_scope = "login"


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

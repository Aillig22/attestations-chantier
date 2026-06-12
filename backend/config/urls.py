from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.views import LoginView, MeView
from demandes.views import DemandeViewSet, NotificationViewSet, ReportingView

router = DefaultRouter()
router.register("demandes", DemandeViewSet, basename="demande")
router.register("notifications", NotificationViewSet, basename="notification")
router.register("reporting", ReportingView, basename="reporting")

urlpatterns = [
    path("admin/", admin.site.urls),
    # Auth
    path("api/auth/login/", LoginView.as_view(), name="login"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/me/", MeView.as_view(), name="me"),
    # API
    path("api/", include(router.urls)),
    # Documentation OpenAPI
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

from rest_framework import permissions


class IsDistributeur(permissions.BasePermission):
    message = "Réservé aux distributeurs."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_distributeur)


class IsSiege(permissions.BasePermission):
    message = "Réservé au siège."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_siege)


class IsOwnerOrSiege(permissions.BasePermission):
    """Le distributeur n'accède qu'à ses propres demandes ; le siège accède à tout."""

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_siege:
            return True
        # obj peut être une Demande ou un objet rattaché (.demande)
        demande = obj if hasattr(obj, "created_by") else getattr(obj, "demande", None)
        return demande is not None and demande.created_by_id == user.id

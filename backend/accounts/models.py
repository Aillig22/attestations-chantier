from django.contrib.auth.models import AbstractUser
from django.db import models


class Role(models.TextChoices):
    DISTRIBUTEUR = "DISTRIBUTEUR", "Distributeur (Agent/Courtier)"
    SIEGE = "SIEGE", "Siège"


class User(AbstractUser):
    """Utilisateur de la plateforme, porteur d'un rôle métier."""

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.DISTRIBUTEUR,
    )

    @property
    def is_distributeur(self) -> bool:
        return self.role == Role.DISTRIBUTEUR

    @property
    def is_siege(self) -> bool:
        return self.role == Role.SIEGE

    def __str__(self) -> str:
        return f"{self.get_full_name() or self.username} ({self.role})"

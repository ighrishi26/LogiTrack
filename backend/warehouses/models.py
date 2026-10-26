from django.db import models


class Warehouse(models.Model):
    facility_code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=200)
    operator = models.CharField(max_length=200)
    city = models.CharField(max_length=100, blank=True)
    address = models.TextField(blank=True)
    district = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, default="Maharashtra")
    postal_code = models.CharField(max_length=20, blank=True)
    capacity_mt = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    public_phone = models.CharField(max_length=30, blank=True)
    public_email = models.EmailField(blank=True)
    source_url = models.URLField(max_length=500)
    is_logitrack_operated = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["district", "name"]

    def __str__(self):
        return f"{self.name} ({self.facility_code})"
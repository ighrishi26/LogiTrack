
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("LogiTrack Information", {"fields": ("role", "phone")}),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        ("LogiTrack Information", {"fields": ("role", "phone")}),
    )

    list_display = (
        "username",
        "email",
        "role",
        "phone",
        "is_staff",
        "is_active",
    )

    list_filter = ("role", "is_staff", "is_active")

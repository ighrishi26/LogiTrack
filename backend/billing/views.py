
from decimal import Decimal

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .models import Invoice, InvoicePayment
from .serializers import InvoiceSerializer, InvoicePaymentSerializer


class InvoiceViewSet(viewsets.ModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Invoice.objects.select_related(
            "shipment", "customer", "created_by"
        ).prefetch_related("lines", "payments")

        params = self.request.query_params

        search = params.get("search")
        if search:
            queryset = queryset.filter(
                Q(invoice_number__icontains=search)
                | Q(shipment__tracking_number__icontains=search)
                | Q(customer__name__icontains=search)
            )

        invoice_status = params.get("status")
        if invoice_status:
            queryset = queryset.filter(status=invoice_status)

        return queryset.order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        invoices = self.get_queryset()
        today = timezone.localdate()

        return Response({
            "total_invoices": invoices.count(),
            "draft": invoices.filter(
                status=Invoice.Status.DRAFT
            ).count(),
            "issued": invoices.filter(
                status=Invoice.Status.ISSUED
            ).count(),
            "partially_paid": invoices.filter(
                status=Invoice.Status.PARTIALLY_PAID
            ).count(),
            "paid": invoices.filter(
                status=Invoice.Status.PAID
            ).count(),
            "overdue": invoices.filter(
                due_date__lt=today
            ).exclude(
                status__in=[
                    Invoice.Status.PAID,
                    Invoice.Status.CANCELLED,
                    Invoice.Status.DRAFT,
                ]
            ).count(),
        })

    @action(
        detail=True,
        methods=["get", "post"],
        url_path="payments",
    )
    def payments(self, request, pk=None):
        if request.method == "GET":
            invoice = self.get_object()
            payments = invoice.payments.all()
            serializer = InvoicePaymentSerializer(
                payments,
                many=True,
            )
            return Response(serializer.data)

        with transaction.atomic():
            invoice = Invoice.objects.select_for_update().get(
                pk=self.get_object().pk
            )

            if invoice.status in [
                Invoice.Status.DRAFT,
                Invoice.Status.CANCELLED,
                Invoice.Status.PAID,
            ]:
                raise ValidationError({
                    "invoice": (
                        "Payments can only be recorded for issued, "
                        "partially paid, or overdue invoices."
                    )
                })

            serializer = InvoicePaymentSerializer(
                data=request.data
            )
            serializer.is_valid(raise_exception=True)

            amount = serializer.validated_data["amount"]
            balance = invoice.total_amount - invoice.amount_paid

            if balance <= Decimal("0.00"):
                raise ValidationError({
                    "amount": "This invoice has no outstanding balance."
                })

            if amount > balance:
                raise ValidationError({
                    "amount": (
                        f"Payment exceeds the outstanding balance "
                        f"of {balance:.2f}."
                    )
                })

            payment = serializer.save(
                invoice=invoice,
                received_by=request.user,
            )

            invoice.amount_paid += payment.amount

            if invoice.amount_paid >= invoice.total_amount:
                invoice.amount_paid = invoice.total_amount
                invoice.status = Invoice.Status.PAID
            else:
                invoice.status = Invoice.Status.PARTIALLY_PAID

            invoice.save(
                update_fields=[
                    "amount_paid",
                    "status",
                    "updated_at",
                ]
            )

        return Response(
            {
                "message": "Payment recorded successfully.",
                "payment": InvoicePaymentSerializer(payment).data,
                "invoice": InvoiceSerializer(invoice).data,
            },
            status=status.HTTP_201_CREATED,
        )

from decimal import Decimal

from rest_framework import serializers
from .models import Invoice, InvoiceLine, InvoicePayment


class InvoiceLineSerializer(serializers.ModelSerializer):
    line_total = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = InvoiceLine
        fields = [
            "id",
            "description",
            "quantity",
            "unit_price",
            "line_total",
        ]
        read_only_fields = ["id", "line_total"]

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than zero.")
        return value

    def validate_unit_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Unit price cannot be negative.")
        return value


class InvoiceSerializer(serializers.ModelSerializer):
    lines = InvoiceLineSerializer(many=True, required=False)
    shipment_tracking_number = serializers.CharField(
        source="shipment.tracking_number",
        read_only=True,
    )
    customer_name = serializers.CharField(
        source="customer.name",
        read_only=True,
        allow_null=True,
    )
    subtotal = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )
    total_amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )
    balance_due = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )
    
    amount_paid = serializers.DecimalField(
    max_digits=12,
    decimal_places=2,
    read_only=True,
)

    class Meta:
        model = Invoice
        fields = [
            "id",
            "invoice_number",
            "shipment",
            "shipment_tracking_number",
            "customer",
            "customer_name",
            "issue_date",
            "due_date",
            "status",
            "shipping_fee",
            "tax_amount",
            "discount",
            "amount_paid",
            "notes",
            "lines",
            "subtotal",
            "total_amount",
            "balance_due",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "invoice_number",
            "created_by",
            "created_at",
            "updated_at",
            "subtotal",
            "total_amount",
            "balance_due",
        ]

    
    def validate(self, attrs):
        from decimal import Decimal
        from django.utils import timezone

        instance = self.instance

        issue_date = attrs.get(
            "issue_date",
            instance.issue_date if instance else timezone.localdate(),
        )
        due_date = attrs.get(
            "due_date",
            instance.due_date if instance else None,
        )

        if due_date and due_date < issue_date:
            raise serializers.ValidationError({
                "due_date": "Due date cannot be earlier than the issue date."
            })

        shipping_fee = attrs.get(
            "shipping_fee",
            instance.shipping_fee if instance else Decimal("0.00"),
        )
        tax_amount = attrs.get(
            "tax_amount",
            instance.tax_amount if instance else Decimal("0.00"),
        )
        discount = attrs.get(
            "discount",
            instance.discount if instance else Decimal("0.00"),
        )
        amount_paid = attrs.get(
            "amount_paid",
            instance.amount_paid if instance else Decimal("0.00"),
        )

        for field, value in [
            ("shipping_fee", shipping_fee),
            ("tax_amount", tax_amount),
            ("discount", discount),
            ("amount_paid", amount_paid),
        ]:
            if value < 0:
                raise serializers.ValidationError({
                    field: "This amount cannot be negative."
                })

        lines_data = attrs.get("lines")
        if lines_data is not None:
            subtotal = sum(
                (
                    line.get("quantity", Decimal("1.00"))
                    * line.get("unit_price", Decimal("0.00"))
                    for line in lines_data
                ),
                Decimal("0.00"),
            )
        elif instance:
            subtotal = instance.subtotal
        else:
            subtotal = Decimal("0.00")

        total = subtotal + shipping_fee + tax_amount - discount

        if total < 0:
            raise serializers.ValidationError({
                "discount": "Discount cannot exceed the subtotal plus fees and tax."
            })

        if amount_paid > total:
            raise serializers.ValidationError({
                "amount_paid": "Amount paid cannot exceed the invoice total."
            })

        status = attrs.get(
            "status",
            instance.status if instance else Invoice.Status.DRAFT,
        )

        if status == Invoice.Status.PAID and amount_paid != total:
            raise serializers.ValidationError({
                "status": "An invoice can be marked Paid only when the full amount is paid."
            })

        if status == Invoice.Status.PARTIALLY_PAID and not (
            Decimal("0.00") < amount_paid < total
        ):
            raise serializers.ValidationError({
                "status": "Partially Paid requires a payment greater than zero and less than the invoice total."
            })

        return attrs


    def create(self, validated_data):
        lines_data = validated_data.pop("lines", [])
        invoice = Invoice.objects.create(**validated_data)

        for line_data in lines_data:
            InvoiceLine.objects.create(invoice=invoice, **line_data)

        return invoice

    def update(self, instance, validated_data):
        lines_data = validated_data.pop("lines", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if lines_data is not None:
            instance.lines.all().delete()
            for line_data in lines_data:
                InvoiceLine.objects.create(invoice=instance, **line_data)

        return instance


class InvoicePaymentSerializer(serializers.ModelSerializer):
    received_by_username = serializers.CharField(
        source="received_by.username",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = InvoicePayment
        fields = [
            "id",
            "invoice",
            "amount",
            "payment_date",
            "payment_method",
            "reference_number",
            "notes",
            "received_by",
            "received_by_username",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "invoice",
            "received_by",
            "received_by_username",
            "created_at",
        ]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Payment amount must be greater than zero."
            )
        return value

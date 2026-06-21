from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response, FileResponse
from sqlalchemy.orm import Session
from datetime import datetime
import io
import base64
import qrcode
import os

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table as RLTable, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

from app.database import get_db
from app.models import Order, Payment, PaymentMethod, Table, User, Session as POSSession, Coupon, Product
from app.schemas import PaymentCreate, OrderResponse, PaymentMethodResponse
from app.auth import get_current_user
from app.websocket import broadcast_sync

router = APIRouter(prefix="/payments", tags=["Payments"])

def generate_upi_qr(amount: float, order_number: str) -> str:
    """
    Generates a UPI payment QR code as a base64 encoded PNG data URI.
    """
    upi_uri = f"upi://pay?pa=odoocafe@bank&pn=Odoo%20Cafe%20POS&am={amount:.2f}&cu=INR&tn=Order%20{order_number}"
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(upi_uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"

@router.get("/methods", response_model=list[PaymentMethodResponse])
def get_payment_methods(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(PaymentMethod).filter(PaymentMethod.is_active == True, PaymentMethod.is_deleted == False).all()

@router.get("/upi-qr/{order_id}", response_model=dict)
def get_upi_qr_code(order_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == order_id, Order.is_deleted == False).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    
    qr_code_base64 = generate_upi_qr(order.net_amount, order.order_number)
    return {"qr_code": qr_code_base64, "upi_uri": f"upi://pay?pa=odoocafe@bank&pn=Odoo%20Cafe%20POS&am={order.net_amount:.2f}"}

@router.post("/order/{order_id}", response_model=OrderResponse)
def process_order_payment(
    order_id: int,
    payment_in: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(Order).filter(Order.id == order_id, Order.is_deleted == False).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        
    if order.status == "paid":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order has already been paid")
        
    # Verify payment method
    pay_method = db.query(PaymentMethod).filter(PaymentMethod.id == payment_in.payment_method_id).first()
    if not pay_method:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment method not found")
        
    # Verify cashier has active session
    session = db.query(POSSession).filter(
        POSSession.user_id == current_user.id,
        POSSession.status == "active"
    ).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You must open a session before taking payment")

    # Change calculation
    change_amount = 0.0
    if pay_method.type == "cash":
        if payment_in.amount < order.net_amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient amount. Net total is {order.net_amount}, but received {payment_in.amount}"
            )
        change_amount = payment_in.amount - order.net_amount
        
    db_payment = Payment(
        order_id=order_id,
        amount=payment_in.amount,
        payment_method_id=payment_in.payment_method_id,
        transaction_ref=payment_in.transaction_ref,
        change_amount=change_amount,
        created_at=datetime.utcnow()
    )
    db.add(db_payment)
    
    # Mark order paid & update status
    order.status = "paid"
    order.paid_at = datetime.utcnow()
    order.updated_at = datetime.utcnow()
    
    # Deduct inventory stock for each order item
    for item in order.order_items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product:
            product.stock = max(0, product.stock - item.quantity)
            
    # Increment coupon usage count if coupon applied
    if order.coupon_id:
        coupon = db.query(Coupon).filter(Coupon.id == order.coupon_id).first()
        if coupon:
            coupon.usage_count += 1
            
    # Free up table status
    table_id = order.table_id
    if table_id:
        table = db.query(Table).filter(Table.id == table_id).first()
        if table:
            table.status = "available"
            
    db.commit()
    db.refresh(order)
    
    broadcast_sync({"event": "order_updated", "table_id": table_id})
    broadcast_sync({"event": "dashboard_updated"})
    return order

@router.get("/receipt/{order_id}/pdf")
def get_receipt_pdf(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id, Order.is_deleted == False).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    # Generate PDF in memory
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=(300, 600), rightMargin=10, leftMargin=10, topMargin=10, bottomMargin=10)
    story = []
    
    styles = getSampleStyleSheet()
    
    # Custom tight styles
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=18,
        alignment=1, # Center
        spaceAfter=5
    )
    
    normal_center = ParagraphStyle(
        'NormalCenter',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=11,
        alignment=1,
        spaceAfter=3
    )
    
    bold_left = ParagraphStyle(
        'BoldLeft',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11
    )
    
    normal_left = ParagraphStyle(
        'NormalLeft',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=11
    )
    
    normal_right = ParagraphStyle(
        'NormalRight',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=11,
        alignment=2 # Right
    )

    story.append(Paragraph("<b>ODOO CAFE POS</b>", title_style))
    story.append(Paragraph("123 Tech Park, Silicon Valley", normal_center))
    story.append(Paragraph("Tel: +1-555-0199", normal_center))
    story.append(Spacer(1, 10))
    
    # Order details
    story.append(Paragraph(f"<b>Order:</b> {order.order_number}", normal_left))
    story.append(Paragraph(f"<b>Date:</b> {order.created_at.strftime('%Y-%m-%d %H:%M:%S')}", normal_left))
    if order.table:
        story.append(Paragraph(f"<b>Table:</b> {order.table.table_number} ({order.table.floor.name})", normal_left))
    if order.customer:
        story.append(Paragraph(f"<b>Customer:</b> {order.customer.name}", normal_left))
    story.append(Paragraph(f"<b>Cashier:</b> {order.user.name}", normal_left))
    story.append(Spacer(1, 10))
    
    # Items Table
    data = [["Item", "Qty", "Price", "Total"]]
    for item in order.order_items:
        data.append([
            item.product.name[:15] + ('..' if len(item.product.name) > 15 else ''),
            str(item.quantity),
            f"{item.price:.2f}",
            f"{(item.price * item.quantity):.2f}"
        ])
        
    table = RLTable(data, colWidths=[120, 30, 65, 65])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 4),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('LINEBELOW', (0, 0), (-1, 0), 0.5, colors.black),
        ('LINEBELOW', (0, -1), (-1, -1), 0.5, colors.black),
    ]))
    story.append(table)
    story.append(Spacer(1, 10))
    
    # Financial breakdown
    financials = [
        ["Subtotal:", f"{order.total_amount:.2f}"],
        ["Discount:", f"-{order.discount_amount:.2f}"],
        ["Tax (5%):", f"{order.tax_amount:.2f}"],
        ["Net Total:", f"{order.net_amount:.2f}"]
    ]
    
    # Add payments info
    for pay in order.payments:
        financials.append([f"Paid ({pay.payment_method.name}):", f"{pay.amount:.2f}"])
        if pay.change_amount > 0:
            financials.append(["Change:", f"{pay.change_amount:.2f}"])
            
    fin_table = RLTable(financials, colWidths=[180, 100])
    fin_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('FONTNAME', (0, 3), (1, 3), 'Helvetica-Bold'), # Net Total bold
    ]))
    story.append(fin_table)
    story.append(Spacer(1, 15))
    
    story.append(Paragraph("<b>Thank you for dining with us!</b>", normal_center))
    story.append(Paragraph("Please visit again.", normal_center))
    
    doc.build(story)
    
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=receipt_{order.order_number}.pdf"}
    )

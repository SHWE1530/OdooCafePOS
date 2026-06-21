from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import random

from app.database import SessionLocal, Base, engine
from app.models import User, Category, Product, Floor, Table, Customer, PaymentMethod, Coupon, Promotion, Order, OrderItem, Payment, KitchenOrder, Session as POSSession, Feedback
from app.auth import get_password_hash

def seed_db():
    db = SessionLocal()
    
    # 1. Create Users
    print("Seeding users...")
    admin = User(
        name="System Admin",
        email="admin@cafe.com",
        password_hash=get_password_hash("admin123"),
        role="admin",
        is_active=True
    )
    cashier = User(
        name="John Cashier",
        email="cashier@cafe.com",
        password_hash=get_password_hash("cashier123"),
        role="employee",
        is_active=True
    )
    kitchen = User(
        name="Chef Ramsay",
        email="kitchen@cafe.com",
        password_hash=get_password_hash("kitchen123"),
        role="kitchen",
        is_active=True
    )
    manager = User(
        name="Store Manager",
        email="manager@cafe.com",
        password_hash=get_password_hash("manager123"),
        role="admin",
        is_active=True
    )
    db.add_all([admin, cashier, kitchen, manager])
    db.commit()
    db.refresh(admin)
    db.refresh(cashier)
    db.refresh(kitchen)
    db.refresh(manager)

    # 2. Create Payment Methods
    print("Seeding payment methods...")
    cash_pay = PaymentMethod(name="Cash", type="cash", is_active=True)
    card_pay = PaymentMethod(name="Credit/Debit Card", type="card", is_active=True)
    upi_pay = PaymentMethod(name="UPI QR", type="upi", is_active=True)
    db.add_all([cash_pay, card_pay, upi_pay])
    db.commit()
    db.refresh(cash_pay)
    db.refresh(card_pay)
    db.refresh(upi_pay)

    # 3. Create Categories
    print("Seeding categories...")
    hot_drinks = Category(name="Hot Beverages", color="#E63946", is_active=True)
    cold_drinks = Category(name="Cold Beverages", color="#457B9D", is_active=True)
    bakery = Category(name="Bakery & Snacks", color="#F4A261", is_active=True)
    desserts = Category(name="Gourmet Desserts", color="#E9C46A", is_active=True)
    mains = Category(name="Main Course", color="#2A9D8F", is_active=True)
    db.add_all([hot_drinks, cold_drinks, bakery, desserts, mains])
    db.commit()
    db.refresh(hot_drinks)
    db.refresh(cold_drinks)
    db.refresh(bakery)
    db.refresh(desserts)
    db.refresh(mains)

    # 4. Create Products
    print("Seeding products...")
    p1 = Product(name="Espresso Double", category_id=hot_drinks.id, price=120.0, unit="cups", tax=5.0, description="Strong double-shot espresso brewed from specialty beans", stock=85, min_stock=15, is_active=True)
    p2 = Product(name="Cappuccino Premium", category_id=hot_drinks.id, price=180.0, unit="cups", tax=5.0, description="Rich espresso with steamed milk and thick foam layer", stock=64, min_stock=15, is_active=True)
    p3 = Product(name="Cafe Latte", category_id=hot_drinks.id, price=170.0, unit="cups", tax=5.0, description="Espresso topped with velvety steamed microfoam milk", stock=55, min_stock=12, is_active=True)
    
    p4 = Product(name="Iced Caramel Macchiato", category_id=cold_drinks.id, price=220.0, unit="cups", tax=5.0, description="Chilled milk, espresso, caramel drizzle, and vanilla syrup", stock=40, min_stock=10, is_active=True)
    p5 = Product(name="Mango Mint Cooler", category_id=cold_drinks.id, price=190.0, unit="cups", tax=5.0, description="Fresh mango puree shaken with fresh mint and soda water", stock=30, min_stock=10, is_active=True)
    p6 = Product(name="Classic Cold Coffee", category_id=cold_drinks.id, price=160.0, unit="cups", tax=5.0, description="Perfect blended iced coffee with rich vanilla ice cream", stock=5, min_stock=15, is_active=True) # Low stock
    
    p7 = Product(name="Butter Croissant", category_id=bakery.id, price=110.0, unit="pcs", tax=5.0, description="Flaky, buttery French pastry served warm", stock=25, min_stock=8, is_active=True)
    p8 = Product(name="Chicken Club Sandwich", category_id=bakery.id, price=240.0, unit="pcs", tax=5.0, description="Three slices of bread layered with grilled chicken, egg, and fresh veggies", stock=18, min_stock=5, is_active=True)
    p9 = Product(name="Paneer Tikka Roll", category_id=bakery.id, price=210.0, unit="pcs", tax=5.0, description="Spicy paneer chunks rolled in soft whole wheat flatbread", stock=22, min_stock=5, is_active=True)
    
    p10 = Product(name="Chocolate Mud Cake", category_id=desserts.id, price=190.0, unit="slice", tax=5.0, description="Decadent chocolate cake loaded with warm dark chocolate ganache", stock=4, min_stock=10, is_active=True) # Low stock
    p11 = Product(name="New York Cheesecake", category_id=desserts.id, price=230.0, unit="slice", tax=5.0, description="Classic rich cream cheese cake on graham cracker crust with berry drizzle", stock=14, min_stock=5, is_active=True)
    
    p12 = Product(name="Spaghetti Aglio Olio", category_id=mains.id, price=310.0, unit="plates", tax=5.0, description="Spaghetti tossed in olive oil, garlic, red chili flakes, and parsley", stock=28, min_stock=8, is_active=True)
    p13 = Product(name="Margherita Pizza 9''", category_id=mains.id, price=290.0, unit="pcs", tax=5.0, description="Wood-fired thin crust topped with fresh mozzarella, basil, and tomato sauce", stock=3, min_stock=10, is_active=True) # Low stock
    
    products = [p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12, p13]
    db.add_all(products)
    db.commit()
    for p in products:
        db.refresh(p)

    # 5. Create Floors & Tables
    print("Seeding floors and tables...")
    ground = Floor(name="Ground Floor", is_active=True)
    first = Floor(name="First Floor", is_active=True)
    rooftop = Floor(name="Rooftop Garden", is_active=True)
    db.add_all([ground, first, rooftop])
    db.commit()
    db.refresh(ground)
    db.refresh(first)
    db.refresh(rooftop)

    # Tables with layout coordinates: (x_pos, y_pos) on a grid
    t1 = Table(table_number="G-01", seats=2, status="available", floor_id=ground.id, x_pos=100, y_pos=100, is_active=True)
    t2 = Table(table_number="G-02", seats=4, status="available", floor_id=ground.id, x_pos=250, y_pos=100, is_active=True)
    t3 = Table(table_number="G-03", seats=6, status="available", floor_id=ground.id, x_pos=400, y_pos=100, is_active=True)
    t4 = Table(table_number="G-04", seats=4, status="occupied", floor_id=ground.id, x_pos=550, y_pos=100, is_active=True)

    t5 = Table(table_number="F-01", seats=4, status="available", floor_id=first.id, x_pos=150, y_pos=150, is_active=True)
    t6 = Table(table_number="F-02", seats=2, status="available", floor_id=first.id, x_pos=350, y_pos=150, is_active=True)
    t7 = Table(table_number="F-03", seats=4, status="reserved", floor_id=first.id, x_pos=550, y_pos=150, is_active=True)

    t8 = Table(table_number="R-01", seats=4, status="available", floor_id=rooftop.id, x_pos=120, y_pos=120, is_active=True)
    t9 = Table(table_number="R-02", seats=8, status="available", floor_id=rooftop.id, x_pos=380, y_pos=120, is_active=True)
    
    db.add_all([t1, t2, t3, t4, t5, t6, t7, t8, t9])
    db.commit()

    # 6. Create Coupons & Promotions
    print("Seeding coupons & promotions...")
    c1 = Coupon(code="WELCOME10", type="percentage", value=10.0, expiry_date=datetime.utcnow() + timedelta(days=30), usage_limit=100, usage_count=5, is_active=True)
    c2 = Coupon(code="FLAT50", type="fixed", value=50.0, expiry_date=datetime.utcnow() + timedelta(days=30), usage_limit=50, usage_count=2, is_active=True)
    db.add_all([c1, c2])
    
    # Auto promotions
    promo1 = Promotion(name="Buy 2 Cappuccino, Get 15% Off", type="product", min_quantity=2, discount_value=15.0, product_id=p2.id, is_active=True)
    promo2 = Promotion(name="Flat 10% Off on Orders over $150", type="order", min_order_amount=150.0, discount_value=10.0, is_active=True)
    db.add_all([promo1, promo2])
    db.commit()

    # 7. Create Customers
    print("Seeding customers...")
    cust1 = Customer(name="John Doe", email="john.doe@gmail.com", phone="9876543210", is_active=True)
    cust2 = Customer(name="Alice Smith", email="alice.smith@gmail.com", phone="9876543211", is_active=True)
    db.add_all([cust1, cust2])
    db.commit()
    db.refresh(cust1)
    db.refresh(cust2)

    # 8. Create historical sales data for the last 7 days (Dashboard analytics)
    print("Seeding historical order data...")
    # Add a mock session
    session = POSSession(
        user_id=cashier.id,
        start_time=datetime.utcnow() - timedelta(days=7),
        end_time=datetime.utcnow(),
        status="closed",
        start_balance=1000.0,
        end_balance=5850.0
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Generate 50 mock historical orders over the last 7 days
    methods = [cash_pay, card_pay, upi_pay]
    for day_offset in range(7):
        order_date = datetime.utcnow() - timedelta(days=day_offset)
        # 5 to 10 orders per day
        for order_idx in range(random.randint(5, 10)):
            # Random pick products
            selected_items = random.sample(products, random.randint(1, 4))
            
            # Create Order
            order_number = f"ORD-{order_date.strftime('%Y%m%d')}-{random.randint(1000, 9999)}"
            order = Order(
                order_number=order_number,
                table_id=random.choice([t1.id, t2.id, t3.id, t5.id, t6.id]),
                customer_id=random.choice([cust1.id, cust2.id, None]),
                session_id=session.id,
                user_id=cashier.id,
                status="paid",
                created_at=order_date - timedelta(hours=random.randint(1, 12)), # random times during day
                is_deleted=False
            )
            db.add(order)
            db.commit()
            db.refresh(order)
            
            # Add OrderItems
            subtotal = 0.0
            for prod in selected_items:
                qty = random.randint(1, 3)
                item_total = prod.price * qty
                subtotal += item_total
                
                db_item = OrderItem(
                    order_id=order.id,
                    product_id=prod.id,
                    quantity=qty,
                    price=prod.price,
                    tax_rate=prod.tax,
                    discount_amount=0.0
                )
                db.add(db_item)
            
            tax = subtotal * 0.05
            discount = 0.0
            
            # Apply some random discount/coupon
            if random.random() > 0.7:
                discount = subtotal * 0.1 # 10% off
                
            net_amt = (subtotal - discount) + tax
            
            sent_to_kitchen = order.created_at + timedelta(minutes=random.randint(1, 2))
            preparing = sent_to_kitchen + timedelta(minutes=random.randint(1, 3))
            completed = preparing + timedelta(minutes=random.randint(8, 15))
            paid = completed + timedelta(minutes=random.randint(1, 4))
            
            order.total_amount = round(subtotal, 2)
            order.discount_amount = round(discount, 2)
            order.tax_amount = round(tax, 2)
            order.net_amount = round(net_amt, 2)
            order.sent_to_kitchen_at = sent_to_kitchen
            order.preparing_at = preparing
            order.completed_at = completed
            order.paid_at = paid
            
            # Add Payment
            method = random.choice(methods)
            payment = Payment(
                order_id=order.id,
                amount=net_amt,
                payment_method_id=method.id,
                transaction_ref=f"TXN-{random.randint(100000, 999999)}" if method.type != "cash" else None,
                change_amount=0.0,
                created_at=paid
            )
            db.add(payment)
            
            # Add Kitchen Order
            k_order = KitchenOrder(
                order_id=order.id,
                status="COMPLETED",
                created_at=sent_to_kitchen,
                updated_at=completed
            )
            db.add(k_order)
            
            # Add Feedback
            if random.random() > 0.3:
                feedback = Feedback(
                    order_id=order.id,
                    rating=random.choice([4, 5, 5, 5, 3]),
                    comment=random.choice(["Excellent coffee!", "Nice ambiance", "Loved the Margherita pizza!", None, "Good food, fast service"]),
                    created_at=paid
                )
                db.add(feedback)
                
            db.commit()

    # Create one currently active order at table G-04 (table set as occupied)
    active_order = Order(
        order_number=f"ORD-{datetime.utcnow().strftime('%Y%m%d')}-ACTIVE",
        table_id=t4.id,
        customer_id=cust1.id,
        session_id=session.id,
        user_id=cashier.id,
        status="cooking",
        created_at=datetime.utcnow() - timedelta(minutes=15)
    )
    db.add(active_order)
    db.commit()
    db.refresh(active_order)
    
    # Add items to active order
    item1 = OrderItem(order_id=active_order.id, product_id=p2.id, quantity=2, price=p2.price, tax_rate=p2.tax) # Cappuccino Premium x2
    item2 = OrderItem(order_id=active_order.id, product_id=p7.id, quantity=1, price=p7.price, tax_rate=p7.tax) # Butter Croissant x1
    db.add_all([item1, item2])
    db.commit()
    
    # Calculate totals
    sub = (p2.price * 2) + p7.price
    tax = sub * 0.05
    # Apply promo1 (Cappuccino promo)
    promo_discount = (p2.price * 2) * 0.15
    net = (sub - promo_discount) + tax
    
    active_order.total_amount = round(sub, 2)
    active_order.discount_amount = round(promo_discount, 2)
    active_order.tax_amount = round(tax, 2)
    active_order.net_amount = round(net, 2)
    
    # Add active kitchen order
    active_k = KitchenOrder(
        order_id=active_order.id,
        status="PREPARING",
        created_at=datetime.utcnow() - timedelta(minutes=15)
    )
    db.add(active_k)
    db.commit()

    print("Database seeding completed successfully!")
    db.close()

if __name__ == "__main__":
    # Create tables
    Base.metadata.create_all(bind=engine)
    seed_db()

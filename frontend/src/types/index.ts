export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'employee' | 'kitchen';
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  is_active: boolean;
}

export interface Product {
  id: number;
  name: string;
  category_id?: number;
  price: number;
  description?: string;
  image_url?: string;
  is_available: boolean;
  preparation_time?: number;
  category?: Category;
  stock?: number;
  min_stock?: number;
}

export interface Table {
  id: number;
  name: string;
  table_number?: string;
  capacity: number;
  seats?: number;
  status: string;
  floor_id: number;
  floor_name?: string;
}

export interface Floor {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
}

export interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  loyalty_points?: number;
  total_spent?: number;
  total_orders?: number;
  is_active: boolean;
}

export interface POSSession {
  id: number;
  user_id: number;
  start_time: string;
  end_time?: string;
  status: 'active' | 'closed';
  start_balance: number;
  end_balance?: number;
  notes?: string;
  user?: User;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  price: number;
  note?: string;
  product?: Product;
}

export interface PaymentMethod {
  id: number;
  name: string;
  type?: string;
  is_active: boolean;
}

export interface Payment {
  id: number;
  order_id: number;
  amount: number;
  payment_method_id: number;
  transaction_ref?: string;
  change_amount?: number;
  created_at: string;
  payment_method?: PaymentMethod;
}

export interface Coupon {
  id: number;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  minimum_order: number;
  max_uses?: number;
  uses_count?: number;
  is_active: boolean;
  valid_from?: string;
  valid_until?: string;
}

export interface Promotion {
  id: number;
  name: string;
  description?: string;
  promotion_type: 'percentage' | 'fixed' | 'bogo';
  discount_value: number;
  minimum_order?: number;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
}

export interface KitchenOrderItem {
  product_name: string;
  quantity: number;
  note?: string;
}

export interface KitchenOrder {
  id: number;
  order_id: number;
  status: 'TO_COOK' | 'PREPARING' | 'COMPLETED';
  created_at: string;
  updated_at: string;
  table_number?: string;
  floor_name?: string;
  items: KitchenOrderItem[];
  elapsed_minutes?: number;
  is_delayed?: boolean;
  order_created_at?: string;
  sent_to_kitchen_at?: string;
  preparing_at?: string;
  completed_at?: string;
  paid_at?: string;
}

export interface Order {
  id: number;
  order_number?: string;
  table_id?: number;
  customer_id?: number;
  session_id?: number;
  user_id?: number;
  status: string;
  subtotal?: number;
  discount_amount?: number;
  tax_amount?: number;
  total?: number;
  total_amount?: number;
  net_amount?: number;
  coupon_code?: string;
  coupon?: Coupon;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  order_items?: OrderItem[];
  payments?: Payment[];
  sent_to_kitchen_at?: string;
  preparing_at?: string;
  completed_at?: string;
  paid_at?: string;
}

export interface Feedback {
  id: number;
  order_id: number;
  rating: number;
  comment?: string;
  created_at: string;
}


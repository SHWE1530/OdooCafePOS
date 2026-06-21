import axios from 'axios';
import type { 
  User, Category, Product, Floor, Table, Customer, 
  POSSession, Order, KitchenOrder, PaymentMethod, Coupon, Promotion 
} from '../types';

const API_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add access token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle authentication errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      // If we are not on login page, redirect to login
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (email: string, password: string) => {
    // We send JSON credentials
    const response = await api.post<{ access_token: string, token_type: string }>('/auth/login-json', { email, password });
    return response.data;
  },
  signup: async (userData: any) => {
    const response = await api.post<User>('/auth/signup', userData);
    return response.data;
  },
  getMe: async () => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },
  getUsers: async () => {
    const response = await api.get<User[]>('/auth/users');
    return response.data;
  },
  updateUser: async (id: number, data: any) => {
    const response = await api.put<User>(`/auth/users/${id}`, data);
    return response.data;
  },
  deleteUser: async (id: number) => {
    await api.delete(`/auth/users/${id}`);
  },
  resetPassword: async (id: number, data: any) => {
    const response = await api.post<User>(`/auth/users/${id}/reset-password`, data);
    return response.data;
  },
  updateProfile: async (data: any) => {
    const response = await api.put<User>('/auth/profile', data);
    return response.data;
  },
  changePassword: async (data: any) => {
    const response = await api.post<User>('/auth/profile/change-password', data);
    return response.data;
  }
};

export const categoriesAPI = {
  getAll: async () => {
    const response = await api.get<Category[]>('/categories');
    return response.data;
  },
  create: async (data: Partial<Category>) => {
    const response = await api.post<Category>('/categories', data);
    return response.data;
  },
  update: async (id: number, data: Partial<Category>) => {
    const response = await api.put<Category>(`/categories/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    await api.delete(`/categories/${id}`);
  }
};

export const productsAPI = {
  getPaginated: async (params: { search?: string, category_id?: number, page?: number, limit?: number }) => {
    const response = await api.get<{ total: number, page: number, limit: number, items: Product[] }>('/products', { params });
    return response.data;
  },
  getAllActive: async () => {
    const response = await api.get<Product[]>('/products/all');
    return response.data;
  },
  create: async (data: Partial<Product>) => {
    const response = await api.post<Product>('/products', data);
    return response.data;
  },
  update: async (id: number, data: Partial<Product>) => {
    const response = await api.put<Product>(`/products/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    await api.delete(`/products/${id}`);
  },
  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<{ url: string }>('/products/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
};

export const floorsAPI = {
  getAll: async () => {
    const response = await api.get<Floor[]>('/floors');
    return response.data;
  },
  create: async (data: Partial<Floor>) => {
    const response = await api.post<Floor>('/floors', data);
    return response.data;
  },
  update: async (id: number, data: Partial<Floor>) => {
    const response = await api.put<Floor>(`/floors/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    await api.delete(`/floors/${id}`);
  }
};

export const tablesAPI = {
  getAll: async () => {
    const response = await api.get<Table[]>('/tables');
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post<Table>('/tables', data);
    return response.data;
  },
  update: async (id: number, data: any) => {
    const response = await api.put<Table>(`/tables/${id}`, data);
    return response.data;
  },
  updateStatus: async (id: number, status: string) => {
    const response = await api.put<Table>(`/tables/${id}/status`, null, { params: { status_str: status } });
    return response.data;
  },
  delete: async (id: number) => {
    await api.delete(`/tables/${id}`);
  }
};

export const sessionsAPI = {
  getAll: async () => {
    const response = await api.get<POSSession[]>('/sessions');
    return response.data;
  },
  getActive: async () => {
    const response = await api.get<POSSession | null>('/sessions/active');
    return response.data;
  },
  open: async (data: { start_balance: number, notes?: string }) => {
    const response = await api.post<POSSession>('/sessions/open', data);
    return response.data;
  },
  close: async (id: number, data: { end_balance: number, notes?: string }) => {
    const response = await api.post<POSSession>(`/sessions/${id}/close`, data);
    return response.data;
  }
};

export const ordersAPI = {
  getAll: async (params?: { status_filter?: string, table_id?: number }) => {
    const response = await api.get<Order[]>('/orders', { params });
    return response.data;
  },
  create: async (data: { table_id?: number, customer_id?: number, items?: { product_id: number, quantity: number, note?: string }[] }) => {
    const response = await api.post<Order>('/orders', data);
    return response.data;
  },
  getDetails: async (id: number) => {
    const response = await api.get<Order>(`/orders/${id}`);
    return response.data;
  },
  updateItems: async (id: number, data: { items: { product_id: number, quantity: number, note?: string }[] }) => {
    const response = await api.put<Order>(`/orders/${id}/items`, data);
    return response.data;
  },
  sendToKitchen: async (id: number) => {
    const response = await api.post<Order>(`/orders/${id}/send-to-kitchen`);
    return response.data;
  },
  applyCoupon: async (id: number, code: string) => {
    const response = await api.post<Order>(`/orders/${id}/apply-coupon`, null, { params: { coupon_code: code } });
    return response.data;
  },
  removeCoupon: async (id: number) => {
    const response = await api.post<Order>(`/orders/${id}/remove-coupon`);
    return response.data;
  },
  submitFeedback: async (id: number, rating: number, comment?: string) => {
    const response = await api.post<any>(`/orders/${id}/feedback`, { rating, comment });
    return response.data;
  }
};

export const kitchenAPI = {
  getActiveOrders: async () => {
    const response = await api.get<KitchenOrder[]>('/kitchen/orders');
    return response.data;
  },
  getAllOrders: async () => {
    const response = await api.get<KitchenOrder[]>('/kitchen/orders/all');
    return response.data;
  },
  updateStatus: async (id: number, status: 'TO_COOK' | 'PREPARING' | 'COMPLETED') => {
    const response = await api.put<KitchenOrder>(`/kitchen/orders/${id}/status`, { status });
    return response.data;
  }
};

export const paymentsAPI = {
  getMethods: async () => {
    const response = await api.get<PaymentMethod[]>('/payments/methods');
    return response.data;
  },
  getUpiQr: async (orderId: number) => {
    const response = await api.get<{ qr_code: string, upi_uri: string }>(`/payments/upi-qr/${orderId}`);
    return response.data;
  },
  processPayment: async (orderId: number, data: { amount: number, payment_method_id: number, transaction_ref?: string }) => {
    const response = await api.post<Order>(`/payments/order/${orderId}`, data);
    return response.data;
  },
  getReceiptPdfUrl: (orderId: number) => {
    return `${API_URL}/payments/receipt/${orderId}/pdf`;
  }
};

export const customersAPI = {
  getAll: async (search?: string) => {
    const response = await api.get<Customer[]>('/customers', { params: { search } });
    return response.data;
  },
  create: async (data: Partial<Customer>) => {
    const response = await api.post<Customer>('/customers', data);
    return response.data;
  },
  getOrders: async (id: number) => {
    const response = await api.get<Order[]>(`/customers/${id}/orders`);
    return response.data;
  }
};

export const couponsAPI = {
  getAll: async () => {
    const response = await api.get<Coupon[]>('/coupons');
    return response.data;
  },
  create: async (data: Partial<Coupon>) => {
    const response = await api.post<Coupon>('/coupons', data);
    return response.data;
  },
  update: async (id: number, data: Partial<Coupon>) => {
    const response = await api.put<Coupon>(`/coupons/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    await api.delete(`/coupons/${id}`);
  }
};

export const promotionsAPI = {
  getAll: async () => {
    const response = await api.get<Promotion[]>('/promotions');
    return response.data;
  },
  create: async (data: Partial<Promotion>) => {
    const response = await api.post<Promotion>('/promotions', data);
    return response.data;
  },
  update: async (id: number, data: Partial<Promotion>) => {
    const response = await api.put<Promotion>(`/promotions/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    await api.delete(`/promotions/${id}`);
  }
};

export const dashboardAPI = {
  getSummary: async () => {
    const response = await api.get<any>('/dashboard/summary');
    return response.data;
  },
  getCharts: async () => {
    const response = await api.get<any>('/dashboard/charts');
    return response.data;
  },
  getInsights: async () => {
    const response = await api.get<string[]>('/dashboard/insights');
    return response.data;
  },
  getAIAdvisor: async () => {
    const response = await api.get<any[]>('/dashboard/ai-advisor');
    return response.data;
  },
  getHealthScore: async () => {
    const response = await api.get<any>('/dashboard/health-score');
    return response.data;
  },
  getLiveOps: async () => {
    const response = await api.get<any>('/dashboard/live-ops');
    return response.data;
  },
  triggerDemoMode: async () => {
    const response = await api.post<any>('/dashboard/demo-trigger');
    return response.data;
  },
  getExportExcelUrl: () => {
    const token = localStorage.getItem('token');
    return `${API_URL}/dashboard/export/excel?token=${token}`;
  },
  getExportPdfUrl: () => {
    const token = localStorage.getItem('token');
    return `${API_URL}/dashboard/export/pdf?token=${token}`;
  }
};

export const publicAPI = {
  getActiveOrder: async (tableId: number) => {
    const response = await axios.get<any>(`${API_URL}/orders/public/active`, { params: { table_id: tableId } });
    return response.data;
  },
  getProducts: async () => {
    const response = await axios.get<Product[]>(`${API_URL}/products/public`);
    return response.data;
  },
  getCategories: async () => {
    const response = await axios.get<Category[]>(`${API_URL}/categories/public`);
    return response.data;
  },
  getFloors: async () => {
    const response = await axios.get<Floor[]>(`${API_URL}/floors/public`);
    return response.data;
  },
  getTables: async () => {
    const response = await axios.get<Table[]>(`${API_URL}/tables/public`);
    return response.data;
  },
  applyCoupon: async (orderId: number, code: string) => {
    const response = await axios.post<any>(`${API_URL}/orders/public/${orderId}/apply-coupon`, null, { params: { coupon_code: code } });
    return response.data;
  },
  removeCoupon: async (orderId: number) => {
    const response = await axios.post<any>(`${API_URL}/orders/public/${orderId}/remove-coupon`);
    return response.data;
  },
  placeSelfOrder: async (data: { table_id: number, items: { product_id: number, quantity: number, note?: string }[], coupon_code?: string }) => {
    const response = await axios.post<any>(`${API_URL}/orders/public/self-order`, data);
    return response.data;
  },
  submitFeedback: async (orderId: number, rating: number, comment?: string) => {
    const response = await axios.post<any>(`${API_URL}/orders/public/${orderId}/feedback`, { rating, comment });
    return response.data;
  }
};

export default api;

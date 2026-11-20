export type UserRole = 'OWNER' | 'MANAGER' | 'TESTER';

export interface MillUserAccount {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  passwordHash: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface GatePassItem {
  productName: string;
  bags: number;
}

export interface GatePassRecord {
  id: string;
  gatePassNo: string;
  memoNo?: string;
  date: string;
  time: string;
  items: GatePassItem[];
  totalBags: number;
  receiverName?: string;
  vehicleNumber?: string;
  createdBy: string;
  createdById: string;
  createdByRole: UserRole;
  testerTag?: string;
  authorizedBy: string;
}

export interface VoucherAdjustment {
  id: string;
  date: string;
  time: string;
  previousAmount: number;
  newAmount: number;
  reason: string;
  createdBy: string;
}

export type VoucherStatus = 'pending' | 'approved' | 'rejected';
export type VoucherPaymentMethod = 'Cash' | 'Bank' | 'Other';

export interface ExpenseVoucher {
  id: string;
  voucherNo: string;
  date: string;
  time: string;
  category: string;
  description: string;
  amount: number;
  paidBy: string;
  receiverPerson: string;
  paymentMethod: VoucherPaymentMethod;
  bankAccountId?: string;
  bankAccountName?: string;
  attachmentDataUrl?: string;
  attachmentName?: string;
  createdBy: string;
  createdById: string;
  createdByRole: UserRole;
  status: VoucherStatus;
  ownerSignature?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  notes?: string;
  adjustments: VoucherAdjustment[];
}

export type StockMovementType =
  | 'Opening Stock'
  | 'Production'
  | 'Sales'
  | 'Stock Added'
  | 'Stock Removed'
  | 'Damage'
  | 'Correction/Adjustment'
  | 'Return'
  | 'Gate Pass'
  | 'Reversal';

export interface StockHistoryRecord {
  id: string;
  date: string;
  time: string;
  productId: string;
  productName: string;
  transactionType: StockMovementType;
  reference: string;
  stockIn: number;
  stockOut: number;
  balance: number;
  createdBy: string;
  note: string;
}

export type BankAccountStatus = 'active' | 'inactive';

export interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch: string;
  accountType: 'Current' | 'Savings' | 'Business' | 'Mobile Merchant';
  openingBalance: number;
  currentBalance: number;
  status: BankAccountStatus;
  notes?: string;
  createdAt: string;
}

export type BankTransactionType =
  | 'Deposit'
  | 'Withdraw'
  | 'Transfer'
  | 'Bank Charges'
  | 'Interest'
  | 'Adjustment';

export type WithdrawDestination = 'Cash' | 'Another Bank' | 'Business Expense' | 'Other';

export interface BankTransaction {
  id: string;
  txNo: string;
  date: string;
  time: string;
  bankAccountId: string;
  bankName: string;
  type: BankTransactionType;
  amount: number;
  bankCharges: number;
  chargesDeductedFromWithdrawal?: boolean;
  actualAmountReceived?: number;
  // Withdraw specific
  purpose?: string;
  withdrawnBy?: string;
  destination?: WithdrawDestination;
  relatedVoucherNo?: string;
  // Deposit specific
  depositedFrom?: string;
  depositMethod?: string;
  relatedCashAccount?: string;
  referenceNumber?: string;
  // Transfer specific
  toBankAccountId?: string;
  toBankName?: string;
  notes?: string;
  createdBy: string;
  ownerApprovalStatus?: 'approved' | 'pending';
}

export interface BankAccessLog {
  id: string;
  userId: string;
  username: string;
  role: UserRole;
  date: string;
  time: string;
  success: boolean;
  message: string;
}

export interface SupplierRecord {
  id: string;
  name: string;
  supplierType: string;
  phone: string;
  address: string;
  openingBalance: number;
  totalPurchases: number;
  totalPayments: number;
  currentDue: number;
  notes?: string;
  createdAt: string;
}

export type SupplierTxType =
  | 'Purchase'
  | 'Payment'
  | 'Advance Payment'
  | 'Due'
  | 'Adjustment'
  | 'Refund';

export interface SupplierTransaction {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierType: string;
  date: string;
  time: string;
  type: SupplierTxType;
  referenceNo: string;
  quantityKg?: number;
  rate?: number;
  amount: number;
  paymentMethod?: 'Cash' | 'Bank' | 'Other';
  note: string;
  createdBy: string;
  runningDue: number;
}

export interface CustomerRecord {
  id: string;
  name: string;
  shopName: string;
  phone: string;
  address: string;
  openingBalance: number;
  totalSales: number;
  totalPayments: number;
  currentDue: number;
  notes?: string;
}

export interface CustomerTransaction {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  time: string;
  type: 'Sale' | 'Payment' | 'Advance' | 'Adjustment' | 'Return';
  referenceNo: string;
  amount: number;
  paidAmount: number;
  paymentMethod?: 'Cash' | 'Bank' | 'Due' | 'Other';
  note: string;
  createdBy: string;
  runningDue: number;
}

export interface WheatPurchaseRecord {
  id: string;
  date: string;
  time: string;
  supplierId: string;
  supplierName: string;
  quantityKg: number;
  ratePerKg: number;
  totalCost: number;
  paidAmount: number;
  paymentMethod: 'Cash' | 'Bank' | 'Due';
  memoNo: string;
  note: string;
  createdBy: string;
}

export interface ProductionRecord {
  id: string;
  date: string;
  time: string;
  shift: string;
  wheatUsedKg: number;
  flourBags: number;
  maidaBags: number;
  branBags: number;
  sujiBags: number;
  operatorName: string;
  createdBy: string;
  note?: string;
}

export interface EmployeeDailyTx {
  id: string;
  date: string;
  time: string;
  employeeName: string;
  designation: string;
  type: 'Salary/Wage' | 'Advance' | 'Collection' | 'Expense';
  amount: number;
  note: string;
  createdBy: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  username: string;
  role: UserRole;
  action: string;
  recordType: string;
  recordId: string;
  date: string;
  time: string;
  ipAddress: string;
  details: string;
  previousValue?: string;
  newValue?: string;
}

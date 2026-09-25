/**
 * Auto-generated from the SQL in supabase/migrations/*.sql.
 * Once this project is linked to a real Supabase project, regenerate the
 * authoritative version with:
 *   npx supabase gen types typescript --linked > src/types/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          tax_id: string | null;
          branch_code: string;
          address: string | null;
          phone: string | null;
          email: string | null;
          logo_url: string | null;
          fiscal_year_start_month: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          tax_id?: string | null;
          branch_code?: string;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          logo_url?: string | null;
          fiscal_year_start_month?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          tax_id?: string | null;
          branch_code?: string;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          logo_url?: string | null;
          fiscal_year_start_month?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      document_number_sequences: {
        Row: {
          id: string;
          doc_type: string;
          prefix: string;
          current_number: number;
          reset_period: string;
          last_reset_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          doc_type: string;
          prefix: string;
          current_number?: number;
          reset_period?: string;
          last_reset_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          doc_type?: string;
          prefix?: string;
          current_number?: number;
          reset_period?: string;
          last_reset_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          sku: string;
          barcode: string | null;
          name: string;
          unit: string;
          product_type: string;
          cost_price: number;
          sale_price: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sku: string;
          barcode?: string | null;
          name: string;
          unit?: string;
          product_type?: string;
          cost_price?: number;
          sale_price?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sku?: string;
          barcode?: string | null;
          name?: string;
          unit?: string;
          product_type?: string;
          cost_price?: number;
          sale_price?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      departments: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      positions: {
        Row: {
          id: string;
          department_id: string | null;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          department_id?: string | null;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          department_id?: string | null;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      employees: {
        Row: {
          id: string;
          employee_code: string;
          prefix_name: string | null;
          first_name: string;
          last_name: string;
          nickname: string | null;
          id_card_number: string | null;
          department_id: string | null;
          position_id: string | null;
          employment_type: string;
          start_date: string;
          end_date: string | null;
          status: string;
          phone: string | null;
          email: string | null;
          address: string | null;
          bank_name: string | null;
          bank_account_number: string | null;
          bank_account_name: string | null;
          base_salary: number;
          social_security_number: string | null;
          tax_id: string | null;
          user_id: string | null;
          team_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_code: string;
          prefix_name?: string | null;
          first_name: string;
          last_name: string;
          nickname?: string | null;
          id_card_number?: string | null;
          department_id?: string | null;
          position_id?: string | null;
          employment_type?: string;
          start_date: string;
          end_date?: string | null;
          status?: string;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          bank_name?: string | null;
          bank_account_number?: string | null;
          bank_account_name?: string | null;
          base_salary?: number;
          social_security_number?: string | null;
          tax_id?: string | null;
          user_id?: string | null;
          team_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_code?: string;
          prefix_name?: string | null;
          first_name?: string;
          last_name?: string;
          nickname?: string | null;
          id_card_number?: string | null;
          department_id?: string | null;
          position_id?: string | null;
          employment_type?: string;
          start_date?: string;
          end_date?: string | null;
          status?: string;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          bank_name?: string | null;
          bank_account_number?: string | null;
          bank_account_name?: string | null;
          base_salary?: number;
          social_security_number?: string | null;
          tax_id?: string | null;
          user_id?: string | null;
          team_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      employee_salary_history: {
        Row: {
          id: string;
          employee_id: string;
          base_salary: number;
          effective_date: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          base_salary: number;
          effective_date: string;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          base_salary?: number;
          effective_date?: string;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      employee_deduction_settings: {
        Row: {
          id: string;
          employee_id: string;
          deduction_type: string;
          label: string | null;
          amount: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          deduction_type: string;
          label?: string | null;
          amount?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          deduction_type?: string;
          label?: string | null;
          amount?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      company_holidays: {
        Row: {
          id: string;
          holiday_date: string;
          name: string;
          type: string;
          note: string | null;
          team_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          holiday_date: string;
          name: string;
          type?: string;
          note?: string | null;
          team_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          holiday_date?: string;
          name?: string;
          type?: string;
          note?: string | null;
          team_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      leave_types: {
        Row: {
          id: string;
          name: string;
          max_days_per_year: number | null;
          is_paid: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          max_days_per_year?: number | null;
          is_paid?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          max_days_per_year?: number | null;
          is_paid?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      leave_requests: {
        Row: {
          id: string;
          employee_id: string;
          leave_type_id: string;
          start_date: string;
          end_date: string;
          days_count: number;
          reason: string | null;
          status: string;
          approved_by: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          leave_type_id: string;
          start_date: string;
          end_date: string;
          days_count: number;
          reason?: string | null;
          status?: string;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          leave_type_id?: string;
          start_date?: string;
          end_date?: string;
          days_count?: number;
          reason?: string | null;
          status?: string;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payroll_periods: {
        Row: {
          id: string;
          period_month: number;
          period_year: number;
          pay_date: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          period_month: number;
          period_year: number;
          pay_date: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          period_month?: number;
          period_year?: number;
          pay_date?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payroll_runs: {
        Row: {
          id: string;
          run_number: string;
          payroll_period_id: string;
          status: string;
          total_gross: number;
          total_deduction: number;
          total_net: number;
          approved_by: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          run_number: string;
          payroll_period_id: string;
          status?: string;
          total_gross?: number;
          total_deduction?: number;
          total_net?: number;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          run_number?: string;
          payroll_period_id?: string;
          status?: string;
          total_gross?: number;
          total_deduction?: number;
          total_net?: number;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payroll_items: {
        Row: {
          id: string;
          payroll_run_id: string;
          employee_id: string;
          base_salary: number;
          ot_amount: number;
          bonus_amount: number;
          commission_amount: number;
          other_addition: number;
          gross_income: number | null;
          social_security_deduction: number;
          withholding_tax: number;
          student_loan_deduction: number;
          other_deduction: number;
          total_deduction: number | null;
          net_pay: number | null;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          payroll_run_id: string;
          employee_id: string;
          base_salary?: number;
          ot_amount?: number;
          bonus_amount?: number;
          commission_amount?: number;
          other_addition?: number;
          gross_income?: number | null;
          social_security_deduction?: number;
          withholding_tax?: number;
          student_loan_deduction?: number;
          other_deduction?: number;
          total_deduction?: number | null;
          net_pay?: number | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          payroll_run_id?: string;
          employee_id?: string;
          base_salary?: number;
          ot_amount?: number;
          bonus_amount?: number;
          commission_amount?: number;
          other_addition?: number;
          gross_income?: number | null;
          social_security_deduction?: number;
          withholding_tax?: number;
          student_loan_deduction?: number;
          other_deduction?: number;
          total_deduction?: number | null;
          net_pay?: number | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ot_records: {
        Row: {
          id: string;
          employee_id: string;
          work_date: string;
          ot_hours: number;
          ot_rate_multiplier: number;
          ot_amount: number;
          payroll_item_id: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          work_date: string;
          ot_hours: number;
          ot_rate_multiplier?: number;
          ot_amount: number;
          payroll_item_id?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          work_date?: string;
          ot_hours?: number;
          ot_rate_multiplier?: number;
          ot_amount?: number;
          payroll_item_id?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      bonus_commission_records: {
        Row: {
          id: string;
          employee_id: string;
          record_type: string;
          amount: number;
          reference: string | null;
          period_month: number | null;
          period_year: number | null;
          payroll_item_id: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          record_type: string;
          amount: number;
          reference?: string | null;
          period_month?: number | null;
          period_year?: number | null;
          payroll_item_id?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          record_type?: string;
          amount?: number;
          reference?: string | null;
          period_month?: number | null;
          period_year?: number | null;
          payroll_item_id?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      social_security_contributions: {
        Row: {
          id: string;
          payroll_item_id: string;
          base_amount: number;
          employee_rate: number;
          employer_rate: number;
          employee_contribution: number;
          employer_contribution: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          payroll_item_id: string;
          base_amount: number;
          employee_rate?: number;
          employer_rate?: number;
          employee_contribution: number;
          employer_contribution: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          payroll_item_id?: string;
          base_amount?: number;
          employee_rate?: number;
          employer_rate?: number;
          employee_contribution?: number;
          employer_contribution?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      payslips: {
        Row: {
          id: string;
          payroll_item_id: string;
          employee_id: string;
          pdf_url: string | null;
          issued_at: string | null;
          viewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          payroll_item_id: string;
          employee_id: string;
          pdf_url?: string | null;
          issued_at?: string | null;
          viewed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          payroll_item_id?: string;
          employee_id?: string;
          pdf_url?: string | null;
          issued_at?: string | null;
          viewed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      sales_channels: {
        Row: {
          id: string;
          code: string;
          name: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          customer_code: string;
          customer_type: string;
          name: string;
          tax_id: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          credit_limit: number;
          credit_term_days: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_code: string;
          customer_type?: string;
          name: string;
          tax_id?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          credit_limit?: number;
          credit_term_days?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_code?: string;
          customer_type?: string;
          name?: string;
          tax_id?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          credit_limit?: number;
          credit_term_days?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      customer_addresses: {
        Row: {
          id: string;
          customer_id: string;
          address_type: string;
          address_line: string;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          address_type?: string;
          address_line: string;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          address_type?: string;
          address_line?: string;
          is_default?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      quotations: {
        Row: {
          id: string;
          quotation_number: string;
          customer_id: string;
          sales_channel_id: string | null;
          quotation_date: string;
          valid_until: string | null;
          status: string;
          subtotal: number;
          discount_amount: number;
          vat_amount: number;
          total_amount: number;
          note: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          quotation_number?: string;
          customer_id: string;
          sales_channel_id?: string | null;
          quotation_date?: string;
          valid_until?: string | null;
          status?: string;
          subtotal?: number;
          discount_amount?: number;
          vat_amount?: number;
          total_amount?: number;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          quotation_number?: string;
          customer_id?: string;
          sales_channel_id?: string | null;
          quotation_date?: string;
          valid_until?: string | null;
          status?: string;
          subtotal?: number;
          discount_amount?: number;
          vat_amount?: number;
          total_amount?: number;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      quotation_items: {
        Row: {
          id: string;
          quotation_id: string;
          product_id: string | null;
          description: string | null;
          quantity: number;
          unit_price: number;
          discount_amount: number;
          amount: number | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          quotation_id: string;
          product_id?: string | null;
          description?: string | null;
          quantity?: number;
          unit_price?: number;
          discount_amount?: number;
          amount?: number | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          quotation_id?: string;
          product_id?: string | null;
          description?: string | null;
          quantity?: number;
          unit_price?: number;
          discount_amount?: number;
          amount?: number | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      sales_orders: {
        Row: {
          id: string;
          order_number: string;
          quotation_id: string | null;
          customer_id: string;
          sales_channel_id: string | null;
          salesperson_id: string | null;
          order_date: string;
          status: string;
          payment_status: string;
          subtotal: number;
          discount_amount: number;
          vat_amount: number;
          shipping_fee: number;
          total_amount: number;
          note: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number?: string;
          quotation_id?: string | null;
          customer_id: string;
          sales_channel_id?: string | null;
          salesperson_id?: string | null;
          order_date?: string;
          status?: string;
          payment_status?: string;
          subtotal?: number;
          discount_amount?: number;
          vat_amount?: number;
          shipping_fee?: number;
          total_amount?: number;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          quotation_id?: string | null;
          customer_id?: string;
          sales_channel_id?: string | null;
          salesperson_id?: string | null;
          order_date?: string;
          status?: string;
          payment_status?: string;
          subtotal?: number;
          discount_amount?: number;
          vat_amount?: number;
          shipping_fee?: number;
          total_amount?: number;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sales_order_items: {
        Row: {
          id: string;
          sales_order_id: string;
          product_id: string | null;
          description: string | null;
          quantity: number;
          unit_price: number;
          discount_amount: number;
          amount: number | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          sales_order_id: string;
          product_id?: string | null;
          description?: string | null;
          quantity?: number;
          unit_price?: number;
          discount_amount?: number;
          amount?: number | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          sales_order_id?: string;
          product_id?: string | null;
          description?: string | null;
          quantity?: number;
          unit_price?: number;
          discount_amount?: number;
          amount?: number | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          invoice_number: string;
          sales_order_id: string | null;
          customer_id: string;
          invoice_date: string;
          due_date: string | null;
          status: string;
          subtotal: number;
          discount_amount: number;
          vat_amount: number;
          total_amount: number;
          paid_amount: number;
          outstanding_amount: number | null;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          invoice_number?: string;
          sales_order_id?: string | null;
          customer_id: string;
          invoice_date?: string;
          due_date?: string | null;
          status?: string;
          subtotal?: number;
          discount_amount?: number;
          vat_amount?: number;
          total_amount?: number;
          paid_amount?: number;
          outstanding_amount?: number | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          invoice_number?: string;
          sales_order_id?: string | null;
          customer_id?: string;
          invoice_date?: string;
          due_date?: string | null;
          status?: string;
          subtotal?: number;
          discount_amount?: number;
          vat_amount?: number;
          total_amount?: number;
          paid_amount?: number;
          outstanding_amount?: number | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      invoice_items: {
        Row: {
          id: string;
          invoice_id: string;
          product_id: string | null;
          description: string | null;
          quantity: number;
          unit_price: number;
          discount_amount: number;
          amount: number | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          product_id?: string | null;
          description?: string | null;
          quantity?: number;
          unit_price?: number;
          discount_amount?: number;
          amount?: number | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          invoice_id?: string;
          product_id?: string | null;
          description?: string | null;
          quantity?: number;
          unit_price?: number;
          discount_amount?: number;
          amount?: number | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      tax_invoices: {
        Row: {
          id: string;
          tax_invoice_number: string;
          invoice_id: string;
          issue_date: string;
          buyer_tax_id: string | null;
          buyer_name: string;
          buyer_address: string | null;
          total_amount: number;
          vat_amount: number;
          is_cancelled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          tax_invoice_number?: string;
          invoice_id: string;
          issue_date?: string;
          buyer_tax_id?: string | null;
          buyer_name: string;
          buyer_address?: string | null;
          total_amount?: number;
          vat_amount?: number;
          is_cancelled?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          tax_invoice_number?: string;
          invoice_id?: string;
          issue_date?: string;
          buyer_tax_id?: string | null;
          buyer_name?: string;
          buyer_address?: string | null;
          total_amount?: number;
          vat_amount?: number;
          is_cancelled?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      receipts: {
        Row: {
          id: string;
          receipt_number: string;
          customer_id: string;
          invoice_id: string | null;
          receipt_date: string;
          payment_method: string;
          amount: number;
          reference_number: string | null;
          note: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          receipt_number?: string;
          customer_id: string;
          invoice_id?: string | null;
          receipt_date?: string;
          payment_method?: string;
          amount: number;
          reference_number?: string | null;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          receipt_number?: string;
          customer_id?: string;
          invoice_id?: string | null;
          receipt_date?: string;
          payment_method?: string;
          amount?: number;
          reference_number?: string | null;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      shipments: {
        Row: {
          id: string;
          sales_order_id: string;
          shipment_date: string | null;
          carrier: string | null;
          tracking_number: string | null;
          shipping_status: string;
          delivered_at: string | null;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sales_order_id: string;
          shipment_date?: string | null;
          carrier?: string | null;
          tracking_number?: string | null;
          shipping_status?: string;
          delivered_at?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sales_order_id?: string;
          shipment_date?: string | null;
          carrier?: string | null;
          tracking_number?: string | null;
          shipping_status?: string;
          delivered_at?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sales_returns: {
        Row: {
          id: string;
          return_number: string;
          sales_order_id: string;
          customer_id: string;
          return_date: string;
          reason: string | null;
          status: string;
          total_refund_amount: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          return_number?: string;
          sales_order_id: string;
          customer_id: string;
          return_date?: string;
          reason?: string | null;
          status?: string;
          total_refund_amount?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          return_number?: string;
          sales_order_id?: string;
          customer_id?: string;
          return_date?: string;
          reason?: string | null;
          status?: string;
          total_refund_amount?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sales_return_items: {
        Row: {
          id: string;
          sales_return_id: string;
          sales_order_item_id: string | null;
          product_id: string | null;
          quantity: number;
          unit_price: number;
          amount: number | null;
        };
        Insert: {
          id?: string;
          sales_return_id: string;
          sales_order_item_id?: string | null;
          product_id?: string | null;
          quantity?: number;
          unit_price?: number;
          amount?: number | null;
        };
        Update: {
          id?: string;
          sales_return_id?: string;
          sales_order_item_id?: string | null;
          product_id?: string | null;
          quantity?: number;
          unit_price?: number;
          amount?: number | null;
        };
        Relationships: [];
      };
      suppliers: {
        Row: {
          id: string;
          supplier_code: string;
          name: string;
          tax_id: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          contact_person: string | null;
          payment_term_days: number;
          bank_name: string | null;
          bank_account_number: string | null;
          bank_account_name: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          supplier_code: string;
          name: string;
          tax_id?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          contact_person?: string | null;
          payment_term_days?: number;
          bank_name?: string | null;
          bank_account_number?: string | null;
          bank_account_name?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          supplier_code?: string;
          name?: string;
          tax_id?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          contact_person?: string | null;
          payment_term_days?: number;
          bank_name?: string | null;
          bank_account_number?: string | null;
          bank_account_name?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      purchase_requests: {
        Row: {
          id: string;
          pr_number: string;
          requested_by: string | null;
          department_id: string | null;
          request_date: string;
          required_date: string | null;
          status: string;
          note: string | null;
          approved_by: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pr_number?: string;
          requested_by?: string | null;
          department_id?: string | null;
          request_date?: string;
          required_date?: string | null;
          status?: string;
          note?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pr_number?: string;
          requested_by?: string | null;
          department_id?: string | null;
          request_date?: string;
          required_date?: string | null;
          status?: string;
          note?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      purchase_request_items: {
        Row: {
          id: string;
          purchase_request_id: string;
          product_id: string | null;
          description: string | null;
          quantity: number;
          estimated_unit_price: number;
          sort_order: number;
        };
        Insert: {
          id?: string;
          purchase_request_id: string;
          product_id?: string | null;
          description?: string | null;
          quantity?: number;
          estimated_unit_price?: number;
          sort_order?: number;
        };
        Update: {
          id?: string;
          purchase_request_id?: string;
          product_id?: string | null;
          description?: string | null;
          quantity?: number;
          estimated_unit_price?: number;
          sort_order?: number;
        };
        Relationships: [];
      };
      purchase_orders: {
        Row: {
          id: string;
          po_number: string;
          purchase_request_id: string | null;
          supplier_id: string;
          order_date: string;
          expected_date: string | null;
          status: string;
          subtotal: number;
          discount_amount: number;
          vat_amount: number;
          total_amount: number;
          note: string | null;
          created_by: string | null;
          approved_by: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          po_number?: string;
          purchase_request_id?: string | null;
          supplier_id: string;
          order_date?: string;
          expected_date?: string | null;
          status?: string;
          subtotal?: number;
          discount_amount?: number;
          vat_amount?: number;
          total_amount?: number;
          note?: string | null;
          created_by?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          po_number?: string;
          purchase_request_id?: string | null;
          supplier_id?: string;
          order_date?: string;
          expected_date?: string | null;
          status?: string;
          subtotal?: number;
          discount_amount?: number;
          vat_amount?: number;
          total_amount?: number;
          note?: string | null;
          created_by?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      purchase_order_items: {
        Row: {
          id: string;
          purchase_order_id: string;
          product_id: string | null;
          description: string | null;
          quantity: number;
          unit_price: number;
          discount_amount: number;
          amount: number | null;
          received_quantity: number;
          sort_order: number;
        };
        Insert: {
          id?: string;
          purchase_order_id: string;
          product_id?: string | null;
          description?: string | null;
          quantity?: number;
          unit_price?: number;
          discount_amount?: number;
          amount?: number | null;
          received_quantity?: number;
          sort_order?: number;
        };
        Update: {
          id?: string;
          purchase_order_id?: string;
          product_id?: string | null;
          description?: string | null;
          quantity?: number;
          unit_price?: number;
          discount_amount?: number;
          amount?: number | null;
          received_quantity?: number;
          sort_order?: number;
        };
        Relationships: [];
      };
      goods_receipts: {
        Row: {
          id: string;
          gr_number: string;
          purchase_order_id: string;
          supplier_id: string;
          receipt_date: string;
          status: string;
          note: string | null;
          received_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          gr_number?: string;
          purchase_order_id: string;
          supplier_id: string;
          receipt_date?: string;
          status?: string;
          note?: string | null;
          received_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          gr_number?: string;
          purchase_order_id?: string;
          supplier_id?: string;
          receipt_date?: string;
          status?: string;
          note?: string | null;
          received_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      goods_receipt_items: {
        Row: {
          id: string;
          goods_receipt_id: string;
          purchase_order_item_id: string | null;
          product_id: string | null;
          quantity_received: number;
          unit_price: number;
          amount: number | null;
          note: string | null;
        };
        Insert: {
          id?: string;
          goods_receipt_id: string;
          purchase_order_item_id?: string | null;
          product_id?: string | null;
          quantity_received?: number;
          unit_price?: number;
          amount?: number | null;
          note?: string | null;
        };
        Update: {
          id?: string;
          goods_receipt_id?: string;
          purchase_order_item_id?: string | null;
          product_id?: string | null;
          quantity_received?: number;
          unit_price?: number;
          amount?: number | null;
          note?: string | null;
        };
        Relationships: [];
      };
      purchase_bills: {
        Row: {
          id: string;
          bill_number: string;
          supplier_invoice_number: string | null;
          purchase_order_id: string | null;
          supplier_id: string;
          bill_date: string;
          due_date: string | null;
          status: string;
          subtotal: number;
          discount_amount: number;
          vat_amount: number;
          wht_amount: number;
          total_amount: number;
          paid_amount: number;
          outstanding_amount: number | null;
          note: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          bill_number?: string;
          supplier_invoice_number?: string | null;
          purchase_order_id?: string | null;
          supplier_id: string;
          bill_date?: string;
          due_date?: string | null;
          status?: string;
          subtotal?: number;
          discount_amount?: number;
          vat_amount?: number;
          wht_amount?: number;
          total_amount?: number;
          paid_amount?: number;
          outstanding_amount?: number | null;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          bill_number?: string;
          supplier_invoice_number?: string | null;
          purchase_order_id?: string | null;
          supplier_id?: string;
          bill_date?: string;
          due_date?: string | null;
          status?: string;
          subtotal?: number;
          discount_amount?: number;
          vat_amount?: number;
          wht_amount?: number;
          total_amount?: number;
          paid_amount?: number;
          outstanding_amount?: number | null;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      purchase_bill_items: {
        Row: {
          id: string;
          purchase_bill_id: string;
          goods_receipt_item_id: string | null;
          product_id: string | null;
          description: string | null;
          quantity: number;
          unit_price: number;
          discount_amount: number;
          amount: number | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          purchase_bill_id: string;
          goods_receipt_item_id?: string | null;
          product_id?: string | null;
          description?: string | null;
          quantity?: number;
          unit_price?: number;
          discount_amount?: number;
          amount?: number | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          purchase_bill_id?: string;
          goods_receipt_item_id?: string | null;
          product_id?: string | null;
          description?: string | null;
          quantity?: number;
          unit_price?: number;
          discount_amount?: number;
          amount?: number | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      ap_payments: {
        Row: {
          id: string;
          payment_number: string;
          supplier_id: string;
          purchase_bill_id: string | null;
          payment_date: string;
          payment_method: string;
          amount: number;
          reference_number: string | null;
          note: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          payment_number?: string;
          supplier_id: string;
          purchase_bill_id?: string | null;
          payment_date?: string;
          payment_method?: string;
          amount: number;
          reference_number?: string | null;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          payment_number?: string;
          supplier_id?: string;
          purchase_bill_id?: string | null;
          payment_date?: string;
          payment_method?: string;
          amount?: number;
          reference_number?: string | null;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      purchase_approvals: {
        Row: {
          id: string;
          document_type: string;
          document_id: string;
          approver_id: string;
          approval_level: number;
          status: string;
          comment: string | null;
          approved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_type: string;
          document_id: string;
          approver_id: string;
          approval_level?: number;
          status?: string;
          comment?: string | null;
          approved_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_type?: string;
          document_id?: string;
          approver_id?: string;
          approval_level?: number;
          status?: string;
          comment?: string | null;
          approved_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          employee_id: string | null;
          roles: string[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          employee_id?: string | null;
          roles?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          employee_id?: string | null;
          roles?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      supplier_purchase_history: {
        Row: { [key: string]: unknown };
        Relationships: [];
      };
      employee_directory: {
        Row: {
          id: string;
          user_id: string | null;
          employee_code: string;
          prefix_name: string | null;
          first_name: string;
          last_name: string;
          department_id: string | null;
          position_id: string | null;
          status: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      next_document_number: {
        Args: { p_doc_type: string };
        Returns: string;
      };
      set_updated_at: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
      current_roles: {
        Args: Record<PropertyKey, never>;
        Returns: string[];
      };
      has_role: {
        Args: { p_role: string };
        Returns: boolean;
      };
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      current_employee_id: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
      update_own_employee_profile: {
        Args: {
          p_prefix_name: string | null;
          p_first_name: string;
          p_last_name: string;
          p_nickname: string | null;
          p_phone: string | null;
          p_email: string | null;
          p_address: string | null;
          p_id_card_number: string | null;
          p_bank_name: string | null;
          p_bank_account_number: string | null;
          p_bank_account_name: string | null;
        };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

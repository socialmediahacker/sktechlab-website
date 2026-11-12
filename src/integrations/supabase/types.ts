export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_label: string | null
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_label?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_label?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
        }
        Relationships: []
      }
      ai_runs: {
        Row: {
          applied_at: string | null
          created_at: string
          created_by: string | null
          id: string
          prompt: string
          proposals: Json
          scope: Json
          snapshots: Json
          status: string
        }
        Insert: {
          applied_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          prompt: string
          proposals?: Json
          scope?: Json
          snapshots?: Json
          status?: string
        }
        Update: {
          applied_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          prompt?: string
          proposals?: Json
          scope?: Json
          snapshots?: Json
          status?: string
        }
        Relationships: []
      }
      api_integrations: {
        Row: {
          config: Json
          created_at: string
          enabled: boolean
          id: string
          label: string
          provider: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          label?: string
          provider: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          label?: string
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_comments: {
        Row: {
          approved_at: string | null
          author_email: string | null
          author_name: string
          body: string
          created_at: string
          id: string
          post_id: string
          status: string
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          author_email?: string | null
          author_name: string
          body: string
          created_at?: string
          id?: string
          post_id: string
          status?: string
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          author_email?: string | null
          author_name?: string
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          answer_block: string | null
          body: string
          category_id: string | null
          category_slug: string | null
          created_at: string
          created_by: string | null
          excerpt: string | null
          faq: Json
          gallery: Json
          hero_image: string | null
          id: string
          keywords: string[]
          language: string
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
          views: number
          word_count: number
        }
        Insert: {
          answer_block?: string | null
          body?: string
          category_id?: string | null
          category_slug?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          faq?: Json
          gallery?: Json
          hero_image?: string | null
          id?: string
          keywords?: string[]
          language?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
          views?: number
          word_count?: number
        }
        Update: {
          answer_block?: string | null
          body?: string
          category_id?: string | null
          category_slug?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          faq?: Json
          gallery?: Json
          hero_image?: string | null
          id?: string
          keywords?: string[]
          language?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
          views?: number
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_runs: {
        Row: {
          category_ids: Json
          created_at: string
          created_count: number
          errors: Json
          id: string
          language: string
          max_words: number
          min_words: number
          per_category: number
          processed: number
          scope: string
          started_by: string | null
          status: string
          total: number
        }
        Insert: {
          category_ids?: Json
          created_at?: string
          created_count?: number
          errors?: Json
          id?: string
          language?: string
          max_words?: number
          min_words?: number
          per_category?: number
          processed?: number
          scope?: string
          started_by?: string | null
          status?: string
          total?: number
        }
        Update: {
          category_ids?: Json
          created_at?: string
          created_count?: number
          errors?: Json
          id?: string
          language?: string
          max_words?: number
          min_words?: number
          per_category?: number
          processed?: number
          scope?: string
          started_by?: string | null
          status?: string
          total?: number
        }
        Relationships: []
      }
      bug_reports: {
        Row: {
          actual: string | null
          admin_note: string | null
          attachments: Json
          created_at: string
          created_by: string | null
          device: string
          diagnostics: Json
          expected: string | null
          id: string
          page_url: string | null
          priority: string
          report_text: string
          status: string
          steps: string | null
          title: string
          updated_at: string
        }
        Insert: {
          actual?: string | null
          admin_note?: string | null
          attachments?: Json
          created_at?: string
          created_by?: string | null
          device?: string
          diagnostics?: Json
          expected?: string | null
          id?: string
          page_url?: string | null
          priority?: string
          report_text?: string
          status?: string
          steps?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          actual?: string | null
          admin_note?: string | null
          attachments?: Json
          created_at?: string
          created_by?: string | null
          device?: string
          diagnostics?: Json
          expected?: string | null
          id?: string
          page_url?: string | null
          priority?: string
          report_text?: string
          status?: string
          steps?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      builder_sessions: {
        Row: {
          ecom_addon_product_limit: number | null
          payment_confirmed_at: string | null
          domain_quote_id: string | null
          domain_registrant: Json | null
          checkout_breakdown: Json | null
          checkout_locked_at: string | null
          shop_activated_at: string | null
          ecom_addon_billing: string | null
          access_token_hash: string | null
          ai_generated_content: Json | null
          business_category: string | null
          business_name: string
          candidate_template_ids: string[] | null
          category_slug: string | null
          completed: boolean
          created_at: string
          created_site_id: string | null
          current_step: string
          description: string | null
          domain_type: string | null
          ecom_addon_price_inr: number | null
          id: string
          payment_amount_inr: number
          payment_method: string | null
          payment_note: string | null
          payment_proof_url: string | null
          payment_ref: string | null
          payment_status: string
          payment_submission_id: string | null
          selected_domain: string | null
          selected_plan_id: string | null
          selected_template_id: string | null
          updated_at: string
          user_id: string | null
          wants_ecommerce: boolean
          whatsapp: string | null
          whatsapp_verified: boolean
        }
        Insert: {
          ecom_addon_product_limit?: number | null
          payment_confirmed_at?: string | null
          domain_quote_id?: string | null
          domain_registrant?: Json | null
          checkout_breakdown?: Json | null
          checkout_locked_at?: string | null
          shop_activated_at?: string | null
          ecom_addon_billing?: string | null
          access_token_hash?: string | null
          ai_generated_content?: Json | null
          business_category?: string | null
          business_name: string
          candidate_template_ids?: string[] | null
          category_slug?: string | null
          completed?: boolean
          created_at?: string
          created_site_id?: string | null
          current_step?: string
          description?: string | null
          domain_type?: string | null
          ecom_addon_price_inr?: number | null
          id?: string
          payment_amount_inr?: number
          payment_method?: string | null
          payment_note?: string | null
          payment_proof_url?: string | null
          payment_ref?: string | null
          payment_status?: string
          payment_submission_id?: string | null
          selected_domain?: string | null
          selected_plan_id?: string | null
          selected_template_id?: string | null
          updated_at?: string
          user_id?: string | null
          wants_ecommerce?: boolean
          whatsapp?: string | null
          whatsapp_verified?: boolean
        }
        Update: {
          ecom_addon_product_limit?: number | null
          payment_confirmed_at?: string | null
          domain_quote_id?: string | null
          domain_registrant?: Json | null
          checkout_breakdown?: Json | null
          checkout_locked_at?: string | null
          shop_activated_at?: string | null
          ecom_addon_billing?: string | null
          access_token_hash?: string | null
          ai_generated_content?: Json | null
          business_category?: string | null
          business_name?: string
          candidate_template_ids?: string[] | null
          category_slug?: string | null
          completed?: boolean
          created_at?: string
          created_site_id?: string | null
          current_step?: string
          description?: string | null
          domain_type?: string | null
          ecom_addon_price_inr?: number | null
          id?: string
          payment_amount_inr?: number
          payment_method?: string | null
          payment_note?: string | null
          payment_proof_url?: string | null
          payment_ref?: string | null
          payment_status?: string
          payment_submission_id?: string | null
          selected_domain?: string | null
          selected_plan_id?: string | null
          selected_template_id?: string | null
          updated_at?: string
          user_id?: string | null
          wants_ecommerce?: boolean
          whatsapp?: string | null
          whatsapp_verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "builder_sessions_created_site_id_fkey"
            columns: ["created_site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "builder_sessions_selected_plan_id_fkey"
            columns: ["selected_plan_id"]
            isOneToOne: false
            referencedRelation: "service_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "builder_sessions_selected_template_id_fkey"
            columns: ["selected_template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_apply_snapshots: {
        Row: {
          content: Json
          created_at: string
          id: string
          run_id: string
          template_id: string
        }
        Insert: {
          content: Json
          created_at?: string
          id?: string
          run_id: string
          template_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          run_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulk_apply_snapshots_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "bulk_image_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_image_runs: {
        Row: {
          apply_images: boolean
          apply_style: boolean
          apply_text: boolean
          category_id: string | null
          created_at: string
          error: string | null
          id: string
          mode: string
          processed: number
          replaced: number
          scope: string
          skip_customised: boolean
          started_by: string | null
          status: string
          total: number
          updated_at: string
        }
        Insert: {
          apply_images?: boolean
          apply_style?: boolean
          apply_text?: boolean
          category_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          mode?: string
          processed?: number
          replaced?: number
          scope?: string
          skip_customised?: boolean
          started_by?: string | null
          status?: string
          total?: number
          updated_at?: string
        }
        Update: {
          apply_images?: boolean
          apply_style?: boolean
          apply_text?: boolean
          category_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          mode?: string
          processed?: number
          replaced?: number
          scope?: string
          skip_customised?: boolean
          started_by?: string | null
          status?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulk_image_runs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      category_blueprints: {
        Row: {
          category_id: string | null
          category_slug: string
          created_at: string
          fonts: Json
          hero_style: string | null
          id: string
          is_active: boolean
          layout: string
          motion: string
          name: string
          notes: string | null
          palette: Json
          section_order: string[]
          sort_order: number
          sources: Json
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          category_slug: string
          created_at?: string
          fonts?: Json
          hero_style?: string | null
          id?: string
          is_active?: boolean
          layout?: string
          motion?: string
          name: string
          notes?: string | null
          palette?: Json
          section_order?: string[]
          sort_order?: number
          sources?: Json
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          category_slug?: string
          created_at?: string
          fonts?: Json
          hero_style?: string | null
          id?: string
          is_active?: boolean
          layout?: string
          motion?: string
          name?: string
          notes?: string | null
          palette?: Json
          section_order?: string[]
          sort_order?: number
          sources?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_blueprints_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string | null
          id: string
          message: string | null
          metadata: Json | null
          name: string | null
          phone: string | null
          site_id: string | null
          source: string | null
          template_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          name?: string | null
          phone?: string | null
          site_id?: string | null
          source?: string | null
          template_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          name?: string | null
          phone?: string | null
          site_id?: string | null
          source?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_submissions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_submissions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_dev_requests: {
        Row: {
          budget: string | null
          business_type: string | null
          created_at: string
          email: string
          id: string
          name: string
          requirements: string
          status: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          budget?: string | null
          business_type?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          requirements: string
          status?: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          budget?: string | null
          business_type?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          requirements?: string
          status?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      domain_requests: {
        Row: {
          builder_session_id: string | null
          created_at: string
          domain: string
          id: string
          is_paid_suggestion: boolean | null
          is_primary: boolean
          kind: string
          last_checked_at: string | null
          notes: string | null
          record_name: string | null
          record_type: string | null
          record_value: string | null
          site_id: string | null
          status: string
          updated_at: string
          user_id: string
          verification_token: string | null
          verified_at: string | null
        }
        Insert: {
          builder_session_id?: string | null
          created_at?: string
          domain: string
          id?: string
          is_paid_suggestion?: boolean | null
          is_primary?: boolean
          kind?: string
          last_checked_at?: string | null
          notes?: string | null
          record_name?: string | null
          record_type?: string | null
          record_value?: string | null
          site_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
          verification_token?: string | null
          verified_at?: string | null
        }
        Update: {
          builder_session_id?: string | null
          created_at?: string
          domain?: string
          id?: string
          is_paid_suggestion?: boolean | null
          is_primary?: boolean
          kind?: string
          last_checked_at?: string | null
          notes?: string | null
          record_name?: string | null
          record_type?: string | null
          record_value?: string | null
          site_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          verification_token?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "domain_requests_builder_session_id_fkey"
            columns: ["builder_session_id"]
            isOneToOne: false
            referencedRelation: "builder_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domain_requests_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_roots: {
        Row: {
          a_record: string | null
          created_at: string
          id: string
          is_active: boolean
          nameservers: string[]
          note: string | null
          root: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          a_record?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          nameservers?: string[]
          note?: string | null
          root: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          a_record?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          nameservers?: string[]
          note?: string | null
          root?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      harvest_runs: {
        Row: {
          category_id: string | null
          collected: number
          created_at: string
          error: string | null
          id: string
          keywords: string
          processed: number
          scope: string
          sites: Json
          started_by: string | null
          status: string
          total: number
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          collected?: number
          created_at?: string
          error?: string | null
          id?: string
          keywords?: string
          processed?: number
          scope?: string
          sites?: Json
          started_by?: string | null
          status?: string
          total?: number
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          collected?: number
          created_at?: string
          error?: string | null
          id?: string
          keywords?: string
          processed?: number
          scope?: string
          sites?: Json
          started_by?: string | null
          status?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "harvest_runs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      harvested_images: {
        Row: {
          blocked: boolean
          category_id: string | null
          category_slug: string
          cdn_url: string | null
          created_at: string
          hash: string
          height: number | null
          id: string
          quality_score: number
          section_key: string
          source_domain: string | null
          source_url: string | null
          upload_error: string | null
          uploaded_at: string | null
          url: string
          used_count: number
          used_in: Json
          width: number | null
        }
        Insert: {
          blocked?: boolean
          category_id?: string | null
          category_slug?: string
          cdn_url?: string | null
          created_at?: string
          hash: string
          height?: number | null
          id?: string
          quality_score?: number
          section_key?: string
          source_domain?: string | null
          source_url?: string | null
          upload_error?: string | null
          uploaded_at?: string | null
          url: string
          used_count?: number
          used_in?: Json
          width?: number | null
        }
        Update: {
          blocked?: boolean
          category_id?: string | null
          category_slug?: string
          cdn_url?: string | null
          created_at?: string
          hash?: string
          height?: number | null
          id?: string
          quality_score?: number
          section_key?: string
          source_domain?: string | null
          source_url?: string | null
          upload_error?: string | null
          uploaded_at?: string | null
          url?: string
          used_count?: number
          used_in?: Json
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "harvested_images_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_inr: number
          created_at: string
          currency: string
          gateway_kind: string | null
          gateway_reference: string | null
          gstin: string | null
          id: string
          invoice_no: number
          notes: string | null
          period_end: string | null
          period_start: string | null
          plan_id: string | null
          plan_name: string | null
          status: string
          tax_inr: number
          total_inr: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_inr?: number
          created_at?: string
          currency?: string
          gateway_kind?: string | null
          gateway_reference?: string | null
          gstin?: string | null
          id?: string
          invoice_no?: number
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          plan_id?: string | null
          plan_name?: string | null
          status?: string
          tax_inr?: number
          total_inr?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_inr?: number
          created_at?: string
          currency?: string
          gateway_kind?: string | null
          gateway_reference?: string | null
          gstin?: string | null
          id?: string
          invoice_no?: number
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          plan_id?: string | null
          plan_name?: string | null
          status?: string
          tax_inr?: number
          total_inr?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      message_logs: {
        Row: {
          body_preview: string | null
          channel: string
          created_at: string
          error: string | null
          id: string
          recipient: string
          status: string
          subject: string | null
          template_key: string | null
        }
        Insert: {
          body_preview?: string | null
          channel: string
          created_at?: string
          error?: string | null
          id?: string
          recipient: string
          status?: string
          subject?: string | null
          template_key?: string | null
        }
        Update: {
          body_preview?: string | null
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          recipient?: string
          status?: string
          subject?: string | null
          template_key?: string | null
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          body: string
          channel: string
          created_at: string
          id: string
          is_enabled: boolean
          key: string
          name: string
          subject: string | null
          updated_at: string
          variables: Json
        }
        Insert: {
          body: string
          channel: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          key: string
          name: string
          subject?: string | null
          updated_at?: string
          variables?: Json
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          key?: string
          name?: string
          subject?: string | null
          updated_at?: string
          variables?: Json
        }
        Relationships: []
      }
      niche_profiles: {
        Row: {
          created_at: string
          id: string
          input_hash: string
          profile: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          input_hash: string
          profile?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          input_hash?: string
          profile?: Json
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          admin_note: string | null
          buyer_email: string | null
          buyer_name: string
          buyer_phone: string
          buyer_user_id: string | null
          coupon_code: string | null
          courier: string | null
          created_at: string
          customer_note: string | null
          discount_inr: number
          fulfillment_status: string
          gateway_kind: string
          gateway_reference: string | null
          id: string
          items: Json
          order_no: number
          payment_proof_url: string | null
          payment_reference: string | null
          payment_rejected_reason: string | null
          payment_status: string
          payment_verified_at: string | null
          payment_verified_by: string | null
          shipping_address: Json | null
          shipping_inr: number
          site_id: string
          status: string
          subtotal_inr: number
          tax_inr: number
          total_inr: number
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          buyer_email?: string | null
          buyer_name: string
          buyer_phone: string
          buyer_user_id?: string | null
          coupon_code?: string | null
          courier?: string | null
          created_at?: string
          customer_note?: string | null
          discount_inr?: number
          fulfillment_status?: string
          gateway_kind: string
          gateway_reference?: string | null
          id?: string
          items?: Json
          order_no?: number
          payment_proof_url?: string | null
          payment_reference?: string | null
          payment_rejected_reason?: string | null
          payment_status?: string
          payment_verified_at?: string | null
          payment_verified_by?: string | null
          shipping_address?: Json | null
          shipping_inr?: number
          site_id: string
          status?: string
          subtotal_inr?: number
          tax_inr?: number
          total_inr?: number
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          buyer_email?: string | null
          buyer_name?: string
          buyer_phone?: string
          buyer_user_id?: string | null
          coupon_code?: string | null
          courier?: string | null
          created_at?: string
          customer_note?: string | null
          discount_inr?: number
          fulfillment_status?: string
          gateway_kind?: string
          gateway_reference?: string | null
          id?: string
          items?: Json
          order_no?: number
          payment_proof_url?: string | null
          payment_reference?: string | null
          payment_rejected_reason?: string | null
          payment_status?: string
          payment_verified_at?: string | null
          payment_verified_by?: string | null
          shipping_address?: Json | null
          shipping_inr?: number
          site_id?: string
          status?: string
          subtotal_inr?: number
          tax_inr?: number
          total_inr?: number
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_codes: {
        Row: {
          attempts: number
          code_hash: string
          consumed: boolean
          created_at: string
          expires_at: string
          id: string
          phone: string | null
          sent_via: string
          whatsapp: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed?: boolean
          created_at?: string
          expires_at: string
          id?: string
          phone?: string | null
          sent_via?: string
          whatsapp: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed?: boolean
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string | null
          sent_via?: string
          whatsapp?: string
        }
        Relationships: []
      }
      page_seo: {
        Row: {
          created_at: string
          description: string | null
          geo_placename: string | null
          geo_region: string | null
          id: string
          json_ld: Json | null
          keywords: string | null
          og_image: string | null
          path: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          geo_placename?: string | null
          geo_region?: string | null
          id?: string
          json_ld?: Json | null
          keywords?: string | null
          og_image?: string | null
          path: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          geo_placename?: string | null
          geo_region?: string | null
          id?: string
          json_ld?: Json | null
          keywords?: string | null
          og_image?: string | null
          path?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_gateways: {
        Row: {
          config: Json
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_enabled: boolean
          kind: string
          requires_manual_verification: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_enabled?: boolean
          kind: string
          requires_manual_verification?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_enabled?: boolean
          kind?: string
          requires_manual_verification?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      payment_submissions: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          currency: string
          gateway_kind: string
          id: string
          payer_note: string | null
          plan_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          screenshot_url: string | null
          status: string
          txn_reference: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          currency?: string
          gateway_kind: string
          id?: string
          payer_note?: string | null
          plan_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url?: string | null
          status?: string
          txn_reference?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          currency?: string
          gateway_kind?: string
          id?: string
          payer_note?: string | null
          plan_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url?: string | null
          status?: string
          txn_reference?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_submissions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          created_at: string
          id: string
          label: string
          module: string
          sort_order: number
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          label: string
          module: string
          sort_order?: number
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          label?: string
          module?: string
          sort_order?: number
        }
        Relationships: []
      }
      plans: {
        Row: {
          allowed_gateways: string[]
          created_at: string
          currency: string
          description: string | null
          duration_days: number
          ecom_product_limit: number | null
          features: Json
          id: string
          is_active: boolean
          name: string
          price_inr: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          allowed_gateways?: string[]
          created_at?: string
          currency?: string
          description?: string | null
          duration_days?: number
          ecom_product_limit?: number | null
          features?: Json
          id?: string
          is_active?: boolean
          name: string
          price_inr?: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          allowed_gateways?: string[]
          created_at?: string
          currency?: string
          description?: string | null
          duration_days?: number
          ecom_product_limit?: number | null
          features?: Json
          id?: string
          is_active?: boolean
          name?: string
          price_inr?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          allow_backorder: boolean
          attributes: Json
          badge: string | null
          barcode: string | null
          brand: string | null
          category: string | null
          collection_ids: string[]
          compare_price_inr: number | null
          created_at: string
          description: string | null
          id: string
          images: Json
          is_active: boolean
          is_featured: boolean
          low_stock_threshold: number
          name: string
          price_inr: number
          seo_description: string | null
          seo_title: string | null
          site_id: string
          sku: string | null
          slug: string
          sort_order: number
          status: string
          stock: number
          tags: string[]
          tax_percent: number
          track_inventory: boolean
          updated_at: string
          variants: Json
          video_url: string | null
          weight_grams: number | null
        }
        Insert: {
          allow_backorder?: boolean
          attributes?: Json
          badge?: string | null
          barcode?: string | null
          brand?: string | null
          category?: string | null
          collection_ids?: string[]
          compare_price_inr?: number | null
          created_at?: string
          description?: string | null
          id?: string
          images?: Json
          is_active?: boolean
          is_featured?: boolean
          low_stock_threshold?: number
          name: string
          price_inr?: number
          seo_description?: string | null
          seo_title?: string | null
          site_id: string
          sku?: string | null
          slug: string
          sort_order?: number
          status?: string
          stock?: number
          tags?: string[]
          tax_percent?: number
          track_inventory?: boolean
          updated_at?: string
          variants?: Json
          video_url?: string | null
          weight_grams?: number | null
        }
        Update: {
          allow_backorder?: boolean
          attributes?: Json
          badge?: string | null
          barcode?: string | null
          brand?: string | null
          category?: string | null
          collection_ids?: string[]
          compare_price_inr?: number | null
          created_at?: string
          description?: string | null
          id?: string
          images?: Json
          is_active?: boolean
          is_featured?: boolean
          low_stock_threshold?: number
          name?: string
          price_inr?: number
          seo_description?: string | null
          seo_title?: string | null
          site_id?: string
          sku?: string | null
          slug?: string
          sort_order?: number
          status?: string
          stock?: number
          tags?: string[]
          tax_percent?: number
          track_inventory?: boolean
          updated_at?: string
          variants?: Json
          video_url?: string | null
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          shop_product_limit: number | null
          ecom_addon_expires_at: string | null
          active_plan: string | null
          avatar_url: string | null
          blocked: boolean
          created_at: string
          ecom_addon: boolean
          ecom_addon_status: string
          full_name: string | null
          id: string
          plan: string
          plan_tier: string
          trial_ends_at: string | null
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          shop_product_limit?: number | null
          ecom_addon_expires_at?: string | null
          active_plan?: string | null
          avatar_url?: string | null
          blocked?: boolean
          created_at?: string
          ecom_addon?: boolean
          ecom_addon_status?: string
          full_name?: string | null
          id: string
          plan?: string
          plan_tier?: string
          trial_ends_at?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          shop_product_limit?: number | null
          ecom_addon_expires_at?: string | null
          active_plan?: string | null
          avatar_url?: string | null
          blocked?: boolean
          created_at?: string
          ecom_addon?: boolean
          ecom_addon_status?: string
          full_name?: string | null
          id?: string
          plan?: string
          plan_tier?: string
          trial_ends_at?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          location: string | null
          name: string
          photo_url: string | null
          rating: number
          role: string | null
          sort_order: number
          text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          photo_url?: string | null
          rating?: number
          role?: string | null
          sort_order?: number
          text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          photo_url?: string | null
          rating?: number
          role?: string | null
          sort_order?: number
          text?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_keywords: {
        Row: {
          category_slug: string | null
          created_at: string
          id: string
          intent: string
          keyword: string
          language: string
          used_count: number
        }
        Insert: {
          category_slug?: string | null
          created_at?: string
          id?: string
          intent?: string
          keyword: string
          language?: string
          used_count?: number
        }
        Update: {
          category_slug?: string | null
          created_at?: string
          id?: string
          intent?: string
          keyword?: string
          language?: string
          used_count?: number
        }
        Relationships: []
      }
      service_bookings: {
        Row: {
          admin_note: string | null
          created_at: string
          email: string
          id: string
          message: string
          service: string
          status: string
          website_url: string | null
          whatsapp: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          service: string
          status?: string
          website_url?: string | null
          whatsapp: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          service?: string
          status?: string
          website_url?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      service_orders: {
        Row: {
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          notes: string | null
          plan_id: string
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          plan_id: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          plan_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "service_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      service_plans: {
        Row: {
          ecom_product_limit: number
          billing: Database["public"]["Enums"]["billing_cycle"]
          created_at: string
          entitlements: Json
          features: Json
          highlighted: boolean
          id: string
          is_base: boolean
          name: string
          price_inr: number
          service_type: Database["public"]["Enums"]["service_type"]
          sort_order: number
          tagline: string | null
          tier: string
        }
        Insert: {
          ecom_product_limit?: number
          billing?: Database["public"]["Enums"]["billing_cycle"]
          created_at?: string
          entitlements?: Json
          features?: Json
          highlighted?: boolean
          id?: string
          is_base?: boolean
          name: string
          price_inr: number
          service_type: Database["public"]["Enums"]["service_type"]
          sort_order?: number
          tagline?: string | null
          tier: string
        }
        Update: {
          ecom_product_limit?: number
          billing?: Database["public"]["Enums"]["billing_cycle"]
          created_at?: string
          entitlements?: Json
          features?: Json
          highlighted?: boolean
          id?: string
          is_base?: boolean
          name?: string
          price_inr?: number
          service_type?: Database["public"]["Enums"]["service_type"]
          sort_order?: number
          tagline?: string | null
          tier?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          ai_generation_enabled: boolean
          ai_provider: string
          autopay_enabled: boolean
          autopay_provider: string
          brand_name: string
          brand_tagline: string | null
          contact_email: string | null
          contact_phone: string | null
          contact_popup_enabled: boolean
          crypto_enabled: boolean
          crypto_network: string | null
          crypto_payment_note: string | null
          crypto_qr_url: string | null
          crypto_wallet_address: string | null
          default_map_embed_url: string | null
          default_map_query: string | null
          ecom_addon_billing: string
          ecom_addon_desc: string | null
          ecom_addon_enabled: boolean
          ecom_addon_label: string
          ecom_addon_price_inr: number
          ecom_addon_product_limit: number
          ecommerce_enabled: boolean | null
          email_admin_recipient: string | null
          email_enabled: boolean
          email_from_name: string | null
          email_login_enabled: boolean
          email_reply_to: string | null
          email_types: Json
          floating_widgets_enabled: boolean
          free_subdomain_root: string
          hero_story_images: Json
          id: number
          manual_qr_url: string | null
          manual_upi_enabled: boolean
          manual_upi_id: string | null
          manual_upi_name: string | null
          otp_provider: string
          pexels_enabled: boolean
          razorpay_enabled: boolean
          razorpay_key_id: string | null
          sms_fallback_enabled: boolean
          starter_free_domain_root: string | null
          tawk_enabled: boolean
          tawk_property_id: string | null
          tawk_widget_id: string | null
          trial_days: number
          updated_at: string
          voice_api_enabled: boolean
          whatsapp_enabled: boolean
          whatsapp_message: string | null
          whatsapp_number: string | null
          whatsapp_otp_enabled: boolean
          woocommerce_plan_tier: string | null
        }
        Insert: {
          ai_generation_enabled?: boolean
          ai_provider?: string
          autopay_enabled?: boolean
          autopay_provider?: string
          brand_name?: string
          brand_tagline?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_popup_enabled?: boolean
          crypto_enabled?: boolean
          crypto_network?: string | null
          crypto_payment_note?: string | null
          crypto_qr_url?: string | null
          crypto_wallet_address?: string | null
          default_map_embed_url?: string | null
          default_map_query?: string | null
          ecom_addon_billing?: string
          ecom_addon_desc?: string | null
          ecom_addon_enabled?: boolean
          ecom_addon_label?: string
          ecom_addon_price_inr?: number
          ecom_addon_product_limit?: number
          ecommerce_enabled?: boolean | null
          email_admin_recipient?: string | null
          email_enabled?: boolean
          email_from_name?: string | null
          email_login_enabled?: boolean
          email_reply_to?: string | null
          email_types?: Json
          floating_widgets_enabled?: boolean
          free_subdomain_root?: string
          hero_story_images?: Json
          id?: number
          manual_qr_url?: string | null
          manual_upi_enabled?: boolean
          manual_upi_id?: string | null
          manual_upi_name?: string | null
          otp_provider?: string
          pexels_enabled?: boolean
          razorpay_enabled?: boolean
          razorpay_key_id?: string | null
          sms_fallback_enabled?: boolean
          starter_free_domain_root?: string | null
          tawk_enabled?: boolean
          tawk_property_id?: string | null
          tawk_widget_id?: string | null
          trial_days?: number
          updated_at?: string
          voice_api_enabled?: boolean
          whatsapp_enabled?: boolean
          whatsapp_message?: string | null
          whatsapp_number?: string | null
          whatsapp_otp_enabled?: boolean
          woocommerce_plan_tier?: string | null
        }
        Update: {
          ai_generation_enabled?: boolean
          ai_provider?: string
          autopay_enabled?: boolean
          autopay_provider?: string
          brand_name?: string
          brand_tagline?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_popup_enabled?: boolean
          crypto_enabled?: boolean
          crypto_network?: string | null
          crypto_payment_note?: string | null
          crypto_qr_url?: string | null
          crypto_wallet_address?: string | null
          default_map_embed_url?: string | null
          default_map_query?: string | null
          ecom_addon_billing?: string
          ecom_addon_desc?: string | null
          ecom_addon_enabled?: boolean
          ecom_addon_label?: string
          ecom_addon_price_inr?: number
          ecom_addon_product_limit?: number
          ecommerce_enabled?: boolean | null
          email_admin_recipient?: string | null
          email_enabled?: boolean
          email_from_name?: string | null
          email_login_enabled?: boolean
          email_reply_to?: string | null
          email_types?: Json
          floating_widgets_enabled?: boolean
          free_subdomain_root?: string
          hero_story_images?: Json
          id?: number
          manual_qr_url?: string | null
          manual_upi_enabled?: boolean
          manual_upi_id?: string | null
          manual_upi_name?: string | null
          otp_provider?: string
          pexels_enabled?: boolean
          razorpay_enabled?: boolean
          razorpay_key_id?: string | null
          sms_fallback_enabled?: boolean
          starter_free_domain_root?: string | null
          tawk_enabled?: boolean
          tawk_property_id?: string | null
          tawk_widget_id?: string | null
          trial_days?: number
          updated_at?: string
          voice_api_enabled?: boolean
          whatsapp_enabled?: boolean
          whatsapp_message?: string | null
          whatsapp_number?: string | null
          whatsapp_otp_enabled?: boolean
          woocommerce_plan_tier?: string | null
        }
        Relationships: []
      }
      sites: {
        Row: {
          content: Json
          content_json: Json | null
          created_at: string
          id: string
          name: string
          pages: Json
          published: boolean
          subdomain: string | null
          suspended: boolean
          suspended_at: string | null
          suspended_reason: string | null
          template_id: string | null
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          content?: Json
          content_json?: Json | null
          created_at?: string
          id?: string
          name: string
          pages?: Json
          published?: boolean
          subdomain?: string | null
          suspended?: boolean
          suspended_at?: string | null
          suspended_reason?: string | null
          template_id?: string | null
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          content?: Json
          content_json?: Json | null
          created_at?: string
          id?: string
          name?: string
          pages?: Json
          published?: boolean
          subdomain?: string | null
          suspended?: boolean
          suspended_at?: string | null
          suspended_reason?: string | null
          template_id?: string | null
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "sites_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      store_collections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image: string | null
          is_active: boolean
          name: string
          site_id: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          is_active?: boolean
          name: string
          site_id: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          is_active?: boolean
          name?: string
          site_id?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_collections_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      store_coupons: {
        Row: {
          code: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          kind: string
          min_order_inr: number
          site_id: string
          updated_at: string
          usage_limit: number | null
          used_count: number
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          min_order_inr?: number
          site_id: string
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          value?: number
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          min_order_inr?: number
          site_id?: string
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "store_coupons_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      store_payment_settings: {
        Row: {
          bank_account_name: string | null
          bank_account_number: string | null
          bank_enabled: boolean
          bank_ifsc: string | null
          bank_instructions: string | null
          bank_name: string | null
          cod_enabled: boolean
          cod_instructions: string | null
          cod_max_inr: number | null
          cod_min_inr: number
          created_at: string
          crypto_enabled: boolean
          crypto_instructions: string | null
          crypto_network: string | null
          crypto_qr_url: string | null
          crypto_wallet_address: string | null
          id: string
          razorpay_enabled: boolean
          razorpay_key_id: string | null
          razorpay_key_secret: string | null
          razorpay_mode: string
          site_id: string
          updated_at: string
          upi_enabled: boolean
          upi_id: string | null
          upi_instructions: string | null
          upi_name: string | null
          upi_qr_url: string | null
        }
        Insert: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_enabled?: boolean
          bank_ifsc?: string | null
          bank_instructions?: string | null
          bank_name?: string | null
          cod_enabled?: boolean
          cod_instructions?: string | null
          cod_max_inr?: number | null
          cod_min_inr?: number
          created_at?: string
          crypto_enabled?: boolean
          crypto_instructions?: string | null
          crypto_network?: string | null
          crypto_qr_url?: string | null
          crypto_wallet_address?: string | null
          id?: string
          razorpay_enabled?: boolean
          razorpay_key_id?: string | null
          razorpay_key_secret?: string | null
          razorpay_mode?: string
          site_id: string
          updated_at?: string
          upi_enabled?: boolean
          upi_id?: string | null
          upi_instructions?: string | null
          upi_name?: string | null
          upi_qr_url?: string | null
        }
        Update: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_enabled?: boolean
          bank_ifsc?: string | null
          bank_instructions?: string | null
          bank_name?: string | null
          cod_enabled?: boolean
          cod_instructions?: string | null
          cod_max_inr?: number | null
          cod_min_inr?: number
          created_at?: string
          crypto_enabled?: boolean
          crypto_instructions?: string | null
          crypto_network?: string | null
          crypto_qr_url?: string | null
          crypto_wallet_address?: string | null
          id?: string
          razorpay_enabled?: boolean
          razorpay_key_id?: string | null
          razorpay_key_secret?: string | null
          razorpay_mode?: string
          site_id?: string
          updated_at?: string
          upi_enabled?: boolean
          upi_id?: string | null
          upi_instructions?: string | null
          upi_name?: string | null
          upi_qr_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_payment_settings_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      subcategories: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount_inr: number
          created_at: string
          id: string
          interval: string
          last_charge_at: string | null
          last_error: string | null
          next_charge_at: string | null
          notes: string | null
          plan_id: string | null
          plan_name: string | null
          provider: string
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: string
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_inr?: number
          created_at?: string
          id?: string
          interval?: string
          last_charge_at?: string | null
          last_error?: string | null
          next_charge_at?: string | null
          notes?: string | null
          plan_id?: string | null
          plan_name?: string | null
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_inr?: number
          created_at?: string
          id?: string
          interval?: string
          last_charge_at?: string | null
          last_error?: string | null
          next_charge_at?: string | null
          notes?: string | null
          plan_id?: string | null
          plan_name?: string | null
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_reply: string | null
          attachments: Json
          category: string
          created_at: string
          custom_fields: Json
          id: string
          message: string
          priority: string
          request_type: string
          site_id: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          attachments?: Json
          category?: string
          created_at?: string
          custom_fields?: Json
          id?: string
          message: string
          priority?: string
          request_type?: string
          site_id?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          attachments?: Json
          category?: string
          created_at?: string
          custom_fields?: Json
          id?: string
          message?: string
          priority?: string
          request_type?: string
          site_id?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          accent_color: string | null
          archetype: string | null
          category_id: string
          content_json: Json | null
          created_at: string
          demo_url: string | null
          description: string | null
          home_slot: string | null
          id: string
          is_editable_demo: boolean
          is_premium: boolean
          name: string
          sections: Json
          show_on_home: boolean
          sort_order: number
          subcategory_id: string | null
          thumbnail_url: string | null
        }
        Insert: {
          accent_color?: string | null
          archetype?: string | null
          category_id: string
          content_json?: Json | null
          created_at?: string
          demo_url?: string | null
          description?: string | null
          home_slot?: string | null
          id?: string
          is_editable_demo?: boolean
          is_premium?: boolean
          name: string
          sections?: Json
          show_on_home?: boolean
          sort_order?: number
          subcategory_id?: string | null
          thumbnail_url?: string | null
        }
        Update: {
          accent_color?: string | null
          archetype?: string | null
          category_id?: string
          content_json?: Json | null
          created_at?: string
          demo_url?: string | null
          description?: string | null
          home_slot?: string | null
          id?: string
          is_editable_demo?: boolean
          is_premium?: boolean
          name?: string
          sections?: Json
          show_on_home?: boolean
          sort_order?: number
          subcategory_id?: string | null
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_email_events: {
        Row: {
          amount: number | null
          body: string | null
          created_at: string
          from_email: string | null
          id: string
          matched_intent_id: string | null
          reason: string | null
          source: string
          status: string
          subject: string | null
          txn_id: string | null
        }
        Insert: {
          amount?: number | null
          body?: string | null
          created_at?: string
          from_email?: string | null
          id?: string
          matched_intent_id?: string | null
          reason?: string | null
          source?: string
          status?: string
          subject?: string | null
          txn_id?: string | null
        }
        Update: {
          amount?: number | null
          body?: string | null
          created_at?: string
          from_email?: string | null
          id?: string
          matched_intent_id?: string | null
          reason?: string | null
          source?: string
          status?: string
          subject?: string | null
          txn_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upi_email_events_matched_intent_id_fkey"
            columns: ["matched_intent_id"]
            isOneToOne: false
            referencedRelation: "upi_payment_intents"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_gateway_settings: {
        Row: {
          auto_approve_manual: boolean
          auto_verify_enabled: boolean
          created_at: string
          display_name: string
          enabled: boolean
          expiry_minutes: number
          id: number
          imap_app_password: string | null
          imap_email: string | null
          imap_enabled: boolean
          imap_folder: string
          imap_host: string | null
          imap_last_checked_at: string | null
          imap_last_error: string | null
          imap_last_ok_at: string | null
          imap_last_uid: number
          imap_port: number
          instructions: string
          manual_utr_enabled: boolean
          notify_admin: boolean
          payee_name: string | null
          poll_seconds: number
          qr_url: string | null
          random_max: number
          random_min: number
          sender_allowlist: string[]
          unique_amount_enabled: boolean
          updated_at: string
          upi_id: string | null
          webhook_secret: string | null
        }
        Insert: {
          auto_approve_manual?: boolean
          auto_verify_enabled?: boolean
          created_at?: string
          display_name?: string
          enabled?: boolean
          expiry_minutes?: number
          id?: number
          imap_app_password?: string | null
          imap_email?: string | null
          imap_enabled?: boolean
          imap_folder?: string
          imap_host?: string | null
          imap_last_checked_at?: string | null
          imap_last_error?: string | null
          imap_last_ok_at?: string | null
          imap_last_uid?: number
          imap_port?: number
          instructions?: string
          manual_utr_enabled?: boolean
          notify_admin?: boolean
          payee_name?: string | null
          poll_seconds?: number
          qr_url?: string | null
          random_max?: number
          random_min?: number
          sender_allowlist?: string[]
          unique_amount_enabled?: boolean
          updated_at?: string
          upi_id?: string | null
          webhook_secret?: string | null
        }
        Update: {
          auto_approve_manual?: boolean
          auto_verify_enabled?: boolean
          created_at?: string
          display_name?: string
          enabled?: boolean
          expiry_minutes?: number
          id?: number
          imap_app_password?: string | null
          imap_email?: string | null
          imap_enabled?: boolean
          imap_folder?: string
          imap_host?: string | null
          imap_last_checked_at?: string | null
          imap_last_error?: string | null
          imap_last_ok_at?: string | null
          imap_last_uid?: number
          imap_port?: number
          instructions?: string
          manual_utr_enabled?: boolean
          notify_admin?: boolean
          payee_name?: string | null
          poll_seconds?: number
          qr_url?: string | null
          random_max?: number
          random_min?: number
          sender_allowlist?: string[]
          unique_amount_enabled?: boolean
          updated_at?: string
          upi_id?: string | null
          webhook_secret?: string | null
        }
        Relationships: []
      }
      upi_payment_intents: {
        Row: {
          admin_note: string | null
          base_amount: number
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          expires_at: string
          id: string
          matched_at: string | null
          matched_source: string | null
          matched_txn_id: string | null
          note: string | null
          payable_amount: number
          purpose: string
          reference_id: string | null
          status: string
          updated_at: string
          upi_id: string | null
          user_id: string | null
          utr: string | null
        }
        Insert: {
          admin_note?: string | null
          base_amount: number
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          expires_at?: string
          id?: string
          matched_at?: string | null
          matched_source?: string | null
          matched_txn_id?: string | null
          note?: string | null
          payable_amount: number
          purpose?: string
          reference_id?: string | null
          status?: string
          updated_at?: string
          upi_id?: string | null
          user_id?: string | null
          utr?: string | null
        }
        Update: {
          admin_note?: string | null
          base_amount?: number
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          expires_at?: string
          id?: string
          matched_at?: string | null
          matched_source?: string | null
          matched_txn_id?: string | null
          note?: string | null
          payable_amount?: number
          purpose?: string
          reference_id?: string | null
          status?: string
          updated_at?: string
          upi_id?: string | null
          user_id?: string | null
          utr?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      blog_comments_public: {
        Row: {
          author_name: string | null
          body: string | null
          created_at: string | null
          id: string | null
          post_id: string | null
        }
        Insert: {
          author_name?: string | null
          body?: string | null
          created_at?: string | null
          id?: string | null
          post_id?: string | null
        }
        Update: {
          author_name?: string | null
          body?: string | null
          created_at?: string | null
          id?: string | null
          post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_edit_site: { Args: { _site_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "super_admin" | "staff" | "support"
      billing_cycle:
        | "one_time"
        | "monthly"
        | "yearly"
        | "quarterly"
        | "half_yearly"
      order_status: "pending" | "active" | "completed" | "cancelled"
      service_type:
        | "digital_marketing"
        | "gmb_boost"
        | "website_development"
        | "site_subscription"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "super_admin", "staff", "support"],
      billing_cycle: [
        "one_time",
        "monthly",
        "yearly",
        "quarterly",
        "half_yearly",
      ],
      order_status: ["pending", "active", "completed", "cancelled"],
      service_type: [
        "digital_marketing",
        "gmb_boost",
        "website_development",
        "site_subscription",
      ],
    },
  },
} as const

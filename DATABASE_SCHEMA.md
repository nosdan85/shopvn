# Database schema

Ứng dụng dùng SQLite mặc định qua `better-sqlite3`. Có thể đổi sang PostgreSQL/MySQL trong production bằng cách thay lớp truy cập DB ở `server/db.cjs` và giữ nguyên model nghiệp vụ.

## users

- `id`
- `username`
- `email`
- `password_hash`
- `balance`
- `role`
- `status`
- `full_name`
- `phone`
- `reset_token_hash`
- `reset_token_expires_at`
- `failed_login_count`
- `locked_until`
- `total_deposited`
- `total_spent`
- `created_at`
- `updated_at`

## items

- `id`
- `name`
- `slug`
- `item_code`
- `image`
- `gallery`
- `short_description`
- `description`
- `price`
- `original_price`
- `sale_price`
- `stock`
- `sold_count`
- `is_featured`
- `is_best_seller`
- `is_sale`
- `status`
- `sort_order`
- `seo_title`
- `seo_description`
- `created_at`
- `updated_at`

## orders

- `id`
- `order_code`
- `user_id`
- `total_amount`
- `status`
- `roblox_username`
- `roblox_profile`
- `roblox_display_name`
- `customer_note`
- `admin_note`
- `internal_note`
- `refund_reason`
- `assigned_to`
- `completed_at`
- `created_at`
- `updated_at`

## order_items

- `id`
- `order_id`
- `item_id`
- `item_name`
- `quantity`
- `price`
- `total_price`
- `created_at`

## order_status_logs

- `id`
- `order_id`
- `old_status`
- `new_status`
- `note`
- `created_by`
- `created_at`

## deposits

- `id`
- `transaction_code`
- `user_id`
- `method`
- `amount`
- `transfer_content`
- `bank_transaction_id`
- `status`
- `admin_note`
- `created_at`
- `completed_at`

## balance_logs

- `id`
- `user_id`
- `type`
- `amount`
- `balance_before`
- `balance_after`
- `reference_id`
- `reference_type`
- `note`
- `created_by`
- `created_at`

## reviews

- `id`
- `user_id`
- `item_id`
- `order_id`
- `rating`
- `content`
- `image`
- `status`
- `admin_reply`
- `created_at`
- `updated_at`

## notifications

- `id`
- `user_id`
- `title`
- `content`
- `type`
- `is_read`
- `created_at`

## settings

- `id`
- `key`
- `value`
- `updated_at`

## admin_logs

- `id`
- `admin_id`
- `action`
- `target_type`
- `target_id`
- `ip_address`
- `user_agent`
- `created_at`

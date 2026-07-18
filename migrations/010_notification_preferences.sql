-- 010_notification_preferences.sql
-- Per-user toggle for in-app / email notifications, set from the
-- Settings page. Run after 002.

alter table profiles add column if not exists notify_inapp boolean default true;
alter table profiles add column if not exists notify_email boolean default true;

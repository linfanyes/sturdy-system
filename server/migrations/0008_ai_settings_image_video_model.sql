-- Migration: Add imageModel and videoModel columns to ai_settings
-- for AI image generation and video generation features.

ALTER TABLE ai_settings
  ADD COLUMN IF NOT EXISTS `imageModel` VARCHAR(255) NOT NULL DEFAULT ''
  AFTER `visionModel`;

ALTER TABLE ai_settings
  ADD COLUMN IF NOT EXISTS `videoModel` VARCHAR(255) NOT NULL DEFAULT ''
  AFTER `imageModel`;

-- Criação do Banco de Dados e Tabelas para o Sistema de Carta de Serviço
CREATE DATABASE IF NOT EXISTS `carta_de_servico` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `carta_de_servico`;

SET FOREIGN_KEY_CHECKS = 0;

-- Tabela de Secretarias / Órgãos
DROP TABLE IF EXISTS `secretarias`;
CREATE TABLE `secretarias` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `code` VARCHAR(250) NOT NULL UNIQUE,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Usuários / Logins das Secretarias
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `secretaria_id` INT NOT NULL,
  `username` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'editor', 'viewer') DEFAULT 'editor',
  PRIMARY KEY (`id`),
  FOREIGN KEY (`secretaria_id`) REFERENCES `secretarias` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Categorias
DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `secretaria_id` INT DEFAULT NULL,
  `name` TEXT NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`secretaria_id`) REFERENCES `secretarias` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela Principal de Serviços
DROP TABLE IF EXISTS `services`;
CREATE TABLE `services` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `secretaria_id` INT NOT NULL,
  `category_id` INT DEFAULT NULL,
  `name` TEXT NOT NULL,
  `description` TEXT,
  `how_to_access` TEXT,
  `address` TEXT,
  `who_can_request` TEXT,
  `waiting_time` TEXT DEFAULT NULL,
  `max_deadline` TEXT DEFAULT NULL,
  `cost` TEXT DEFAULT NULL,
  `regulation_norm` TEXT,
  `status` VARCHAR(20) NOT NULL DEFAULT 'published',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FULLTEXT KEY `idx_services_search` (`name`, `description`),
  FOREIGN KEY (`secretaria_id`) REFERENCES `secretarias` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Telefones do Serviço
DROP TABLE IF EXISTS `service_phones`;
CREATE TABLE `service_phones` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `service_id` INT NOT NULL,
  `phone` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- E-mails do Serviço
DROP TABLE IF EXISTS `service_emails`;
CREATE TABLE `service_emails` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `service_id` INT NOT NULL,
  `email` VARCHAR(500) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Links do Serviço
DROP TABLE IF EXISTS `service_links`;
CREATE TABLE `service_links` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `service_id` INT NOT NULL,
  `link` VARCHAR(500) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Passo a Passo do Serviço
DROP TABLE IF EXISTS `service_steps`;
CREATE TABLE `service_steps` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `service_id` INT NOT NULL,
  `step_number` INT NOT NULL,
  `description` TEXT NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Documentação necessária do Serviço
DROP TABLE IF EXISTS `service_documents`;
CREATE TABLE `service_documents` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `service_id` INT NOT NULL,
  `document_name` TEXT NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Prioridades de atendimento do Serviço
DROP TABLE IF EXISTS `service_priorities`;
CREATE TABLE `service_priorities` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `service_id` INT NOT NULL,
  `priority_name` TEXT NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela Pivot de Categorias (N:N para suporte a múltiplas categorias)
DROP TABLE IF EXISTS `service_categories`;
CREATE TABLE `service_categories` (
  `service_id` INT NOT NULL,
  `category_id` INT NOT NULL,
  PRIMARY KEY (`service_id`, `category_id`),
  FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Histórico de Auditoria e Alterações do Serviço
DROP TABLE IF EXISTS `service_history`;
CREATE TABLE `service_history` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `service_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `action` VARCHAR(50) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE', 'STATUS_CHANGE'
  `field_name` VARCHAR(100) DEFAULT NULL,
  `old_value` TEXT DEFAULT NULL,
  `new_value` TEXT DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

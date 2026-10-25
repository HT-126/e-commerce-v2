-- Runs once, when the MySQL volume is created.
-- The image already creates `ecommerce_v2` and the user `lumiere` (see docker-compose.yml).
CREATE DATABASE IF NOT EXISTS ecommerce_v2_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON ecommerce_v2.* TO 'lumiere'@'%';
GRANT ALL PRIVILEGES ON ecommerce_v2_test.* TO 'lumiere'@'%';
FLUSH PRIVILEGES;

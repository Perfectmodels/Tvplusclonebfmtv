-- À appliquer sur tvplus_v3 de TEST après sauvegarde. Aucune suppression.
CREATE TABLE IF NOT EXISTS tvp_whatsapp_consents (
 phone VARCHAR(15) NOT NULL, purpose ENUM('test','alert','newsletter','premium') NOT NULL, granted TINYINT(1) NOT NULL,
 proof VARCHAR(250) NOT NULL DEFAULT '', actor_id VARCHAR(36) NOT NULL, updated_at DATETIME(6) NOT NULL,
 PRIMARY KEY(phone,purpose), INDEX(purpose,granted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS tvp_whatsapp_optouts (
 phone VARCHAR(15) PRIMARY KEY, created_at DATETIME(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS tvp_whatsapp_requests (
 id CHAR(36) PRIMARY KEY, actor_id CHAR(36) NOT NULL, created_at DATETIME(6) NOT NULL, INDEX(created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS tvp_whatsapp_messages (
 id CHAR(36) PRIMARY KEY, request_id CHAR(36) NOT NULL, phone VARCHAR(15) NOT NULL,
 purpose ENUM('test','alert','newsletter','premium') NOT NULL, template VARCHAR(100) NOT NULL, language VARCHAR(12) NOT NULL,
 state ENUM('reserved','accepted','delivered','read','failed','unknown') NOT NULL, provider_status VARCHAR(100) NOT NULL DEFAULT '',
 actor_id CHAR(36) NOT NULL, created_at DATETIME(6) NOT NULL, updated_at DATETIME(6) NOT NULL,
 UNIQUE(request_id,phone), INDEX(created_at), INDEX(state)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS tvp_whatsapp_inbound (
 id VARCHAR(150) PRIMARY KEY, phone VARCHAR(15) NOT NULL, body VARCHAR(1000) NOT NULL, received_at DATETIME(6) NOT NULL,
 INDEX(received_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

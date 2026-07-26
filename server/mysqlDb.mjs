import mysql from "mysql2/promise";

const database = String(process.env.MYSQL_DATABASE || "cultivate_immortality").trim();

if (!/^[A-Za-z0-9_]+$/.test(database)) {
  throw new Error("MYSQL_DATABASE may only contain letters, numbers, and underscores");
}

export const mysqlPool = mysql.createPool({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "cultivate_app",
  password: process.env.MYSQL_PASSWORD || "",
  database,
  charset: "utf8mb4",
  timezone: "Z",
  connectionLimit: Math.max(2, Number(process.env.MYSQL_POOL_SIZE || 8)),
  waitForConnections: true,
  queueLimit: 0,
  dateStrings: true,
  supportBigNumbers: true
});

let schemaPromise;

export function ensureMysqlSchema() {
  if (!schemaPromise) schemaPromise = createSchema().catch((error) => {
    schemaPromise = null;
    throw error;
  });
  return schemaPromise;
}

async function createSchema() {
  const connection = await mysqlPool.getConnection();
  try {
    const statements = [
      `CREATE TABLE IF NOT EXISTS auth_users (
        id VARCHAR(64) PRIMARY KEY,
        username VARCHAR(64) NOT NULL,
        username_normalized VARCHAR(64) NOT NULL UNIQUE,
        password_hash VARCHAR(128) NOT NULL,
        password_salt VARCHAR(64) NOT NULL,
        role VARCHAR(24) NOT NULL DEFAULT 'user',
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        last_login_at DATETIME(3) NULL,
        INDEX idx_auth_users_role_created (role, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS auth_registration_codes (
        code VARCHAR(128) PRIMARY KEY,
        code_hash CHAR(64) NULL UNIQUE,
        active TINYINT(1) NOT NULL DEFAULT 1,
        max_uses INT NULL,
        used_count INT NOT NULL DEFAULT 0,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS auth_attempts (
        attempt_key CHAR(64) PRIMARY KEY,
        action_name VARCHAR(24) NOT NULL,
        failure_count INT NOT NULL DEFAULT 0,
        blocked_until DATETIME(3) NULL,
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        INDEX idx_auth_attempts_updated (updated_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS auth_sessions (
        token_hash VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        expires_at DATETIME(3) NOT NULL,
        INDEX idx_auth_sessions_user (user_id),
        INDEX idx_auth_sessions_expiry (expires_at),
        CONSTRAINT fk_auth_sessions_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS app_settings (
        setting_key VARCHAR(128) PRIMARY KEY,
        setting_value JSON NOT NULL,
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS game_saves (
        save_id VARCHAR(64) PRIMARY KEY,
        day_no INT NOT NULL DEFAULT 1,
        rebirth_no INT NOT NULL DEFAULT 1,
        calendar_start_date VARCHAR(32) NOT NULL DEFAULT '',
        last_settlement_date VARCHAR(32) NOT NULL DEFAULT '',
        state_version INT NOT NULL DEFAULT 1,
        state_revision BIGINT NOT NULL DEFAULT 0,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        INDEX idx_game_saves_updated (updated_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS save_sections (
        save_id VARCHAR(64) NOT NULL,
        section_key VARCHAR(96) NOT NULL,
        section_json LONGTEXT NOT NULL,
        content_hash CHAR(64) NOT NULL,
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (save_id, section_key),
        CONSTRAINT fk_save_sections_save FOREIGN KEY (save_id) REFERENCES game_saves(save_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS portraits (
        portrait_id CHAR(64) PRIMARY KEY,
        content_type VARCHAR(96) NULL,
        image_data MEDIUMBLOB NULL,
        source_url TEXT NULL,
        byte_size INT NOT NULL DEFAULT 0,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS cultivators (
        save_id VARCHAR(64) NOT NULL,
        cultivator_id VARCHAR(96) NOT NULL,
        cultivator_kind ENUM('player','npc') NOT NULL,
        position_no INT NOT NULL DEFAULT 0,
        name VARCHAR(128) NOT NULL DEFAULT '',
        realm_no INT NOT NULL DEFAULT 0,
        xp BIGINT NOT NULL DEFAULT 0,
        hp BIGINT NOT NULL DEFAULT 0,
        max_hp BIGINT NOT NULL DEFAULT 0,
        mana BIGINT NOT NULL DEFAULT 0,
        max_mana BIGINT NOT NULL DEFAULT 0,
        sect_name VARCHAR(128) NOT NULL DEFAULT '',
        portrait_id CHAR(64) NULL,
        cultivator_json LONGTEXT NOT NULL,
        content_hash CHAR(64) NOT NULL,
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (save_id, cultivator_id),
        INDEX idx_cultivators_kind_position (save_id, cultivator_kind, position_no),
        INDEX idx_cultivators_realm (save_id, realm_no, xp),
        INDEX idx_cultivators_sect (save_id, sect_name),
        CONSTRAINT fk_cultivators_save FOREIGN KEY (save_id) REFERENCES game_saves(save_id) ON DELETE CASCADE,
        CONSTRAINT fk_cultivators_portrait FOREIGN KEY (portrait_id) REFERENCES portraits(portrait_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS cultivator_history (
        save_id VARCHAR(64) NOT NULL,
        cultivator_id VARCHAR(96) NOT NULL,
        history_type VARCHAR(40) NOT NULL,
        record_key VARCHAR(160) NOT NULL,
        day_no INT NULL,
        position_no INT NOT NULL DEFAULT 0,
        record_json LONGTEXT NOT NULL,
        content_hash CHAR(64) NOT NULL,
        PRIMARY KEY (save_id, cultivator_id, history_type, record_key),
        INDEX idx_cultivator_history_day (save_id, cultivator_id, history_type, day_no, position_no),
        CONSTRAINT fk_cultivator_history_save FOREIGN KEY (save_id) REFERENCES game_saves(save_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS equipment_items (
        save_id VARCHAR(64) NOT NULL,
        equipment_key VARCHAR(128) NOT NULL,
        position_no INT NOT NULL DEFAULT 0,
        owner_id VARCHAR(96) NOT NULL DEFAULT '',
        item_id VARCHAR(128) NOT NULL DEFAULT '',
        slot_name VARCHAR(64) NOT NULL DEFAULT '',
        item_json LONGTEXT NOT NULL,
        content_hash CHAR(64) NOT NULL,
        PRIMARY KEY (save_id, equipment_key),
        INDEX idx_equipment_owner (save_id, owner_id, slot_name),
        CONSTRAINT fk_equipment_save FOREIGN KEY (save_id) REFERENCES game_saves(save_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS duel_days (
        save_id VARCHAR(64) NOT NULL,
        day_no INT NOT NULL,
        date_key VARCHAR(32) NOT NULL DEFAULT '',
        created_at_text VARCHAR(64) NOT NULL DEFAULT '',
        PRIMARY KEY (save_id, day_no),
        CONSTRAINT fk_duel_days_save FOREIGN KEY (save_id) REFERENCES game_saves(save_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS duel_matches (
        save_id VARCHAR(64) NOT NULL,
        day_no INT NOT NULL,
        match_id VARCHAR(160) NOT NULL,
        position_no INT NOT NULL DEFAULT 0,
        match_type VARCHAR(40) NOT NULL DEFAULT '',
        left_id VARCHAR(96) NOT NULL DEFAULT '',
        right_id VARCHAR(96) NOT NULL DEFAULT '',
        winner_id VARCHAR(96) NOT NULL DEFAULT '',
        loser_id VARCHAR(96) NOT NULL DEFAULT '',
        replay_id VARCHAR(180) NOT NULL DEFAULT '',
        match_json LONGTEXT NOT NULL,
        content_hash CHAR(64) NOT NULL,
        PRIMARY KEY (save_id, day_no, match_id),
        INDEX idx_duel_matches_replay (save_id, replay_id),
        CONSTRAINT fk_duel_matches_day FOREIGN KEY (save_id, day_no) REFERENCES duel_days(save_id, day_no) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS dungeon_days (
        save_id VARCHAR(64) NOT NULL,
        day_no INT NOT NULL,
        date_key VARCHAR(32) NOT NULL DEFAULT '',
        PRIMARY KEY (save_id, day_no),
        CONSTRAINT fk_dungeon_days_save FOREIGN KEY (save_id) REFERENCES game_saves(save_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS dungeon_records (
        save_id VARCHAR(64) NOT NULL,
        day_no INT NOT NULL,
        record_type VARCHAR(40) NOT NULL,
        record_key VARCHAR(160) NOT NULL,
        position_no INT NOT NULL DEFAULT 0,
        record_json LONGTEXT NOT NULL,
        content_hash CHAR(64) NOT NULL,
        PRIMARY KEY (save_id, day_no, record_type, record_key),
        INDEX idx_dungeon_records_type (save_id, day_no, record_type, position_no),
        CONSTRAINT fk_dungeon_records_day FOREIGN KEY (save_id, day_no) REFERENCES dungeon_days(save_id, day_no) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS province_wars (
        save_id VARCHAR(64) NOT NULL,
        war_id VARCHAR(160) NOT NULL,
        day_no INT NULL,
        position_no INT NOT NULL DEFAULT 0,
        province_id VARCHAR(96) NOT NULL DEFAULT '',
        attacker_name VARCHAR(128) NOT NULL DEFAULT '',
        defender_name VARCHAR(128) NOT NULL DEFAULT '',
        captured TINYINT(1) NOT NULL DEFAULT 0,
        war_json LONGTEXT NOT NULL,
        content_hash CHAR(64) NOT NULL,
        PRIMARY KEY (save_id, war_id),
        INDEX idx_province_wars_day (save_id, day_no, position_no),
        CONSTRAINT fk_province_wars_save FOREIGN KEY (save_id) REFERENCES game_saves(save_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS admin_profiles (
        save_id VARCHAR(64) NOT NULL,
        profile_type VARCHAR(40) NOT NULL,
        profile_key VARCHAR(160) NOT NULL,
        position_no INT NOT NULL DEFAULT 0,
        portrait_id CHAR(64) NULL,
        profile_json LONGTEXT NOT NULL,
        content_hash CHAR(64) NOT NULL,
        PRIMARY KEY (save_id, profile_type, profile_key),
        CONSTRAINT fk_admin_profiles_save FOREIGN KEY (save_id) REFERENCES game_saves(save_id) ON DELETE CASCADE,
        CONSTRAINT fk_admin_profiles_portrait FOREIGN KEY (portrait_id) REFERENCES portraits(portrait_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS battle_replays (
        save_id VARCHAR(64) NOT NULL,
        replay_id VARCHAR(180) NOT NULL,
        replay_kind VARCHAR(40) NOT NULL,
        day_no INT NULL,
        match_id VARCHAR(160) NOT NULL DEFAULT '',
        replay_json LONGTEXT NOT NULL,
        content_hash CHAR(64) NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (save_id, replay_id),
        INDEX idx_battle_replays_day (save_id, day_no),
        INDEX idx_battle_replays_kind (save_id, replay_kind, day_no),
        CONSTRAINT fk_battle_replays_save FOREIGN KEY (save_id) REFERENCES game_saves(save_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS history_monthly_summaries (
        save_id VARCHAR(64) NOT NULL,
        scope_name VARCHAR(64) NOT NULL,
        owner_id VARCHAR(96) NOT NULL DEFAULT '',
        month_key VARCHAR(16) NOT NULL,
        record_count INT NOT NULL DEFAULT 0,
        first_day INT NULL,
        last_day INT NULL,
        summary_json LONGTEXT NOT NULL,
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (save_id, scope_name, owner_id, month_key),
        CONSTRAINT fk_history_summaries_save FOREIGN KEY (save_id) REFERENCES game_saves(save_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`
    ];
    for (const statement of statements) await connection.query(statement);
    const additiveColumns = [
      ["auth_registration_codes", "code_hash", "CHAR(64) NULL UNIQUE"],
      ["game_saves", "state_revision", "BIGINT NOT NULL DEFAULT 0"]
    ];
    for (const [table, column, definition] of additiveColumns) {
      const [columns] = await connection.query(`
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1
      `, [database, table, column]);
      if (!columns.length) await connection.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
    const textColumns = [
      ["save_sections", "section_json", "LONGTEXT"],
      ["cultivators", "cultivator_json", "LONGTEXT"],
      ["cultivator_history", "record_json", "LONGTEXT"],
      ["equipment_items", "item_json", "LONGTEXT"],
      ["duel_matches", "match_json", "LONGTEXT"],
      ["dungeon_records", "record_json", "LONGTEXT"],
      ["province_wars", "war_json", "LONGTEXT"],
      ["admin_profiles", "profile_json", "LONGTEXT"],
      ["battle_replays", "replay_json", "LONGTEXT"],
      ["history_monthly_summaries", "summary_json", "LONGTEXT"]
    ];
    for (const [table, column, type] of textColumns) {
      const [columns] = await connection.query(`
        SELECT DATA_TYPE FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?
        LIMIT 1
      `, [database, table, column]);
      if (String(columns[0]?.DATA_TYPE || "").toLowerCase() !== type.toLowerCase()) {
        await connection.query(`ALTER TABLE ${table} MODIFY ${column} ${type} NOT NULL`);
      }
    }
  } finally {
    connection.release();
  }
}

export async function withMysqlTransaction(callback) {
  await ensureMysqlSchema();
  const connection = await mysqlPool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export function parseMysqlJson(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
}

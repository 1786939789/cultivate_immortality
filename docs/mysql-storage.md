# MySQL storage

MySQL is the only supported runtime storage. The service does not provide an alternate storage driver or database rollback implementation.

## Layout

- `game_saves` stores save metadata only.
- `save_sections` stores low-growth state sections as separate rows.
- `cultivators` stores the current player and NPC states.
- `cultivator_history` stores growth, breakthrough, skill, duel, dungeon, and spirit-pearl history rows.
- `equipment_items`, `duel_days`, `duel_matches`, `dungeon_days`, `dungeon_records`, and `province_wars` store their respective domain records.
- `portraits` deduplicates embedded image data by SHA-256.
- `battle_replays` stores one complete replay per row.

The domain logic still receives the existing in-memory state shape. `mysqlStateCodec.mjs` assembles and decomposes that state while `mysqlStateRepository.mjs` updates only rows whose content hash changed.

Writes are divided into explicit persistence domains: sections, cultivators and their history, equipment, duels, dungeons, province wars, and admin profiles. Normal mutations track touched domains and verify changes only within those candidates before querying their tables. Full-world settlement, migration, reset, and first-save creation retain full-domain verification.

Daily settlement uses the persistent `background_jobs` table. The scheduler enqueues one idempotent job per save and target date; workers claim jobs with leases, advance at most one game day per transaction, retry revision conflicts, and apply exponential backoff to failures.

## Required environment

Use `.env.example` as the key reference. Keep the real password outside the repository.
Local `npm run dev` and `npm run start` automatically load an ignored root-level `.env` file when it exists.

## Account bootstrap

Normal service startup does not create administrators, reset passwords, or seed a default registration code. Create or rotate them explicitly with one-time commands:

```bash
NEW_ADMIN_USERNAME=admin NEW_ADMIN_PASSWORD=replace-me npm run auth:create-admin
NEW_REGISTRATION_CODE=replace-me REGISTRATION_CODE_MAX_USES=10 npm run auth:create-code
```

In PowerShell, set the same environment variables before running the command. Keep real passwords and registration codes in ignored local environment configuration only.

## Backup and recovery

Use MySQL-native logical or physical backups. Test restores against a separate database before relying on a backup for production recovery. The repository does not contain runtime save data or database rollback files.

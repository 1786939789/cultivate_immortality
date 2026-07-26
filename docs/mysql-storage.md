# MySQL storage

The production service uses `STORAGE_DRIVER=mysql`. SQLite remains available as a rollback driver and as the source format for one-time migrations.

## Layout

- `game_saves` stores save metadata only.
- `save_sections` stores low-growth state sections as separate rows.
- `cultivators` stores the current player and NPC states.
- `cultivator_history` stores growth, breakthrough, skill, duel, dungeon, and spirit-pearl history rows.
- `equipment_items`, `duel_days`, `duel_matches`, `dungeon_days`, `dungeon_records`, and `province_wars` store their respective domain records.
- `portraits` deduplicates embedded image data by SHA-256.
- `battle_replays` stores one complete replay per row.

The domain logic still receives the existing in-memory state shape. `mysqlStateCodec.mjs` assembles and decomposes that state while `mysqlStateRepository.mjs` updates only rows whose content hash changed.

## Required environment

Use `.env.example` as the key reference. Keep the real password outside the repository.
Local `npm run dev`, `npm run start`, and the MySQL migration commands automatically load an ignored root-level `.env` file when it exists.

## Account bootstrap

Normal service startup does not create administrators, reset passwords, or seed a default registration code. Create or rotate them explicitly with one-time commands:

```bash
NEW_ADMIN_USERNAME=admin NEW_ADMIN_PASSWORD=replace-me npm run auth:create-admin
NEW_REGISTRATION_CODE=replace-me REGISTRATION_CODE_MAX_USES=10 npm run auth:create-code
```

In PowerShell, set the same environment variables before running the command. Keep real passwords and registration codes in ignored local environment configuration only.

## Migration

The migration is destructive only to the target MySQL database. It never edits or deletes the SQLite source files.

```bash
MIGRATION_CONFIRM=replace-mysql npm run db:migrate:mysql
npm run db:verify:mysql
```

Stop the application before the final production migration so no SQLite writes occur between migration and cutover.

## Rollback

1. Stop the service.
2. Set `STORAGE_DRIVER=sqlite` in the production environment.
3. Restore `data/game.sqlite` and `data/battle.sqlite` from the cutover backup if post-cutover MySQL writes must be discarded.
4. Start the service.

Do not run the SQLite and MySQL drivers as active writers at the same time.

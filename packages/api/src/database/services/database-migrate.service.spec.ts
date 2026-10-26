import { DatabaseMigrateService } from './database-migrate.service.js';

describe('DatabaseMigrateService.getAvailableMigrations', () => {
    it('sorts migrations by version and ignores other files', () => {
        const result = DatabaseMigrateService.getAvailableMigrations([
            '002.add-briefs.sql',
            '.gitkeep',
            '001.add-users.sql',
        ]);

        expect(result.map((m) => m.version)).toEqual([1, 2]);
        expect(result[0]?.filePath).toMatch(/001\.add-users\.sql$/);
    });

    it('rejects gaps in the sequence', () => {
        expect(() =>
            DatabaseMigrateService.getAvailableMigrations(['001.a.sql', '003.c.sql']),
        ).toThrow(/sequentially/);
    });

    it('rejects duplicate versions', () => {
        expect(() =>
            DatabaseMigrateService.getAvailableMigrations(['001.a.sql', '001.b.sql']),
        ).toThrow(/sequentially/);
    });
});

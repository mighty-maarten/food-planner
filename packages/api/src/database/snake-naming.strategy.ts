import { DefaultNamingStrategy, type NamingStrategyInterface } from 'typeorm';

// typeorm-naming-strategies does not support TypeORM 1.x, so we keep a minimal snake_case strategy.
// Maps property names (e.g. lastLoginAt) to snake_case columns (last_login_at).
const snakeCase = (value: string): string =>
    value
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
        .toLowerCase();

export class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
    override columnName(
        propertyName: string,
        customName: string | undefined,
        embeddedPrefixes: string[],
    ): string {
        return (
            snakeCase(embeddedPrefixes.concat('').join('_')) +
            (customName ?? snakeCase(propertyName))
        );
    }

    override relationName(propertyName: string): string {
        return snakeCase(propertyName);
    }

    override joinColumnName(relationName: string, referencedColumnName: string): string {
        return snakeCase(`${relationName}_${referencedColumnName}`);
    }

    override joinTableColumnName(
        tableName: string,
        propertyName: string,
        columnName?: string,
    ): string {
        return snakeCase(`${tableName}_${columnName ?? propertyName}`);
    }
}

import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;
export const MIN_PASSWORD_LENGTH = 10;

export const PasswordHelper = {
    hash(password: string): Promise<string> {
        return bcrypt.hash(password, BCRYPT_ROUNDS);
    },

    verify(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    },
};

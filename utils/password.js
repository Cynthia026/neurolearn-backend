// utils/password.js
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Hash de contraseña
 */
export const hashPassword = async (password) => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Comparar contraseña
 */
export const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

import bcrypt from "bcrypt";
import { BCRYPT_SALT_ROUNDS } from "../config/constants";

export const hashPassword = async (value: string): Promise<string> =>
  bcrypt.hash(value, BCRYPT_SALT_ROUNDS);

export const comparePassword = async (value: string, hash: string): Promise<boolean> =>
  bcrypt.compare(value, hash);

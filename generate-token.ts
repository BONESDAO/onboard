import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env.local') });

const generateToken = () => {
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET 环境变量未设置');
    return null;
  }

  const token = jwt.sign({ userId: '123' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  return token;
}

console.log(generateToken());
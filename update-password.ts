const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
  host: 'rm-wz9534kakaqe7oegszo.mysql.rds.aliyuncs.com',
  user: 'root',
  password: 'wmzcl1gpt@@@',
  database: 'bonesdao',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0
});

async function updatePassword() {
  const connection = await pool.getConnection();
  try {
    const password = '123456'; // 这是您要设置的新密码
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await connection.execute(
      'UPDATE admins SET password = ? WHERE username = ?',
      [hashedPassword, 'admin']
    );
    
    console.log('密码更新成功');
  } catch (error) {
    console.error('更新密码时出错:', error);
  } finally {
    connection.release();
  }
}

updatePassword().then(() => process.exit());
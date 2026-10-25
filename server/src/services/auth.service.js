import bcrypt from 'bcrypt';
import { db } from '../db/knex.js';
import { AppError } from '../utils/app-error.js';

const COST = 10;

// A real hash of a throwaway password. An unknown email is compared against it, so signing in with an
// unknown email takes as long as signing in with a wrong password.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', COST);

// The public shape of a user. Never the password hash.
const toUser = (row) => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  role: row.role,
});

export async function registerUser({ firstName, lastName, email, password }) {
  const passwordHash = await bcrypt.hash(password, COST);
  try {
    const [id] = await db('users').insert({
      first_name: firstName,
      last_name: lastName,
      email,
      password_hash: passwordHash,
      role: 'customer',
    });
    return getUser(id);
  } catch (error) {
    // The unique key decides, not a check before the insert, so two requests at once cannot both win.
    if (error.code === 'ER_DUP_ENTRY') {
      throw new AppError(409, 'An account with this email already exists', 'EMAIL_TAKEN');
    }
    throw error;
  }
}

// A wrong email and a wrong password give the same error.
export async function loginUser({ email, password }) {
  const row = await db('users').where({ email }).first();
  const matches = await bcrypt.compare(password, row?.password_hash ?? DUMMY_HASH);
  if (!row || !matches) throw new AppError(401, 'Wrong email or password', 'INVALID_CREDENTIALS');
  return toUser(row);
}

export async function getUser(id) {
  const row = await db('users').where({ id }).first();
  return row ? toUser(row) : null;
}

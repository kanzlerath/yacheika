const { compare } = require('bcryptjs');
const { Client } = require('pg');

const password = process.argv[2];

const decodePasswordHash = (rawHash) => {
  const trimmed = (rawHash || '').trim();
  if (trimmed.startsWith('$2a$') || trimmed.startsWith('$2b$') || trimmed.startsWith('$2y$')) {
    return trimmed;
  }
  const decoded = Buffer.from(trimmed, 'base64').toString('utf8').trim();
  return decoded;
};

const main = async () => {
  const email = process.env.ADMIN_OWNER_EMAIL?.trim().toLowerCase();
  const rawPasswordHash = process.env.ADMIN_OWNER_PASSWORD_HASH?.trim();
  const decodedHash = rawPasswordHash ? decodePasswordHash(rawPasswordHash) : '';

  console.log(JSON.stringify({
    envEmailPresent: Boolean(email),
    envEmail: email || null,
    envHashPresent: Boolean(rawPasswordHash),
    envHashLength: rawPasswordHash?.length || 0,
    decodedHashPrefix: decodedHash ? decodedHash.slice(0, 7) : null,
    decodedHashLength: decodedHash.length,
    adminSessionSecretPresent: Boolean(process.env.ADMIN_SESSION_SECRET || process.env.AUTH_SESSION_SECRET),
  }, null, 2));

  if (password && decodedHash) {
    console.log(JSON.stringify({
      passwordMatchesEnvHash: await compare(password, decodedHash),
    }, null, 2));
  }

  const client = new Client({
    host: process.env.DB_HOST || 'db',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'yacheyka',
  });

  await client.connect();
  const result = await client.query(
    'select email, role, status, length("passwordHash") as "passwordHashLength", left("passwordHash", 7) as "passwordHashPrefix", "updatedAt" from admin_users where email = $1',
    [email],
  );
  console.log(JSON.stringify({
    dbOwnerRows: result.rows,
  }, null, 2));
  await client.end();
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

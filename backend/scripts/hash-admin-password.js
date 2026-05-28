const { hash } = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.error('Usage: npm run admin:hash -- "your-password"');
  process.exit(1);
}

hash(password, 12)
  .then((passwordHash) => {
    console.log(Buffer.from(passwordHash, 'utf8').toString('base64'));
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

#### Environment (.env)
```
NODE_ENV=development
PORT=3002

DB_TYPE=mysql
DATABASE_HOST=localhost
MYSQL_DATABASE=alpr
MYSQL_USER=user
MYSQL_PASSWORD=password

COOKIE_SECRET=rahasia
SESSION_SECRET=rahasia

ACCESS_TOKEN_SECRET=rahasia
ACCESS_TOKEN_NAME=token
ACCESS_TOKEN_EXPIRATION=18000
```

#### Setup
1. Create `.env` file
1. Install package `npm install`
1. Run migration `npx knex migrate:latest`
1. Run seeder `npx knex seed:run`
1. Build server `npm run build`
1. Run server `npm run start`
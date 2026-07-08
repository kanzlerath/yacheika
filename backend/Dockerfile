FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

EXPOSE 4002

CMD ["npm", "run", "start:prod"]

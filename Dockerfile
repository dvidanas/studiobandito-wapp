FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

ARG CACHEBUST=1
COPY . .

RUN npm run build

EXPOSE 3002

CMD ["npm", "start"]

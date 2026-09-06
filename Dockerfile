FROM node:20-alpine AS builder
WORKDIR /app

# better-sqlite3 compila nativo: necesita toolchain en la etapa de build.
RUN apk add --no-cache python3 make g++ git

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3099
# La base vive en el volumen /data, no dentro de la imagen: un redeploy
# reemplaza el contenedor entero y se llevaria la base con el.
#
# OJO: este nombre de archivo tiene que coincidir con el que efectivamente
# se siembra en el volumen (ver /api/admin/restore-db y el CLAUDE.md de este
# panel). "corteingles.db" era el de Corte — un volumen nuevo NUNCA va a
# tener ese archivo, y better-sqlite3 crearia una base vacia en su lugar sin
# avisar, disparando el seedDemo() de Corte con datos falsos.
ENV DB_PATH=/data/bandito-migrado.db

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./

VOLUME ["/data"]
EXPOSE 3099
CMD ["npm", "start"]

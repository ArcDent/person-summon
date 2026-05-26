FROM node:22-alpine

RUN apk add --no-cache python3 make g++ build-base

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .
RUN npm run build

EXPOSE 3000
VOLUME ["/app/data"]

CMD ["npm", "start"]

FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_CANONICAL_HOST=makeamag.com
ENV VITE_CANONICAL_HOST=$VITE_CANONICAL_HOST

RUN node scripts/copy-pdfjs.mjs && npm run build

FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/shared ./shared

RUN mkdir -p server/data

EXPOSE 3001

CMD ["npm", "start"]

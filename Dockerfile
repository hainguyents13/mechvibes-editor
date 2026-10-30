FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable

# The vorbis encoder is a local `file:` dependency, so it must be present
# before the install step.
COPY package.json pnpm-lock.yaml ./
COPY vendor ./vendor
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable

# The vorbis encoder is a local `file:` dependency, so it must be present
# before the install step.
COPY package.json pnpm-lock.yaml ./
COPY vendor ./vendor
RUN pnpm install --frozen-lockfile

COPY . .
# The website the editor links to and calls. Vite inlines it into the bundle,
# and the nginx CSP allows API calls to its origin, so both read it here.
ARG VITE_WEBSITE_URL=https://mechvibes.com
# Google Analytics, shared with the website. Pass an empty value to build without it.
ARG VITE_GA_MEASUREMENT_ID=G-ZW8PBB24NF
RUN pnpm build
RUN WEBSITE_ORIGIN="$(node -e 'console.log(new URL(process.argv[1]).origin)' "$VITE_WEBSITE_URL")" \
  && sed "s#__WEBSITE_ORIGIN__#${WEBSITE_ORIGIN}#g" nginx.conf > nginx.generated.conf

FROM nginx:alpine

COPY --from=builder /app/nginx.generated.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

FROM --platform=linux/amd64 public.ecr.aws/docker/library/node:lts-slim as development


WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

ARG NODE_ENV

RUN npx nx build api-customer --configuration=${NODE_ENV} --skip-nx-cache

FROM  --platform=linux/amd64 public.ecr.aws/docker/library/node:lts-slim as production

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --omit=dev --legacy-peer-deps

COPY . .

COPY --from=development /usr/src/app/dist ./dist

EXPOSE 3333

CMD ["node", "dist/apps/api/customer/main.js"]
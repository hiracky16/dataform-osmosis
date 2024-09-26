FROM node:20.17-slim

WORKDIR /app

RUN npm install -g typescript

COPY package.json .

RUN npm install

COPY tsconfig.json .
COPY ./src src
COPY ./definisions definisions

RUN tsc

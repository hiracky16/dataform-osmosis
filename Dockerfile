FROM node:20.17-slim

WORKDIR /app

RUN npm install -g typescript @dataform/cli

COPY package.json .

RUN npm install

COPY tsconfig.json .
COPY workflow_settings.yaml .
COPY ./src src
COPY ./definitions definitions

RUN tsc
RUN npm link

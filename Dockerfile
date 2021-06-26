FROM node:10 as builder

WORKDIR /app
ADD package.json /app
ADD yarn.lock /app

RUN yarn install
ADD . /app

FROM node:10
WORKDIR /app
COPY --from=builder /app .
CMD ["node","app.js"]

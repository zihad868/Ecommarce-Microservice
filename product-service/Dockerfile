FROM node:20-alpine
WORKDIR /usr/src/app
COPY product-service/package*.json ./
RUN npm ci
COPY product-service/ ./
COPY protos/ /usr/src/protos/
RUN npx prisma generate
RUN npm run build
RUN npm cache clean --force
USER node
EXPOSE 3002 50052
CMD ["node", "dist/server.js"]

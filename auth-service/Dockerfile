FROM node:20-alpine
WORKDIR /usr/src/app
COPY auth-service/package*.json ./
RUN npm ci
COPY auth-service/ ./
COPY protos/ /usr/src/protos/
RUN npx prisma generate
RUN npm run build
RUN npm cache clean --force
USER node
EXPOSE 3001 50051
CMD ["node", "dist/server.js"]

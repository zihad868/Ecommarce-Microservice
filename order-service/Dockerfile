FROM node:20-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .
COPY protos/ /usr/src/protos/
RUN npx prisma generate
RUN npm run build
RUN npm cache clean --force
USER node
EXPOSE 3003 50053
CMD ["node", "dist/server.js"]

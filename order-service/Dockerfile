FROM node:18-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
EXPOSE 3003 50053
CMD ["node", "src/server.js"]

FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install --force

COPY . .

EXPOSE 4040
CMD ["npm", "run", "dev"]

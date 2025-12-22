FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install --force

COPY . .

ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

EXPOSE 3000
CMD ["npm", "run", "start"]

FROM node:16-alpine
WORKDIR /app
COPY ./config/ ./config/
COPY ./service/ ./service/
COPY ./utils/ ./utils/
COPY ./main.js ./
COPY ./package*.json ./
COPY ./postinstall.js ./
RUN npm install --only=production
CMD ["npm", "start"]
EXPOSE 3000
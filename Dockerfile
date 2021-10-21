FROM node:latest
WORKDIR /app
COPY . /app
RUN npm run dockersetup
ENTRYPOINT ["npm", "run", "start"]

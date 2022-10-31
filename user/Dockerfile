FROM node:16-alpine
RUN npm install nodemon -g
WORKDIR /app
COPY package.json .
RUN npm install
#COPY . .
EXPOSE 3000
#CMD ["node", "user/userApp.js"]
CMD ["nodemon", "user/userService.js"]

FROM node:16-alpine
RUN npm install nodemon -g
WORKDIR /app
COPY package.json .
RUN npm install
#COPY . .
EXPOSE 3001
CMD ["nodemon", "product/productService.js"]
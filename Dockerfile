FROM node:8.9
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY package.json /usr/src/app/
RUN npm install
COPY . /usr/src/app
RUN npm run compile
EXPOSE 8080
ENV NODE_ENV production
CMD [ "npm", "start" ]